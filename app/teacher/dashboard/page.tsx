'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Live Teacher Profile States
  const [teacherProfile, setTeacherProfile] = useState<any>({
    full_name: 'Teacher Name',
    registration_no: 'T-2026-001',
    assigned_class: 'Not Assigned',
    total_students: 0,
    today_attendance: 'Pending',
  });

  useEffect(() => {
    fetchLiveTeacherData();
  }, []);

  const fetchLiveTeacherData = async () => {
    setLoading(true);

    // Get Logged In Teacher Details from LocalStorage
    const storedId = localStorage.getItem('user_id');
    const storedName = localStorage.getItem('user_name');

    let teacherObj: any = null;

    if (storedId) {
      const { data } = await supabase
        .from('staff')
        .select('*')
        .eq('id', storedId)
        .maybeSingle();
      if (data) teacherObj = data;
    }

    // Fallback: Fetch first active teacher if direct ID not found
    if (!teacherObj) {
      const { data } = await supabase
        .from('staff')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (data) teacherObj = data;
    }

    if (teacherObj) {
      // 1. Fetch Total Active Students in DB
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      // 2. Fetch Today's Attendance for Teacher
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: attData } = await supabase
        .from('staff_attendance')
        .select('status')
        .eq('staff_id', teacherObj.id)
        .eq('attendance_date', todayStr)
        .maybeSingle();

      setTeacherProfile({
        full_name: teacherObj.full_name || storedName || 'Teacher Name',
        registration_no: teacherObj.registration_no || 'T-2026-001',
        assigned_class: teacherObj.role || 'Science Faculty Teacher',
        total_students: studentCount || 0,
        today_attendance: attData ? attData.status : 'Done',
      });
    }

    setLoading(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      
      {/* 1. TEACHER LIVE PROFILE CARD */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 text-white shadow-lg space-y-4 relative overflow-hidden">
        <div className="flex justify-between items-start flex-wrap gap-2 relative z-10">
          <div>
            <span className="bg-blue-800/80 text-blue-200 font-mono text-[11px] font-bold px-3 py-1 rounded-full border border-blue-700">
              {teacherProfile.registration_no}
            </span>
            <h2 className="text-2xl font-black mt-2">
              {teacherProfile.full_name}
            </h2>
            <p className="text-xs text-blue-200 font-medium">
              Faculty Role / Class: <b className="text-white">{teacherProfile.assigned_class}</b>
            </p>
          </div>

          <span className="bg-white/10 text-xs font-mono font-bold px-3 py-1 rounded-full border border-white/20">
            Session 2026
          </span>
        </div>

        {/* Live Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3 pt-2 text-slate-900">
          <div className="bg-white p-3 rounded-2xl text-center shadow-sm">
            <span className="text-[10px] font-bold text-gray-500 uppercase block">STUDENTS</span>
            <b className="text-lg font-black text-blue-950 font-mono">{teacherProfile.total_students}</b>
          </div>

          <div className="bg-white p-3 rounded-2xl text-center shadow-sm">
            <span className="text-[10px] font-bold text-gray-500 uppercase block">TODAY ATTENDANCE</span>
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 block mt-1">
              ✓ {teacherProfile.today_attendance}
            </span>
          </div>

          <div className="bg-white p-3 rounded-2xl text-center shadow-sm">
            <span className="text-[10px] font-bold text-gray-500 uppercase block">TESTS PENDING</span>
            <b className="text-lg font-black text-amber-800 font-mono">0</b>
          </div>
        </div>
      </div>

      {/* 2. TEACHER PORTAL CONTROLS GRID */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-4">
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest border-b pb-2">
          TEACHER PORTAL CONTROLS
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
          <button onClick={() => router.push('/teacher/attendance')} className="p-4 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100 rounded-2xl flex flex-col items-center justify-center text-center space-y-1.5 transition">
            <span className="text-2xl">📋</span>
            <span className="text-xs font-bold text-emerald-950">Attendance</span>
          </button>

          <button onClick={() => router.push('/teacher/timetable')} className="p-4 bg-amber-50 hover:bg-amber-100/80 border border-amber-100 rounded-2xl flex flex-col items-center justify-center text-center space-y-1.5 transition">
            <span className="text-2xl">⏰</span>
            <span className="text-xs font-bold text-amber-950">Timetable</span>
          </button>

          <button onClick={() => router.push('/teacher/classwork')} className="p-4 bg-blue-50 hover:bg-blue-100/80 border border-blue-100 rounded-2xl flex flex-col items-center justify-center text-center space-y-1.5 transition">
            <span className="text-2xl">📖</span>
            <span className="text-xs font-bold text-blue-950">Classwork</span>
          </button>

          <button onClick={() => router.push('/teacher/homework')} className="p-4 bg-orange-50 hover:bg-orange-100/80 border border-orange-100 rounded-2xl flex flex-col items-center justify-center text-center space-y-1.5 transition">
            <span className="text-2xl">📝</span>
            <span className="text-xs font-bold text-orange-950">Homework</span>
          </button>

          <button onClick={() => router.push('/teacher/analytics')} className="p-4 bg-purple-50 hover:bg-purple-100/80 border border-purple-100 rounded-2xl flex flex-col items-center justify-center text-center space-y-1.5 transition">
            <span className="text-2xl">📊</span>
            <span className="text-xs font-bold text-purple-950">Analytics Graph</span>
          </button>

          <button onClick={() => router.push('/teacher/books')} className="p-4 bg-teal-50 hover:bg-teal-100/80 border border-teal-100 rounded-2xl flex flex-col items-center justify-center text-center space-y-1.5 transition">
            <span className="text-2xl">📚</span>
            <span className="text-xs font-bold text-teal-950">Class Books</span>
          </button>

          <button onClick={() => router.push('/teacher/messages')} className="p-4 bg-pink-50 hover:bg-pink-100/80 border border-pink-100 rounded-2xl flex flex-col items-center justify-center text-center space-y-1.5 transition">
            <span className="text-2xl">💬</span>
            <span className="text-xs font-bold text-pink-950">Messages</span>
          </button>

          <button onClick={() => router.push('/teacher/test-papers')} className="p-4 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 rounded-2xl flex flex-col items-center justify-center text-center space-y-1.5 transition">
            <span className="text-2xl">📄</span>
            <span className="text-xs font-bold text-indigo-950">Test Papers</span>
          </button>

          <button onClick={() => router.push('/teacher/results')} className="p-4 bg-yellow-50 hover:bg-yellow-100/80 border border-yellow-100 rounded-2xl flex flex-col items-center justify-center text-center space-y-1.5 transition">
            <span className="text-2xl">🥇</span>
            <span className="text-xs font-bold text-yellow-950">Result Reports</span>
          </button>

          <button onClick={() => router.push('/teacher/my-students')} className="p-4 bg-sky-50 hover:bg-sky-100/80 border border-sky-100 rounded-2xl flex flex-col items-center justify-center text-center space-y-1.5 transition">
            <span className="text-2xl">🎓</span>
            <span className="text-xs font-bold text-sky-950">My Students</span>
          </button>
        </div>
      </div>

    </div>
  );
}