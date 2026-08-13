'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function TeacherResultAnalyticsPage() {
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Live Database Dropdown States
  const [classesList, setClassesList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [subjectList, setSubjectList] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');

  // Test Header Information
  const [testTitle, setTestTitle] = useState('Weekly Test: W5');
  const [totalMarks, setTotalMarks] = useState<number>(100);

  // Students and Marks Data
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [marksMap, setMarksMap] = useState<{ [studentId: string]: string }>({});

  // Individual Progress Analytics State
  const [selectedStudentForAnalytics, setSelectedStudentForAnalytics] = useState('');
  const [studentHistory, setStudentHistory] = useState<any[]>([]);

  // Consolidated Class Sheet Data
  const [classConsolidatedSubjects, setClassConsolidatedSubjects] = useState<any[]>([]);
  const [classConsolidatedData, setClassConsolidatedData] = useState<any[]>([]);

  // Beautiful Popup Modal State (Replaces browser alerts)
  const [popup, setPopup] = useState<{
    show: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({
    show: false,
    type: 'success',
    title: '',
    message: '',
  });

  useEffect(() => {
    fetchTeacherAssignments();
  }, []);

  const fetchTeacherAssignments = async () => {
    setLoading(true);

    const { data: cData } = await supabase.from('classes').select('*').order('class_name', { ascending: true });
    if (cData && cData.length > 0) {
      setClassesList(cData);
      setSelectedClassId(cData[0].id);
    }

    const storedTeacherId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
    let subjects = ['Physics', 'Chemistry', 'Mathematics', 'English', 'Biology', 'Urdu', 'Computer Sci'];

    if (storedTeacherId) {
      const { data: tData } = await supabase
        .from('timetables')
        .select('subject_name')
        .eq('teacher_id', storedTeacherId);

      if (tData && tData.length > 0) {
        subjects = Array.from(new Set(tData.map((t) => t.subject_name)));
      }
    }

    setSubjectList(subjects);
    if (subjects.length > 0) setSelectedSubject(subjects[0]);

    if (cData && cData.length > 0) {
      await loadClassStudents(cData[0].id);
    }

    setLoading(false);
  };

  const loadClassStudents = async (classId: string) => {
    if (!classId) return;

    setLoading(true);

    const { data: stData } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .order('roll_no', { ascending: true, nullsFirst: false })
      .order('full_name', { ascending: true });

    const currentStudents = stData || [];
    setStudentsList(currentStudents);

    const initialMarks: { [key: string]: string } = {};
    currentStudents.forEach((st) => {
      initialMarks[st.id] = '';
    });
    setMarksMap(initialMarks);

    if (currentStudents.length > 0) {
      setSelectedStudentForAnalytics(currentStudents[0].id);
      fetchStudentProgressHistory(currentStudents[0].id);
    } else {
      setStudentHistory([]);
    }

    await fetchConsolidatedClassSheet(classId, currentStudents);
    setLoading(false);
  };

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

    const rows = currentStudents.map((st) => {
      let grandObtained = 0;
      let grandTotal = 0;
      const subjScores: { [testId: string]: string } = {};

      tests.forEach((t) => {
        const markObj = allMarks?.find((m) => m.test_id === t.id && m.student_id === st.id);
        if (markObj) {
          const valStr = String(markObj.obtained_marks || '').trim();
          if (valStr.toUpperCase() === 'A' || valStr === '0' && markObj.obtained_marks === 0) {
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

      return {
        studentId: st.id,
        rollNo: st.roll_no || '-',
        name: st.full_name,
        fatherName: st.father_name || '',
        subjScores,
        grandObtained,
        grandTotal,
        percentage: parseFloat(percentage),
        position: '',
      };
    });

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

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    loadClassStudents(newClassId);
  };

  const handleMarksChange = (studentId: string, val: string) => {
    if (val.toUpperCase() === 'A') {
      setMarksMap((prev) => ({ ...prev, [studentId]: 'A' }));
      return;
    }
    setMarksMap((prev) => ({ ...prev, [studentId]: val }));
  };

  // Save Test Results with Numeric Compatibility & Beautiful Popup
  const handleSaveResult = async () => {
    if (!selectedClassId || !selectedSubject || studentsList.length === 0) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Action Required',
        message: 'Please select class, subject and ensure students are available.',
      });
      return;
    }

    setLoading(true);

    const { data: testData, error: testErr } = await supabase
      .from('student_tests')
      .insert([
        {
          class_id: selectedClassId,
          subject_name: selectedSubject,
          test_title: testTitle.trim() || 'Weekly Test',
          total_marks: totalMarks,
          test_date: new Date().toISOString().split('T')[0],
        },
      ])
      .select()
      .single();

    if (testErr || !testData) {
      setLoading(false);
      setPopup({
        show: true,
        type: 'error',
        title: 'Save Failed',
        message: testErr?.message || 'Failed to save test details.',
      });
      return;
    }

    // Convert 'A' to 0 for numeric table column to avoid syntax error
    const marksPayload = studentsList.map((st) => {
      const rawVal = (marksMap[st.id] || '').trim();
      const isAbsent = rawVal.toUpperCase() === 'A';
      return {
        test_id: testData.id,
        student_id: st.id,
        obtained_marks: isAbsent ? 0 : Math.min(totalMarks, Math.max(0, parseFloat(rawVal) || 0)),
      };
    });

    const { error: marksErr } = await supabase.from('student_marks').upsert(marksPayload);

    setLoading(false);

    if (marksErr) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Save Failed',
        message: marksErr.message,
      });
    } else {
      setPopup({
        show: true,
        type: 'success',
        title: 'Result Saved Successfully!',
        message: 'Class test results saved & official sheet updated successfully.',
      });
      fetchConsolidatedClassSheet(selectedClassId, studentsList);
    }
  };

  const fetchStudentProgressHistory = async (studentId: string) => {
    if (!studentId) return;

    const { data } = await supabase
      .from('student_marks')
      .select('obtained_marks, created_at, student_tests(test_title, total_marks, subject_name)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: true });

    if (data) setStudentHistory(data);
  };

  const handlePrintSheet = () => {
    window.print();
  };

  const selectedClassObj = classesList.find((c) => c.id === selectedClassId);

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-6 font-sans pb-20">
      
      {/* 🚀 BEAUTIFUL CUSTOM POPUP MODAL */}
      {popup.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className={`bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border-t-8 text-center space-y-4 ${
            popup.type === 'success' ? 'border-emerald-600' : 'border-rose-600'
          }`}>
            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl font-black ${
              popup.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            }`}>
              {popup.type === 'success' ? '✓' : '✕'}
            </div>

            <div className="space-y-1">
              <h3 className={`text-lg font-black ${popup.type === 'success' ? 'text-emerald-900' : 'text-rose-900'}`}>
                {popup.title}
              </h3>
              <p className="text-xs text-gray-600 font-medium">{popup.message}</p>
            </div>

            <button
              onClick={() => setPopup({ ...popup, show: false })}
              className={`w-full py-3 rounded-2xl text-xs font-black text-white transition shadow-md ${
                popup.type === 'success' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* 1. TOP HEADER & CONTROLS */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4 print:hidden">
        <div className="border-b pb-2">
          <h2 className="text-xl font-black text-blue-950">Subject Result & Performance Analytics</h2>
          <p className="text-xs text-gray-500">Enter marks (or 'A' for absent) to auto-generate class consolidated sheets</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Select Class</label>
            <select className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 text-blue-950 outline-none" value={selectedClassId} onChange={(e) => handleClassChange(e.target.value)}>
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>{c.class_name} ({c.section_name || 'Section A'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Assigned Subject</label>
            <select className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 text-blue-950 outline-none" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
              {subjectList.map((subj, idx) => (
                <option key={idx} value={subj}>{subj}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Test Name / Title</label>
            <input type="text" className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 text-slate-900 outline-none" value={testTitle} onChange={(e) => setTestTitle(e.target.value)} />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Total Marks</label>
            <input type="number" className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 text-slate-900 outline-none" value={totalMarks} onChange={(e) => setTotalMarks(parseFloat(e.target.value) || 100)} />
          </div>
        </div>
      </div>

      {/* 2. MARKS ENTRY TABLE (WITH GRADE & PERCENTAGE BADGE) */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4 print:hidden">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">
            STUDENT MARKS ENTRY ({studentsList.length} STUDENTS)
          </h3>
          <span className="text-xs text-gray-500 font-bold">Type Number or <b>'A'</b> for Absent</span>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {studentsList.map((st, idx) => {
            const rawVal = marksMap[st.id] ?? '';
            const isAbsent = rawVal.toUpperCase() === 'A';
            const numVal = isAbsent ? 0 : parseFloat(rawVal) || 0;
            const pct = Math.round((numVal / totalMarks) * 100);

            let grade = 'A+';
            let gradeBg = 'bg-emerald-100 text-emerald-800';
            if (isAbsent) { grade = 'ABSENT'; gradeBg = 'bg-rose-100 text-rose-800'; }
            else if (pct < 40) { grade = 'F'; gradeBg = 'bg-rose-100 text-rose-800'; }
            else if (pct < 50) { grade = 'D'; gradeBg = 'bg-orange-100 text-orange-800'; }
            else if (pct < 60) { grade = 'C'; gradeBg = 'bg-amber-100 text-amber-800'; }
            else if (pct < 70) { grade = 'B'; gradeBg = 'bg-sky-100 text-sky-800'; }
            else if (pct < 80) { grade = 'A'; gradeBg = 'bg-blue-100 text-blue-800'; }

            return (
              <div key={st.id} className="p-3 bg-slate-50 rounded-2xl border flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-blue-950 text-white rounded-xl flex items-center justify-center font-bold font-mono text-xs shrink-0">
                    {st.roll_no || idx + 1}
                  </span>
                  <div>
                    <h4 className="font-extrabold text-blue-950 text-sm">{st.full_name}</h4>
                    <p className="text-[11px] text-gray-500 font-medium">S/O: {st.father_name || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-0.5">Obtained / 'A'</label>
                    <input
                      type="text"
                      placeholder="Marks or A"
                      className="w-28 p-2 border rounded-xl font-bold font-mono text-center text-sm bg-white outline-none focus:border-blue-950 text-blue-950 uppercase"
                      value={marksMap[st.id] ?? ''}
                      onChange={(e) => handleMarksChange(st.id, e.target.value)}
                    />
                  </div>

                  <div className="text-center">
                    <label className="text-[10px] font-bold text-gray-500 block mb-0.5">Grade & Status</label>
                    <span className={`px-3 py-1.5 rounded-xl font-black text-xs block font-mono ${gradeBg}`}>
                      {grade} ({isAbsent ? '0' : pct}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleSaveResult}
          disabled={loading || studentsList.length === 0}
          className="w-full p-3.5 bg-blue-950 hover:bg-blue-900 text-white rounded-2xl font-black text-xs transition shadow-md flex items-center justify-center gap-2"
        >
          <span>💾</span>
          <span>Save Result & Update Consolidated Result Sheet</span>
        </button>
      </div>

      {/* 3. OFFICIAL CONSOLIDATED CLASS RESULT SHEET */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-4 print:p-0 print:border-none print:shadow-none">
        
        <div className="flex justify-between items-center border-b pb-3 print:hidden">
          <div>
            <h3 className="text-sm font-black text-blue-950 uppercase tracking-wider">
              🏛️ Official Consolidated Result Sheet
            </h3>
            <p className="text-xs text-gray-500">Auto-generated format matching academy standard</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePrintSheet}
              className="bg-blue-950 hover:bg-blue-900 text-white text-xs font-black px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
            >
              <span>🖨️</span> Print Result Sheet
            </button>
          </div>
        </div>

        {/* PRINTABLE RESULT SHEET CONTAINER */}
        <div ref={printRef} className="space-y-3 font-sans text-black p-2">
          
          <div className="text-center border-b-2 border-black pb-2 space-y-0.5">
            <h1 className="text-xl md:text-2xl font-black tracking-wide uppercase">
              NEW BRIGHT SCHOLARS SCIENCE ACADEMY KAROR
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-tight">
              NEAR CHILDREN PARK WARD #5 KAROR LAL ESAN Ph #: 0313-6766476 / 0302-2122262
            </p>
            <div className="flex justify-between items-center text-xs font-extrabold pt-2">
              <span>{testTitle}</span>
              <span className="underline">
                Result Sheet: {selectedClassObj?.class_name || 'Class'} ({selectedClassObj?.section_name || 'Section'})
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-center border-collapse border border-black font-semibold">
              <thead>
                <tr className="bg-gray-200 border-b border-black font-bold text-black">
                  <th className="border border-black p-1.5 w-10">Sr.#</th>
                  <th className="border border-black p-1.5 text-left min-w-[200px]">Students with Parentage</th>
                  
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
                        {row.name} {row.fatherName ? `D/O ${row.fatherName}` : ''}
                      </td>

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
                      No subject results saved for this class yet. Select class and save results above.
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
