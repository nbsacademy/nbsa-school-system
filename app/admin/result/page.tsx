'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminResultViewPage() {
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  // Live Database States
  const [classesList, setClassesList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [studentsList, setStudentsList] = useState<any[]>([]);

  // Consolidated Results Data from Teachers
  const [classConsolidatedSubjects, setClassConsolidatedSubjects] = useState<any[]>([]);
  const [classConsolidatedData, setClassConsolidatedData] = useState<any[]>([]);

  // Class History Analytics State
  const [classHistoryData, setClassHistoryData] = useState<any[]>([]);

  // Individual Student Trend Analytics State
  const [selectedStudentForAnalytics, setSelectedStudentForAnalytics] = useState('');
  const [studentHistory, setStudentHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchInitialClasses();
  }, []);

  // 1. Fetch All Active Classes
  const fetchInitialClasses = async () => {
    setLoading(true);
    const { data: cData } = await supabase.from('classes').select('*').order('class_name', { ascending: true });
    
    if (cData && cData.length > 0) {
      setClassesList(cData);
      setSelectedClassId(cData[0].id);
      await loadClassResults(cData[0].id);
    }
    setLoading(false);
  };

  // 2. Load Class Students & Results Entered by Teachers
  const loadClassResults = async (classId: string) => {
    if (!classId) return;

    setLoading(true);

    // Fetch Enrolled Students for Class
    const { data: stData } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .order('roll_no', { ascending: true, nullsFirst: false })
      .order('full_name', { ascending: true });

    const currentStudents = stData || [];
    setStudentsList(currentStudents);

    if (currentStudents.length > 0) {
      setSelectedStudentForAnalytics(currentStudents[0].id);
      fetchStudentProgressHistory(currentStudents[0].id);
    } else {
      setStudentHistory([]);
    }

    // Fetch Consolidated Test Results Entered by Teachers
    await fetchConsolidatedClassSheet(classId, currentStudents);
    await fetchClassHistoryAnalytics(classId);

    setLoading(false);
  };

  // 3. Fetch Consolidated Tests & Scores Entered by Teachers
  const fetchConsolidatedClassSheet = async (classId: string, currentStudents: any[]) => {
    if (!classId || currentStudents.length === 0) return;

    const { data: tests } = await supabase
      .from('student_tests')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: true });

    if (!tests || tests.length === 0) {
      setClassConsolidatedSubjects([]);
      setClassConsolidatedData([]);
      return;
    }

    const testIds = tests.map((t) => t.id);
    const { data: allMarks } = await supabase
      .from('student_marks')
      .select('*')
      .in('test_id', testIds);

    setClassConsolidatedSubjects(tests);

    const selectedClassObj = classesList.find((c) => c.id === classId);
    const isGirlClass =
      selectedClassObj?.class_name?.toLowerCase().includes('girl') ||
      selectedClassObj?.section_name?.toLowerCase().includes('girl');

    const rows = currentStudents.map((st) => {
      let grandObtained = 0;
      let grandTotal = 0;
      const subjScores: { [testId: string]: string } = {};

      tests.forEach((t) => {
        const markObj = allMarks?.find((m) => m.test_id === t.id && m.student_id === st.id);
        if (markObj) {
          const valStr = String(markObj.obtained_marks || '').trim();
          if (valStr.toUpperCase() === 'A' || (valStr === '0' && markObj.obtained_marks === 0)) {
            subjScores[t.id] = 'A';
            grandTotal += parseFloat(t.total_marks || 0);
          } else {
            const num = parseFloat(valStr) || 0;
            subjScores[t.id] = String(num);
            grandObtained += num;
            grandTotal += parseFloat(t.total_marks || 0);
          }
        } else {
          subjScores[t.id] = '-';
        }
      });

      const percentage = grandTotal > 0 ? ((grandObtained / grandTotal) * 100).toFixed(2) : '0.00';
      const isGirl = st.gender?.toLowerCase() === 'female' || isGirlClass;

      return {
        studentId: st.id,
        rollNo: st.roll_no || '-',
        name: st.full_name,
        fatherName: st.father_name || '',
        parentPrefix: isGirl ? 'D/O' : 'S/O',
        subjScores,
        grandObtained,
        grandTotal,
        percentage: parseFloat(percentage),
        position: '',
      };
    });

    // Calculate Positions (1st, 2nd, 3rd)
    const sorted = [...rows].sort((a, b) => b.grandObtained - a.grandObtained);
    sorted.forEach((row, idx) => {
      if (row.grandObtained > 0) {
        if (idx === 0) row.position = '1st';
        else if (idx === 1) row.position = '2nd';
        else if (idx === 2) row.position = '3rd';
      }
    });

    setClassConsolidatedData(rows);
  };

  // 4. Class Historical Average Performance (Past vs Present Class Comparison Graph)
  const fetchClassHistoryAnalytics = async (classId: string) => {
    const { data: tests } = await supabase
      .from('student_tests')
      .select('id, test_title, subject_name, total_marks, created_at')
      .eq('class_id', classId)
      .order('created_at', { ascending: true });

    if (!tests || tests.length === 0) {
      setClassHistoryData([]);
      return;
    }

    const testIds = tests.map((t) => t.id);
    const { data: marks } = await supabase
      .from('student_marks')
      .select('test_id, obtained_marks')
      .in('test_id', testIds);

    const analytics = tests.map((t) => {
      const testMarks = marks?.filter((m) => m.test_id === t.id) || [];
      const totalObtained = testMarks.reduce((sum, m) => {
        const val = String(m.obtained_marks).toUpperCase();
        return sum + (val === 'A' ? 0 : parseFloat(val) || 0);
      }, 0);

      const avgObtained = testMarks.length > 0 ? totalObtained / testMarks.length : 0;
      const avgPercentage = t.total_marks > 0 ? Math.round((avgObtained / t.total_marks) * 100) : 0;

      return {
        title: `${t.subject_name} (${t.test_title})`,
        avgPercentage,
        totalStudents: testMarks.length,
      };
    });

    setClassHistoryData(analytics);
  };

  // 5. Individual Student Trend Analytics
  const fetchStudentProgressHistory = async (studentId: string) => {
    if (!studentId) return;

    const { data } = await supabase
      .from('student_marks')
      .select('obtained_marks, created_at, student_tests(test_title, total_marks, subject_name)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: true });

    if (data) setStudentHistory(data);
  };

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    loadClassResults(classId);
  };

  const handlePrintSheet = () => {
    window.print();
  };

  const selectedClassObj = classesList.find((c) => c.id === selectedClassId);

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-6 font-sans pb-20 text-slate-900">
      
      {/* 1. TOP CONTROL BAR */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4 print:hidden">
        <div className="flex justify-between items-center flex-wrap gap-2 border-b pb-3">
          <div>
            <h2 className="text-xl font-black text-blue-950">
              Admin Student Results & Performance Portal
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              View class-wise teacher results, performance graphs, and official consolidated sheets
            </p>
          </div>

          <button
            onClick={handlePrintSheet}
            className="bg-blue-950 hover:bg-blue-900 text-white text-xs font-black px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <span>🖨️</span> Print Official Result Sheet
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Select Class Section</label>
            <select
              className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 text-blue-950 outline-none"
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
            >
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_name} ({c.section_name || 'Section A'})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-2xl flex items-center justify-between">
            <span className="font-bold text-blue-950">Enrolled Students:</span>
            <span className="font-mono font-black text-blue-950 text-sm">{studentsList.length}</span>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-2xl flex items-center justify-between">
            <span className="font-bold text-emerald-950">Subjects Entered:</span>
            <span className="font-mono font-black text-emerald-900 text-sm">{classConsolidatedSubjects.length}</span>
          </div>
        </div>
      </div>

      {/* 2. GRAPH 1: CURRENT TEST RANKING BAR GRAPH (HIGH TO LOW) */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4 print:hidden">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span>📊</span> CURRENT CLASS MARKS RANKING GRAPH (HIGH TO LOW)
          </h3>
          <span className="text-[11px] font-extrabold text-blue-900 bg-blue-50 px-3 py-0.5 rounded-full border border-blue-200">
            {selectedClassObj?.class_name} ({selectedClassObj?.section_name})
          </span>
        </div>

        {classConsolidatedData.length > 0 ? (
          <div className="pt-6 pb-2 px-2 flex items-end justify-around gap-2 h-64 overflow-x-auto border-b">
            {classConsolidatedData.map((st, idx) => {
              const pct = Math.min(100, Math.round(st.percentage));

              let barBg = 'bg-emerald-500';
              if (pct < 40) barBg = 'bg-rose-500';
              else if (pct < 70) barBg = 'bg-blue-500';

              return (
                <div key={st.studentId} className="flex flex-col items-center flex-1 min-w-[50px] max-w-[80px] h-full justify-end group">
                  <span className="text-[11px] font-black font-mono mb-1 text-slate-800">
                    {st.grandObtained}
                  </span>

                  <div
                    style={{ height: `${Math.max(12, pct)}%` }}
                    className={`w-full rounded-t-xl ${barBg} transition-all duration-500 shadow-md flex items-center justify-center text-[10px] font-extrabold text-white`}
                  >
                    {pct}%
                  </div>

                  <span className="text-[11px] font-bold text-slate-700 truncate w-full text-center mt-2 group-hover:text-blue-900">
                    #{idx + 1} {st.name.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-xs text-gray-400 font-medium">
            No subject results saved for this class yet.
          </div>
        )}
      </div>

      {/* 3. GRAPH 2: CLASS HISTORY COMPARISON GRAPH (THIS TEST vs PAST TESTS) */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4 print:hidden">
        <div className="border-b pb-2">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span>📉</span> CLASS HISTORICAL AVERAGE PERFORMANCE GRAPH (PAST vs PRESENT TESTS)
          </h3>
          <p className="text-[11px] text-gray-500">Average class percentage across all subject tests created by teachers</p>
        </div>

        {classHistoryData.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {classHistoryData.map((item, i) => (
              <div key={i} className="bg-slate-50 p-3 rounded-2xl border text-center space-y-1 shadow-sm">
                <span className="text-[10px] font-extrabold text-blue-950 block truncate">
                  {item.title}
                </span>
                <b className="text-base font-black font-mono text-slate-900 block">
                  {item.avgPercentage}%
                </b>
                <span className="text-[9px] font-bold text-gray-400 block">
                  Class Avg Score
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-gray-400 font-medium">
            No past test history available for this class.
          </div>
        )}
      </div>

      {/* 4. GRAPH 3: INDIVIDUAL STUDENT PROGRESS TREND GRAPH */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4 print:hidden">
        <div className="flex justify-between items-center flex-wrap gap-2 border-b pb-3">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>📈</span> INDIVIDUAL STUDENT PROGRESS GRAPH (PAST vs PRESENT TREND)
            </h3>
            <p className="text-[11px] text-gray-500">Track individual student improvement or decline across all tests</p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-700">Select Student:</label>
            <select
              className="p-2 border rounded-xl font-bold text-xs bg-slate-50 text-blue-950 outline-none"
              value={selectedStudentForAnalytics}
              onChange={(e) => {
                setSelectedStudentForAnalytics(e.target.value);
                fetchStudentProgressHistory(e.target.value);
              }}
            >
              {studentsList.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.roll_no ? `Roll ${st.roll_no} - ` : ''}{st.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {studentHistory.length > 0 ? (
          <div className="p-4 bg-slate-50 rounded-2xl border space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-gray-600">Past Tests Performance Over Time</span>
              <span className="font-extrabold text-blue-950">
                Total Tests Recorded: <b className="font-mono text-sm">{studentHistory.length}</b>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
              {studentHistory.map((h, i) => {
                const tMax = h.student_tests?.total_marks || 100;
                const isAbsent = String(h.obtained_marks).toUpperCase() === 'A';
                const obt = isAbsent ? 0 : parseFloat(h.obtained_marks) || 0;
                const p = Math.round((obt / tMax) * 100);

                const prevObt = i > 0 ? (String(studentHistory[i - 1].obtained_marks).toUpperCase() === 'A' ? 0 : parseFloat(studentHistory[i - 1].obtained_marks) || 0) : obt;
                const isUp = obt >= prevObt;

                return (
                  <div key={i} className="bg-white p-3 rounded-xl border text-center shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 block truncate">
                      {h.student_tests?.test_title || 'Test'} ({h.student_tests?.subject_name || 'Subj'})
                    </span>
                    <b className="text-sm font-black font-mono text-blue-950 block">
                      {isAbsent ? 'ABSENT' : `${obt}/${tMax}`}
                    </b>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block ${
                      isUp ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {isUp ? '📈 Up' : '📉 Down'} ({p}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-gray-400 font-medium">
            Select a student to view their progress trend over past tests.
          </div>
        )}
      </div>

      {/* 5. OFFICIAL CONSOLIDATED CLASS RESULT SHEET */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-4 print:p-0 print:border-none print:shadow-none">
        
        <div className="flex justify-between items-center border-b pb-3 print:hidden">
          <div>
            <h3 className="text-sm font-black text-blue-950 uppercase tracking-wider">
              🏛️ Official Consolidated Result Sheet
            </h3>
            <p className="text-xs text-gray-500 font-medium">Auto-generated format matching academy standard</p>
          </div>

          <button
            onClick={handlePrintSheet}
            className="bg-blue-950 hover:bg-blue-900 text-white text-xs font-black px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <span>🖨️</span> Print Result Sheet
          </button>
        </div>

        {/* PRINTABLE RESULT SHEET CONTAINER */}
        <div ref={printRef} className="space-y-3 font-sans text-black p-2">
          
          {/* ACADEMY HEADER */}
          <div className="text-center border-b-2 border-black pb-2 space-y-0.5">
            <h1 className="text-xl md:text-2xl font-black tracking-wide uppercase">
              NEW BRIGHT SCHOLARS SCIENCE ACADEMY KAROR
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-tight">
              NEAR CHILDREN PARK WARD #5 KAROR LAL ESAN Ph #: 0313-6766476 / 0302-2122262
            </p>
            <div className="flex justify-between items-center text-xs font-extrabold pt-2">
              <span>Overall Class Result Sheet</span>
              <span className="underline">
                Result Sheet: {selectedClassObj?.class_name || 'Class'} ({selectedClassObj?.section_name || 'Section'})
              </span>
            </div>
          </div>

          {/* OFFICIAL TABLE FORMAT */}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-center border-collapse border border-black font-semibold">
              <thead>
                <tr className="bg-gray-200 border-b border-black font-bold text-black">
                  <th className="border border-black p-1.5 w-10">Sr.#</th>
                  <th className="border border-black p-1.5 text-left min-w-[200px]">Students with Parentage</th>
                  
                  {/* DYNAMIC SUBJECT HEADERS (ONLY SUBJECTS WITH ENTERED RESULTS) */}
                  {classConsolidatedSubjects.map((sub) => (
                    <th key={sub.id} className="border border-black p-1">
                      {sub.subject_name.slice(0, 4)}
                      <div className="text-[9px] font-normal">({sub.total_marks})</div>
                    </th>
                  ))}

                  <th className="border border-black p-1.5 bg-gray-300 w-16">Obtained Marks</th>
                  <th className="border border-black p-1.5 bg-gray-300 w-14">%age</th>
                  <th className="border border-black p-1.5 bg-gray-300 w-14">Position</th>
                </tr>
              </thead>
              <tbody>
                {classConsolidatedData.length > 0 ? (
                  classConsolidatedData.map((row, idx) => (
                    <tr key={row.studentId} className="border-b border-black hover:bg-gray-50 font-mono">
                      <td className="border border-black p-1 font-bold">{idx + 1}</td>
                      <td className="border border-black p-1 text-left font-sans font-bold uppercase">
                        {row.name} {row.fatherName ? `${row.parentPrefix} ${row.fatherName}` : ''}
                      </td>

                      {/* MARKS FOR EACH SUBJECT */}
                      {classConsolidatedSubjects.map((sub) => {
                        const val = row.subjScores[sub.id] || '-';
                        return (
                          <td key={sub.id} className={`border border-black p-1 font-bold ${val === 'A' ? 'text-rose-700' : ''}`}>
                            {val}
                          </td>
                        );
                      })}

                      <td className="border border-black p-1 font-black bg-gray-100">{row.grandObtained}</td>
                      <td className="border border-black p-1 font-black bg-gray-100">{row.percentage}%</td>
                      <td className="border border-black p-1 font-black bg-gray-200 text-blue-950">{row.position}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5 + classConsolidatedSubjects.length} className="p-8 text-center text-gray-400 font-bold border border-black">
                      No subject results saved for this class yet. Results entered by teachers will appear here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  );
}