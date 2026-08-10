'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function TeacherResultAnalyticsPage() {
  const [loading, setLoading] = useState(false);

  // Live Database Dropdown States
  const [classesList, setClassesList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [subjectList, setSubjectList] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');

  // Test Header Information
  const [testTitle, setTestTitle] = useState('Monthly Test - August 2026');
  const [totalMarks, setTotalMarks] = useState<number>(100);

  // Students and Marks Data
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [marksMap, setMarksMap] = useState<{ [studentId: string]: number }>({});

  // Individual Progress Analytics State
  const [selectedStudentForAnalytics, setSelectedStudentForAnalytics] = useState('');
  const [studentHistory, setStudentHistory] = useState<any[]>([]);

  // Alert State
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    fetchTeacherAssignments();
  }, []);

  // 1. Fetch Assigned Classes & Subjects for Logged In Teacher
  const fetchTeacherAssignments = async () => {
    setLoading(true);

    // Fetch All Active Classes
    const { data: cData } = await supabase.from('classes').select('*').order('class_name', { ascending: true });
    if (cData && cData.length > 0) {
      setClassesList(cData);
      setSelectedClassId(cData[0].id);
    }

    // Fetch Timetables/Subjects assigned to this teacher
    const storedTeacherId = localStorage.getItem('user_id');
    let subjects = ['Physics', 'Chemistry', 'Mathematics', 'English', 'Biology', 'Urdu', 'Computer Sci'];

    if (storedTeacherId) {
      const { data: tData } = await supabase
        .from('timetables')
        .select('subject_name')
        .eq('teacher_id', storedTeacherId);

      if (tData && tData.length > 0) {
        const uniqueSubjs = Array.from(new Set(tData.map((t) => t.subject_name)));
        subjects = uniqueSubjs;
      }
    }

    setSubjectList(subjects);
    if (subjects.length > 0) setSelectedSubject(subjects[0]);

    // Load Students for Default Selected Class
    if (cData && cData.length > 0) {
      await loadClassStudents(cData[0].id);
    }

    setLoading(false);
  };

  // 2. Load Class Students Sorted STRICTLY by Roll Number
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

    // Default 0 marks for all students
    const initialMarks: { [key: string]: number } = {};
    currentStudents.forEach((st) => {
      initialMarks[st.id] = 0;
    });
    setMarksMap(initialMarks);

    if (currentStudents.length > 0) {
      setSelectedStudentForAnalytics(currentStudents[0].id);
      fetchStudentProgressHistory(currentStudents[0].id);
    } else {
      setStudentHistory([]);
    }

    setLoading(false);
  };

  // Handle Class Selection Change
  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    loadClassStudents(newClassId);
  };

  // Handle Obtained Marks Input Change
  const handleMarksChange = (studentId: string, val: string) => {
    const num = Math.min(totalMarks, Math.max(0, parseFloat(val) || 0));
    setMarksMap((prev) => ({ ...prev, [studentId]: num }));
  };

  // Save Test Results to Supabase
  const handleSaveResult = async () => {
    if (!selectedClassId || !selectedSubject || studentsList.length === 0) {
      setAlert({ type: 'error', msg: 'Please select class, subject and ensure students are available.' });
      return;
    }

    setLoading(true);
    setAlert(null);

    // 1. Insert/Create Test Record
    const { data: testData, error: testErr } = await supabase
      .from('student_tests')
      .insert([
        {
          class_id: selectedClassId,
          subject_name: selectedSubject,
          test_title: testTitle.trim() || 'Monthly Test',
          total_marks: totalMarks,
          test_date: new Date().toISOString().split('T')[0],
        },
      ])
      .select()
      .single();

    if (testErr || !testData) {
      setAlert({ type: 'error', msg: testErr?.message || 'Failed to save test details.' });
      setLoading(false);
      return;
    }

    // 2. Insert Marks Records
    const marksPayload = studentsList.map((st) => ({
      test_id: testData.id,
      student_id: st.id,
      obtained_marks: marksMap[st.id] || 0,
    }));

    const { error: marksErr } = await supabase.from('student_marks').upsert(marksPayload);

    setLoading(false);

    if (marksErr) {
      setAlert({ type: 'error', msg: marksErr.message });
    } else {
      setAlert({ type: 'success', msg: 'Class Test Results Saved & Performance Analytics Updated Successfully!' });
      if (selectedStudentForAnalytics) {
        fetchStudentProgressHistory(selectedStudentForAnalytics);
      }
    }
  };

  // Fetch Individual Student's Test History for Trend Graph
  const fetchStudentProgressHistory = async (studentId: string) => {
    if (!studentId) return;

    const { data } = await supabase
      .from('student_marks')
      .select('obtained_marks, created_at, student_tests(test_title, total_marks, subject_name)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: true });

    if (data) {
      setStudentHistory(data);
    }
  };

  // 3. SORT STUDENTS BY MARKS (High to Low Order for Ranking Graph)
  const sortedStudentsForGraph = [...studentsList].sort((a, b) => {
    const markA = marksMap[a.id] || 0;
    const markB = marksMap[b.id] || 0;
    return markB - markA; // Descending Order (High to Low)
  });

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-6 font-sans">
      
      {/* 1. TOP HEADER & ASSIGNED SELECTION CONTROLS */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        
        <div className="flex justify-between items-center flex-wrap gap-2 border-b pb-3">
          <div>
            <h2 className="text-xl font-black text-blue-950">
              Subject Result & Performance Analytics
            </h2>
            <p className="text-xs text-gray-500">
              Enter test marks, generate auto grades and view live performance graphs
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm border flex items-center gap-1.5"
          >
            <span>🖨️</span> Print Result Sheet
          </button>
        </div>

        {alert && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold border ${
              alert.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {alert.type === 'error' ? '⚠️ ' : '✓ '} {alert.msg}
          </div>
        )}

        {/* Assigned Class, Subject & Test Title Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          
          <div>
            <label className="block font-bold text-gray-700 mb-1">Select Class</label>
            <select
              className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 text-blue-900 outline-none"
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

          <div>
            <label className="block font-bold text-gray-700 mb-1">Assigned Subject</label>
            <select
              className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 text-blue-900 outline-none"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              {subjectList.map((subj, idx) => (
                <option key={idx} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Test Name / Title</label>
            <input
              type="text"
              className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 text-slate-900 outline-none"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Total Marks</label>
            <input
              type="number"
              className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 text-slate-900 outline-none"
              value={totalMarks}
              onChange={(e) => setTotalMarks(parseFloat(e.target.value) || 100)}
            />
          </div>

        </div>

      </div>

      {/* 2. GRAPH 1: HIGH TO LOW RANKING MARKS BAR GRAPH */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
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
              const obt = marksMap[st.id] || 0;
              const pct = Math.min(100, Math.round((obt / totalMarks) * 100));

              // Dynamic Color Grading
              let barBg = 'bg-emerald-500';
              if (pct < 40) barBg = 'bg-rose-500';
              else if (pct < 70) barBg = 'bg-blue-500';

              return (
                <div key={st.id} className="flex flex-col items-center flex-1 min-w-[50px] max-w-[80px] h-full justify-end group">
                  <span className="text-[11px] font-black font-mono mb-1 text-slate-800">
                    {obt}/{totalMarks}
                  </span>

                  <div
                    style={{ height: `${Math.max(12, pct)}%` }}
                    className={`w-full rounded-t-xl ${barBg} transition-all duration-500 shadow-md flex items-center justify-center text-[10px] font-extrabold text-white`}
                  >
                    {pct}%
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
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        
        <div className="flex justify-between items-center flex-wrap gap-2 border-b pb-3">
          <div>
            <h3 className="text-xs font-black text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
              <span>📈</span> INDIVIDUAL STUDENT PROGRESS GRAPH (PAST vs PRESENT TREND)
            </h3>
            <p className="text-[11px] text-gray-500">Track if student performance is improving or declining</p>
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
                const p = Math.round((h.obtained_marks / tMax) * 100);

                // Check trend compared to previous test
                const prevObt = i > 0 ? studentHistory[i - 1].obtained_marks : h.obtained_marks;
                const isUp = h.obtained_marks >= prevObt;

                return (
                  <div key={i} className="bg-white p-3 rounded-xl border text-center shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 block truncate">
                      {h.student_tests?.test_title || 'Test'}
                    </span>
                    <b className="text-sm font-black font-mono text-blue-950 block">
                      {h.obtained_marks}/{tMax}
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

      {/* 4. MARKS ENTRY TABLE (ORDERED BY ROLL NO) */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-xs font-black text-blue-900 uppercase tracking-wider">
            STUDENT MARKS ENTRY (ROLL NUMBER SERIAL WISE) ({studentsList.length})
          </h3>
          <span className="text-xs text-gray-500 font-medium">Max Marks: <b>{totalMarks}</b></span>
        </div>

        <div className="space-y-2.5 max-h-96 overflow-y-auto">
          {studentsList.map((st, idx) => {
            const currentObt = marksMap[st.id] || 0;
            const pct = Math.round((currentObt / totalMarks) * 100);

            let grade = 'A+';
            let gradeBg = 'bg-emerald-100 text-emerald-800';
            if (pct < 40) { grade = 'F'; gradeBg = 'bg-rose-100 text-rose-800'; }
            else if (pct < 50) { grade = 'D'; gradeBg = 'bg-orange-100 text-orange-800'; }
            else if (pct < 60) { grade = 'C'; gradeBg = 'bg-amber-100 text-amber-800'; }
            else if (pct < 70) { grade = 'B'; gradeBg = 'bg-sky-100 text-sky-800'; }
            else if (pct < 80) { grade = 'A'; gradeBg = 'bg-blue-100 text-blue-800'; }

            return (
              <div
                key={st.id}
                className="p-3 bg-slate-50 rounded-2xl border flex items-center justify-between flex-wrap gap-2 text-xs"
              >
                {/* Roll No & Student Details */}
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-blue-900 text-white rounded-xl flex items-center justify-center font-bold font-mono text-xs shrink-0">
                    {st.roll_no || idx + 1}
                  </span>
                  <div>
                    <h4 className="font-extrabold text-blue-950 text-sm">{st.full_name}</h4>
                    <p className="text-[11px] text-gray-500 font-medium">
                      S/O: {st.father_name || '-'} | Reg: <b className="text-gray-700">{st.registration_no || st.admission_no || '-'}</b>
                    </p>
                  </div>
                </div>

                {/* Obtained Marks Input & Auto Grade */}
                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-0.5">Obtained Marks</label>
                    <input
                      type="number"
                      min="0"
                      max={totalMarks}
                      className="w-24 p-2 border rounded-xl font-bold font-mono text-center text-sm bg-white outline-none focus:border-blue-700 text-blue-950"
                      value={marksMap[st.id] ?? 0}
                      onChange={(e) => handleMarksChange(st.id, e.target.value)}
                    />
                  </div>

                  <div className="text-center">
                    <label className="text-[10px] font-bold text-gray-500 block mb-0.5">Grade</label>
                    <span className={`px-3 py-1.5 rounded-xl font-black text-xs block font-mono ${gradeBg}`}>
                      {grade} ({pct}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {studentsList.length === 0 && !loading && (
            <p className="text-xs text-gray-400 text-center py-12 font-medium">
              No students found in the selected class to enter test results.
            </p>
          )}
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSaveResult}
          disabled={loading || studentsList.length === 0}
          className="w-full p-4 bg-blue-900 hover:bg-blue-800 text-white rounded-2xl font-black text-xs transition shadow-md flex items-center justify-center gap-2"
        >
          <span>💾</span>
          <span>Save Result & Update Live Performance Analytics</span>
        </button>

      </div>

    </div>
  );
}