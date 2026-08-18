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

  // Duplicate Check & Lock State
  const [isDuplicateTest, setIsDuplicateTest] = useState(false);
  const [existingTestId, setExistingTestId] = useState<string | null>(null);

  // Individual Progress Analytics State
  const [selectedStudentForAnalytics, setSelectedStudentForAnalytics] = useState('');
  const [studentHistory, setStudentHistory] = useState<any[]>([]);

  // Consolidated Class Sheet Data
  const [classConsolidatedSubjects, setClassConsolidatedSubjects] = useState<any[]>([]);
  const [classConsolidatedData, setClassConsolidatedData] = useState<any[]>([]);

  // Custom Popup Notification State
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

  // Check if subject test already exists for this class & title
  useEffect(() => {
    if (selectedClassId && selectedSubject && testTitle) {
      checkDuplicateSubjectTest(selectedClassId, selectedSubject, testTitle);
    }
  }, [selectedClassId, selectedSubject, testTitle]);

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

  // Check if test for this subject is already saved
  const checkDuplicateSubjectTest = async (classId: string, subject: string, title: string) => {
    if (!classId || !subject || !title) return;

    const { data } = await supabase
      .from('student_tests')
      .select('id')
      .eq('class_id', classId)
      .eq('subject_name', subject)
      .eq('test_title', title.trim())
      .maybeSingle();

    if (data) {
      setIsDuplicateTest(true);
      setExistingTestId(data.id);
    } else {
      setIsDuplicateTest(false);
      setExistingTestId(null);
    }
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

  // 🎯 DYNAMIC MARKS HANDLER
  const handleMarksChange = (studentId: string, inputVal: string) => {
    const trimmed = inputVal.trim();

    if (trimmed === '') {
      setMarksMap((prev) => ({ ...prev, [studentId]: '' }));
      return;
    }

    if (trimmed.toUpperCase() === 'A' || trimmed.toLowerCase() === 'absent') {
      setMarksMap((prev) => ({ ...prev, [studentId]: 'A' }));
      return;
    }

    const cleanedNum = trimmed.replace(/[^0-9.]/g, '');
    if (cleanedNum !== '') {
      const numVal = parseFloat(cleanedNum);
      if (!isNaN(numVal)) {
        const finalVal = Math.min(totalMarks, Math.max(0, numVal));
        setMarksMap((prev) => ({ ...prev, [studentId]: cleanedNum.endsWith('.') ? cleanedNum : String(finalVal) }));
        return;
      }
    }

    setMarksMap((prev) => ({ ...prev, [studentId]: trimmed }));
  };

  // Toggle quick Absent (A)
  const handleToggleAbsent = (studentId: string) => {
    if (marksMap[studentId] === 'A') {
      setMarksMap((prev) => ({ ...prev, [studentId]: '' }));
    } else {
      setMarksMap((prev) => ({ ...prev, [studentId]: 'A' }));
    }
  };

  // SAVE RESULT WITH STRICT VALIDATION & DUPLICATE BLOCKING
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

    // STRICT VALIDATION: Check if ALL student fields are filled
    const unfilledStudents = studentsList.filter((st) => {
      const val = (marksMap[st.id] ?? '').toString().trim();
      return val === '';
    });

    if (unfilledStudents.length > 0) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Incomplete Marks Entry',
        message: `Please enter marks for all ${studentsList.length} students! Type marks or click 'A' for absent students. (${unfilledStudents.length} remaining)`,
      });
      return;
    }

    // DUPLICATE CHECK
    if (isDuplicateTest) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Subject Result Already Saved!',
        message: `Results for ${selectedSubject} (${testTitle}) have ALREADY been saved for this class! Delete the existing result first if you need to modify it.`,
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
      setIsDuplicateTest(true);
      setExistingTestId(testData.id);
      fetchConsolidatedClassSheet(selectedClassId, studentsList);
    }
  };

  // Delete/Reverse Test Result
  const handleDeleteSubjectTest = async (testId: string, subjectName: string) => {
    if (!confirm(`Are you sure you want to delete/reverse the test result for ${subjectName}?`)) return;

    setLoading(true);

    await supabase.from('student_marks').delete().eq('test_id', testId);
    const { error } = await supabase.from('student_tests').delete().eq('id', testId);

    setLoading(false);

    if (!error) {
      setPopup({
        show: true,
        type: 'success',
        title: 'Test Result Deleted',
        message: `Test result for ${subjectName} removed from database. You can now re-enter new marks.`,
      });

      fetchConsolidatedClassSheet(selectedClassId, studentsList);
      checkDuplicateSubjectTest(selectedClassId, selectedSubject, testTitle);
    } else {
      setPopup({
        show: true,
        type: 'error',
        title: 'Delete Failed',
        message: error.message,
      });
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

  // Sorted Students for Class Ranking Graph
  const sortedStudentsForGraph = [...studentsList].sort((a, b) => {
    const valA = (marksMap[a.id] || '').toUpperCase() === 'A' ? 0 : parseFloat(marksMap[a.id]) || 0;
    const valB = (marksMap[b.id] || '').toUpperCase() === 'A' ? 0 : parseFloat(marksMap[b.id]) || 0;
    return valB - valA;
  });

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-6 font-sans pb-20">
      
      {/* CUSTOM POPUP MODAL */}
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
        <div className="border-b pb-2 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-black text-blue-950">Subject Result & Performance Analytics</h2>
            <p className="text-xs text-gray-500">Enter marks (or click 'A' for absent) to auto-generate class consolidated sheets</p>
          </div>

          {isDuplicateTest && (
            <span className="bg-rose-100 text-rose-800 border border-rose-300 font-extrabold text-xs px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
              🔒 Subject Result Saved & Locked
            </span>
          )}
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

      {/* 2. GRAPH 1: CLASS RANKING BAR GRAPH (HIGH TO LOW) */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4 print:hidden">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-xs font-black text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
            <span>📊</span> LIVE MARKS PERFORMANCE BAR GRAPH (RANKED: HIGH TO LOW)
          </h3>
          <span className="text-[11px] font-bold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            {selectedSubject} | {testTitle}
          </span>
        </div>

        {sortedStudentsForGraph.length > 0 ? (
          <div className="pt-6 pb-2 px-2 flex items-end justify-around gap-2 h-64 overflow-x-auto border-b">
            {sortedStudentsForGraph.map((st, idx) => {
              const raw = (marksMap[st.id] || '').toUpperCase();
              const isAbsent = raw === 'A';
              const obt = isAbsent ? 0 : parseFloat(raw) || 0;
              const pct = Math.min(100, Math.round((obt / totalMarks) * 100));

              let barBg = 'bg-emerald-500';
              if (isAbsent || pct < 40) barBg = 'bg-rose-500';
              else if (pct < 70) barBg = 'bg-blue-500';

              return (
                <div key={st.id} className="flex flex-col items-center flex-1 min-w-[50px] max-w-[80px] h-full justify-end group">
                  <span className="text-[11px] font-black font-mono mb-1 text-slate-800">
                    {isAbsent ? 'A' : `${obt}/${totalMarks}`}
                  </span>

                  <div
                    style={{ height: `${Math.max(12, pct)}%` }}
                    className={`w-full rounded-t-xl ${barBg} transition-all duration-500 shadow-md flex items-center justify-center text-[10px] font-extrabold text-white`}
                  >
                    {isAbsent ? '0%' : `${pct}%`}
                  </div>

                  <span className="text-[11px] font-bold text-slate-700 truncate w-full text-center mt-2 group-hover:text-blue-900">
                    #{idx + 1} {st.full_name.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-xs text-gray-400 font-medium">
            No student marks data available to display ranking graph.
          </div>
        )}
      </div>

      {/* 3. GRAPH 2: INDIVIDUAL STUDENT PROGRESS TREND (UP / DOWN GRAPH) */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4 print:hidden">
        <div className="flex justify-between items-center flex-wrap gap-2 border-b pb-3">
          <div>
            <h3 className="text-xs font-black text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
              <span>📈</span> INDIVIDUAL STUDENT PROGRESS GRAPH (PAST vs PRESENT TREND)
            </h3>
            <p className="text-[11px] text-gray-500">Track if student performance is improving or declining over past tests</p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-700">Select Student:</label>
            <select
              className="p-2 border rounded-xl font-bold text-xs bg-slate-50 text-blue-900 outline-none"
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
              <span className="font-extrabold text-blue-900">
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
                      {h.student_tests?.test_title || 'Test'}
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
            Select a student to view their previous test progress trend.
          </div>
        )}
      </div>

      {/* 4. MARKS ENTRY TABLE (TOUCH FRIENDLY KEYBOARD + QUICK ABSENT BUTTON) */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4 print:hidden">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">
            STUDENT MARKS ENTRY ({studentsList.length} STUDENTS)
          </h3>
          <span className="text-xs text-rose-600 font-bold">* Direct Numbers & 'A' for Absent Allowed</span>
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
            else if (rawVal === '') { grade = '-'; gradeBg = 'bg-slate-100 text-slate-500'; }
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
                    <p className="text-[11px] text-gray-500 font-medium">
                      {st.gender?.toLowerCase() === 'female' || selectedClassObj?.class_name?.toLowerCase().includes('girl') ? 'D/O' : 'S/O'}: {st.father_name || '-'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-0.5">Obtained Marks</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        pattern="[0-9]*"
                        placeholder="Marks"
                        disabled={isDuplicateTest}
                        className={`w-24 p-2 border rounded-xl font-bold font-mono text-center text-sm outline-none focus:border-blue-950 disabled:opacity-50 ${
                          isAbsent ? 'bg-rose-50 border-rose-300 text-rose-700 font-black' : 'bg-white text-blue-950'
                        }`}
                        value={marksMap[st.id] ?? ''}
                        onChange={(e) => handleMarksChange(st.id, e.target.value)}
                      />
                      
                      {/* QUICK TOGGLE ABSENT BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleToggleAbsent(st.id)}
                        disabled={isDuplicateTest}
                        className={`px-2.5 py-2 rounded-xl text-xs font-black border transition active:scale-95 ${
                          isAbsent
                            ? 'bg-rose-700 text-white border-rose-800 shadow-inner'
                            : 'bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-900 border-slate-300'
                        }`}
                        title="Mark Absent"
                      >
                        A
                      </button>
                    </div>
                  </div>

                  <div className="text-center">
                    <label className="text-[10px] font-bold text-gray-500 block mb-0.5">Grade & Status</label>
                    <span className={`px-3 py-2 rounded-xl font-black text-xs block font-mono ${gradeBg}`}>
                      {grade} ({isAbsent ? '0%' : rawVal !== '' ? `${pct}%` : '-'})
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* SAVE OR LOCKED BUTTON */}
        {isDuplicateTest ? (
          <div className="space-y-2">
            <button
              type="button"
              disabled
              className="w-full p-3.5 bg-slate-200 text-slate-500 rounded-2xl font-black text-xs border border-slate-300 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>🔒</span>
              <span>Result Saved & Locked for {selectedSubject} ({testTitle})</span>
            </button>

            {existingTestId && (
              <button
                type="button"
                onClick={() => handleDeleteSubjectTest(existingTestId, selectedSubject)}
                className="w-full p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs border border-rose-200 transition"
              >
                🗑️ Delete Existing Result Entry to Re-enter
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSaveResult}
            disabled={loading || studentsList.length === 0}
            className="w-full p-3.5 bg-blue-950 hover:bg-blue-900 text-white rounded-2xl font-black text-xs transition shadow-md flex items-center justify-center gap-2"
          >
            <span>💾</span>
            <span>Save Result & Update Consolidated Result Sheet</span>
          </button>
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
                    <th key={sub.id} className="border border-black p-1 relative group">
                      <div className="flex items-center justify-between gap-1 px-1">
                        <span>{sub.subject_name.slice(0, 4)}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubjectTest(sub.id, sub.subject_name)}
                          className="text-[9px] text-rose-700 hover:text-rose-900 print:hidden font-mono font-bold"
                          title="Delete this subject test result"
                        >
                          ✕
                        </button>
                      </div>
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
