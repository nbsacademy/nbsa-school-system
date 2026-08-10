'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function StudentResultsPage() {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);

  // Marks & Test History States
  const [subjectMarksList, setSubjectMarksList] = useState<any[]>([]);
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [selectedTestTitle, setSelectedTestTitle] = useState('Latest Assessment');

  useEffect(() => {
    fetchStudentAndResults();
  }, []);

  const fetchStudentAndResults = async () => {
    setLoading(true);

    const storedStudentId = localStorage.getItem('user_id');
    const storedRegNo = localStorage.getItem('user_reg_no') || localStorage.getItem('username');

    let studentRecord: any = null;

    if (storedStudentId) {
      const { data } = await supabase
        .from('students')
        .select('*, classes(class_name, section_name)')
        .eq('id', storedStudentId)
        .maybeSingle();
      studentRecord = data;
    }

    if (!studentRecord && storedRegNo) {
      const { data } = await supabase
        .from('students')
        .select('*, classes(class_name, section_name)')
        .or(`registration_no.eq.${storedRegNo.trim()},admission_no.eq.${storedRegNo.trim()}`)
        .maybeSingle();
      studentRecord = data;
    }

    if (!studentRecord) {
      const { data: fallback } = await supabase
        .from('students')
        .select('*, classes(class_name, section_name)')
        .limit(1)
        .maybeSingle();
      studentRecord = fallback;
    }

    if (studentRecord) {
      setStudent(studentRecord);

      const { data: marksData } = await supabase
        .from('student_marks')
        .select('obtained_marks, created_at, student_tests(id, test_title, total_marks, subject_name, test_date)')
        .eq('student_id', studentRecord.id)
        .order('created_at', { ascending: false });

      if (marksData && marksData.length > 0) {
        setTestHistory(marksData);

        const firstTest: any = marksData[0]?.student_tests;
        const testObj = Array.isArray(firstTest) ? firstTest[0] : firstTest;
        setSelectedTestTitle(testObj?.test_title || 'Monthly Test');

        const { data: staffData } = await supabase.from('staff').select('id, full_name, subject');

        const currentSubjectMarks = marksData.map((item: any) => {
          const tInfo = Array.isArray(item.student_tests) ? item.student_tests[0] : item.student_tests;
          const subj = tInfo?.subject_name || 'Subject';

          const matchedTeacher = staffData?.find((s: any) => {
            const staffSubj = (s.subject || '').toLowerCase();
            const currentSubj = subj.toLowerCase();
            return staffSubj.includes(currentSubj) || currentSubj.includes(staffSubj);
          });

          return {
            subject_name: subj,
            obtained_marks: Number(item.obtained_marks) || 0,
            total_marks: Number(tInfo?.total_marks) || 100,
            test_title: tInfo?.test_title || 'Monthly Test',
            test_date: tInfo?.test_date || '',
            teacher_name: matchedTeacher ? matchedTeacher.full_name : 'Subject Teacher',
          };
        });

        setSubjectMarksList(currentSubjectMarks);
      }
    }

    setLoading(false);
  };

  const grandTotalMarks = subjectMarksList.reduce((sum, item) => sum + item.total_marks, 0);
  const grandObtainedMarks = subjectMarksList.reduce((sum, item) => sum + item.obtained_marks, 0);
  const overallPercentage = grandTotalMarks > 0 ? Math.round((grandObtainedMarks / grandTotalMarks) * 100) : 0;

  let overallGrade = 'A+';
  let gradeBadgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (overallPercentage < 40) { overallGrade = 'F'; gradeBadgeColor = 'bg-rose-100 text-rose-800 border-rose-300'; }
  else if (overallPercentage < 50) { overallGrade = 'D'; gradeBadgeColor = 'bg-orange-100 text-orange-800 border-orange-300'; }
  else if (overallPercentage < 60) { overallGrade = 'C'; gradeBadgeColor = 'bg-amber-100 text-amber-800 border-amber-300'; }
  else if (overallPercentage < 70) { overallGrade = 'B'; gradeBadgeColor = 'bg-sky-100 text-sky-800 border-sky-300'; }
  else if (overallPercentage < 80) { overallGrade = 'A'; gradeBadgeColor = 'bg-blue-100 text-blue-800 border-blue-300'; }

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-bold text-gray-500 animate-pulse">
        Loading Student Exam Results...
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-6 font-sans">
      
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3 border-b pb-3">
          <div>
            <span className="bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-black px-3 py-0.5 rounded-full mb-1 inline-block">
              {selectedTestTitle}
            </span>
            <h2 className="text-xl font-black text-blue-950">
              My Exam Results & Marks Sheet
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Subject-wise marks entered by class & subject teachers
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="bg-blue-950 hover:bg-blue-900 text-white text-xs font-black px-4 py-2.5 rounded-xl transition shadow-md flex items-center gap-1.5"
          >
            <span>🖨️</span> Print Result Card
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-2xl border text-center space-y-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
              TOTAL MARKS
            </span>
            <b className="text-xl font-black font-mono text-blue-950 block">
              {grandObtainedMarks} / {grandTotalMarks || 100}
            </b>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border text-center space-y-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
              PERCENTAGE
            </span>
            <b className="text-xl font-black font-mono text-emerald-600 block">
              {overallPercentage}%
            </b>
          </div>

          <div className={`p-4 rounded-2xl border text-center space-y-1 ${gradeBadgeColor}`}>
            <span className="text-[10px] font-black uppercase tracking-wider block">
              OVERALL GRADE
            </span>
            <b className="text-xl font-black font-mono block">
              {overallGrade}
            </b>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        <div className="border-b pb-2 flex justify-between items-center">
          <h3 className="text-xs font-black text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
            <span>📊</span> SUBJECT PERFORMANCE BAR GRAPH
          </h3>
          <span className="text-[10px] font-extrabold text-blue-900">
            Student: {student?.full_name}
          </span>
        </div>

        {subjectMarksList.length > 0 ? (
          <div className="pt-6 pb-2 px-2 flex items-end justify-around gap-2 h-60 overflow-x-auto border-b">
            {subjectMarksList.map((item, idx) => {
              const pct = item.total_marks > 0 ? Math.round((item.obtained_marks / item.total_marks) * 100) : 0;
              let barColor = 'bg-emerald-500';
              if (pct < 40) barColor = 'bg-rose-500';
              else if (pct < 70) barColor = 'bg-blue-500';

              return (
                <div key={idx} className="flex flex-col items-center flex-1 min-w-[55px] max-w-[80px] h-full justify-end group">
                  <span className="text-[11px] font-black font-mono mb-1 text-slate-800">
                    {item.obtained_marks}/{item.total_marks}
                  </span>
                  <div
                    style={{ height: `${Math.max(12, pct)}%` }}
                    className={`w-full rounded-t-xl ${barColor} transition-all duration-500 shadow-md flex items-center justify-center text-[10px] font-extrabold text-white`}
                  >
                    {pct}%
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 truncate w-full text-center mt-2 group-hover:text-blue-900">
                    {item.subject_name}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-xs text-gray-400 font-medium">
            No subject marks available to generate performance graph.
          </div>
        )}
      </div>

      {testHistory.length > 1 && (
        <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
          <div className="border-b pb-2">
            <h3 className="text-xs font-black text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
              <span>📈</span> PAST VS PRESENT EXAM PROGRESS TREND
            </h3>
            <p className="text-[11px] text-gray-500">Academic comparison across previous tests</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {testHistory.map((h: any, i: number) => {
              const tInfo = Array.isArray(h.student_tests) ? h.student_tests[0] : h.student_tests;
              const tot = tInfo?.total_marks || 100;
              const obt = Number(h.obtained_marks) || 0;
              const pct = Math.round((obt / tot) * 100);
              const prevObt = i < testHistory.length - 1 ? Number(testHistory[i + 1].obtained_marks) : obt;
              const isUp = obt >= prevObt;

              return (
                <div key={i} className="bg-slate-50 p-3 rounded-2xl border text-center space-y-1 shadow-sm">
                  <span className="text-[10px] font-bold text-gray-400 block truncate">
                    {tInfo?.test_title || 'Test'}
                  </span>
                  <b className="text-sm font-black font-mono text-blue-950 block">
                    {obt}/{tot}
                  </b>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block ${
                    isUp ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isUp ? '📈 Up' : '📉 Down'} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        <div className="border-b pb-3 flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">
            DETAILED SUBJECT MARKS SHEET
          </h3>
          <span className="text-[11px] font-bold text-gray-500">
            Class: <b className="text-blue-900">{student?.classes?.class_name || '9th'} ({student?.section_name || student?.classes?.section_name || 'Section A'})</b>
          </span>
        </div>

        {subjectMarksList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-700 font-black">
                  <th className="p-3 rounded-l-xl">#</th>
                  <th className="p-3">Subject Name</th>
                  <th className="p-3">Subject Teacher</th>
                  <th className="p-3">Total Marks</th>
                  <th className="p-3">Obtained Marks</th>
                  <th className="p-3 text-center rounded-r-xl">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-slate-800">
                {subjectMarksList.map((row, idx) => {
                  const pct = row.total_marks > 0 ? Math.round((row.obtained_marks / row.total_marks) * 100) : 0;
                  let grade = 'A+';
                  let gradeBg = 'bg-emerald-100 text-emerald-800';
                  if (pct < 40) { grade = 'F'; gradeBg = 'bg-rose-100 text-rose-800'; }
                  else if (pct < 50) { grade = 'D'; gradeBg = 'bg-orange-100 text-orange-800'; }
                  else if (pct < 60) { grade = 'C'; gradeBg = 'bg-amber-100 text-amber-800'; }
                  else if (pct < 70) { grade = 'B'; gradeBg = 'bg-sky-100 text-sky-800'; }
                  else if (pct < 80) { grade = 'A'; gradeBg = 'bg-blue-100 text-blue-800'; }

                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold font-mono">{idx + 1}</td>
                      <td className="p-3 font-black text-blue-950">{row.subject_name}</td>
                      <td className="p-3 font-bold text-slate-700 flex items-center gap-1.5">
                        <span>👨‍🏫</span>
                        <span>{row.teacher_name}</span>
                      </td>
                      <td className="p-3 font-bold font-mono text-gray-500">{row.total_marks}</td>
                      <td className="p-3 font-black font-mono text-blue-900 text-sm">
                        {row.obtained_marks}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-3 py-1 rounded-xl font-black text-[11px] font-mono shadow-sm ${gradeBg}`}>
                          {grade} ({pct}%)
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-xs text-gray-400 font-bold bg-slate-50 rounded-2xl border border-dashed">
            No subject marks found in Supabase database for this student yet.
          </div>
        )}
      </div>

    </div>
  );
}