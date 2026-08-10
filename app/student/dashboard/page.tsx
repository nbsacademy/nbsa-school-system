'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [attendancePercentage, setAttendancePercentage] = useState<number>(0);
  const [latestGrade, setLatestGrade] = useState<string>('N/A');

  useEffect(() => {
    fetchLoggedInStudentData();
  }, []);

  const fetchLoggedInStudentData = async () => {
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
      const { data: fallbackData } = await supabase
        .from('students')
        .select('*, classes(class_name, section_name)')
        .limit(1)
        .maybeSingle();
      studentRecord = fallbackData;
    }

    if (studentRecord) {
      setStudent(studentRecord);

      // Save session details
      localStorage.setItem('user_id', studentRecord.id);
      localStorage.setItem('user_reg_no', studentRecord.registration_no || studentRecord.admission_no || '');

      // Fetch Attendance Percentage
      const { data: attData } = await supabase
        .from('student_attendance')
        .select('status')
        .eq('student_id', studentRecord.id);

      if (attData && attData.length > 0) {
        const presents = attData.filter((a: any) => a.status === 'Present').length;
        const pct = Math.round((presents / attData.length) * 100);
        setAttendancePercentage(pct);
      } else {
        setAttendancePercentage(100);
      }

      // Fetch Latest Grade with Safe Type Casting
      const { data: markData } = await supabase
        .from('student_marks')
        .select('obtained_marks, student_tests(total_marks)')
        .eq('student_id', studentRecord.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (markData && markData.length > 0) {
        const firstMark: any = markData[0];
        const obt = Number(firstMark?.obtained_marks) || 0;
        const testObj = Array.isArray(firstMark?.student_tests) ? firstMark?.student_tests[0] : firstMark?.student_tests;
        const tot = Number(testObj?.total_marks) || 100;
        const p = Math.round((obt / tot) * 100);
        setLatestGrade(`${p}%`);
      }
    }

    setLoading(false);
  };

  // 🎯 ALL 9 STUDENT CONTROLS
  const controlButtons = [
    {
      id: 'fees',
      title: 'Fees & Pay Online',
      subTitle: 'Check Vouchers & Pay Online',
      icon: '💳',
      bgColor: 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-950 border-emerald-200',
      path: '/student/fees',
    },
    {
      id: 'timetable',
      title: 'Timetable',
      subTitle: 'Daily Class Periods Schedule',
      icon: '⏰',
      bgColor: 'bg-amber-50 hover:bg-amber-100/80 text-amber-950 border-amber-200',
      path: '/student/timetable',
    },
    {
      id: 'result',
      title: 'Result & Graph',
      subTitle: 'Academic Performance & Charts',
      icon: '🏆',
      bgColor: 'bg-purple-50 hover:bg-purple-100/80 text-purple-950 border-purple-200',
      path: '/student/results',
    },
    {
      id: 'classwork',
      title: 'Classwork',
      subTitle: 'Daily Lecture Notes & Work',
      icon: '📖',
      bgColor: 'bg-blue-50 hover:bg-blue-100/80 text-blue-950 border-blue-200',
      path: '/student/classwork',
    },
    {
      id: 'homework',
      title: 'Homework',
      subTitle: 'Assigned Diary & Home Tasks',
      icon: '📝',
      bgColor: 'bg-sky-50 hover:bg-sky-100/80 text-sky-950 border-sky-200',
      path: '/student/homework',
    },
    {
      id: 'books',
      title: 'Books & Notes',
      subTitle: 'Download Study Material & PDFs',
      icon: '📚',
      bgColor: 'bg-indigo-50 hover:bg-indigo-100/80 text-indigo-950 border-indigo-200',
      path: '/student/books',
    },
    {
      id: 'messages',
      title: 'Messages & Notices',
      subTitle: 'Academy Announcements & News',
      icon: '💬',
      bgColor: 'bg-rose-50 hover:bg-rose-100/80 text-rose-950 border-rose-200',
      path: '/student/messages',
    },
    {
      id: 'profile',
      title: 'My Profile',
      subTitle: 'Personal Info & Guardian Details',
      icon: '👤',
      bgColor: 'bg-slate-50 hover:bg-slate-100 text-slate-950 border-slate-200',
      path: '/student/profile',
    },
    {
      id: 'attendance',
      title: 'Attendance History',
      subTitle: 'Monthly Attendance Record',
      icon: '📊',
      bgColor: 'bg-teal-50 hover:bg-teal-100/80 text-teal-950 border-teal-200',
      path: '/student/attendance',
    },
  ];

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-bold text-gray-500 animate-pulse">
        Loading Student Portal Dashboard...
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-6 font-sans">
      
      {/* 1. STUDENT PROFILE HEADER CARD */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white p-5 md:p-6 rounded-3xl shadow-lg border border-blue-800/50 space-y-4">
        
        <div className="flex items-center justify-between flex-wrap gap-4">
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              {student?.photo_url ? (
                <img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">👨‍🎓</span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg md:text-xl font-black text-white">
                  {student?.full_name || 'Student Name'}
                </h2>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono">
                  Roll No: {student?.roll_no || '01'}
                </span>
              </div>

              <p className="text-xs text-blue-200 font-medium mt-0.5">
                Reg No: <b className="font-mono text-white">{student?.registration_no || student?.admission_no || '-'}</b> | Father: {student?.father_name || '-'}
              </p>

              <p className="text-xs text-emerald-300 font-bold mt-0.5">
                Class: {student?.classes?.class_name || '9th'} ({student?.section_name || student?.classes?.section_name || 'Section A'})
              </p>
            </div>
          </div>

          <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-4 py-2 rounded-2xl text-xs font-black shadow-sm flex items-center gap-1.5">
            <span>✓</span>
            <span>Fee Status: Active</span>
          </div>

        </div>

        {/* Quick Indicators */}
        <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 p-2.5 rounded-2xl">
            <span className="text-[10px] text-blue-200 font-extrabold uppercase block">ATTENDANCE</span>
            <b className="text-sm font-black font-mono text-emerald-400">{attendancePercentage}%</b>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/10 p-2.5 rounded-2xl">
            <span className="text-[10px] text-blue-200 font-extrabold uppercase block">PENDING TASKS</span>
            <b className="text-sm font-black font-mono text-amber-300">0 Due</b>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/10 p-2.5 rounded-2xl">
            <span className="text-[10px] text-blue-200 font-extrabold uppercase block">LATEST GRADE</span>
            <b className="text-sm font-black font-mono text-sky-300">{latestGrade}</b>
          </div>
        </div>

      </div>

      {/* 2. STUDENT PORTAL CONTROLS GRID */}
      <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border space-y-4">
        
        <div className="border-b pb-3 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-black text-blue-950 uppercase tracking-widest">
              STUDENT PORTAL CONTROLS
            </h3>
            <p className="text-[11px] text-gray-500">Quick access to academic features, diaries, and schedules</p>
          </div>

          <span className="text-[10px] font-black bg-blue-50 text-blue-900 border border-blue-200 px-3 py-1 rounded-full">
            {controlButtons.length} Modules
          </span>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-1">
          {controlButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => router.push(btn.path)}
              className={`p-4 rounded-2xl border text-left transition shadow-sm hover:shadow-md flex items-center gap-3.5 ${btn.bgColor} group`}
            >
              <div className="w-12 h-12 rounded-2xl bg-white border flex items-center justify-center text-2xl shrink-0 shadow-inner group-hover:scale-105 transition">
                {btn.icon}
              </div>

              <div>
                <h4 className="font-extrabold text-sm text-slate-900 leading-tight">{btn.title}</h4>
                <p className="text-[11px] text-gray-500 font-medium leading-tight mt-0.5">{btn.subTitle}</p>
              </div>
            </button>
          ))}
        </div>

      </div>

    </div>
  );
}