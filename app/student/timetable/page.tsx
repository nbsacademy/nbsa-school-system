'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudentTimetablePage() {
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState('Monday');
  const [student, setStudent] = useState<any>(null);
  const [allTimetables, setAllTimetables] = useState<any[]>([]);

  useEffect(() => {
    fetchStudentAndTimetable();
  }, []);

  const fetchStudentAndTimetable = async () => {
    setLoading(true);

    // 1. Get Logged-In Student Details
    const storedStudentId = localStorage.getItem('user_id');
    const storedRegNo = localStorage.getItem('user_reg_no') || localStorage.getItem('username');

    let studentRecord = null;

    if (storedStudentId) {
      const { data } = await supabase
        .from('students')
        .select('*, classes(id, class_name, section_name)')
        .eq('id', storedStudentId)
        .maybeSingle();
      studentRecord = data;
    }

    if (!studentRecord && storedRegNo) {
      const { data } = await supabase
        .from('students')
        .select('*, classes(id, class_name, section_name)')
        .or(`registration_no.eq.${storedRegNo.trim()},admission_no.eq.${storedRegNo.trim()}`)
        .maybeSingle();
      studentRecord = data;
    }

    // Fallback if no specific login session
    if (!studentRecord) {
      const { data: fallback } = await supabase
        .from('students')
        .select('*, classes(id, class_name, section_name)')
        .limit(1)
        .maybeSingle();
      studentRecord = fallback;
    }

    if (studentRecord) {
      setStudent(studentRecord);

      // 2. Fetch Live Timetable Set by Teachers
      const { data: tData } = await supabase
        .from('timetables')
        .select('*, classes(class_name, section_name), staff(full_name)')
        .order('start_time', { ascending: true });

      if (tData) {
        // Filter timetable slots matching student's class/section
        const filtered = tData.filter((item) => {
          if (studentRecord.class_id && item.class_id === studentRecord.class_id) {
            return true;
          }
          const stSec = (studentRecord.section_name || studentRecord.classes?.section_name || '').trim().toLowerCase();
          const itemSec = (item.classes?.section_name || item.classes?.class_name || '').trim().toLowerCase();
          return stSec && itemSec && stSec === itemSec;
        });

        setAllTimetables(filtered);
      }
    }

    setLoading(false);
  };

  // Helper to format 24h time string (e.g. "08:00:00") to 12h format ("08:00 AM")
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hrs, mins] = timeStr.split(':');
    let h = parseInt(hrs, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${mins} ${ampm}`;
  };

  // Filter periods for selected day
  const currentDayPeriods = allTimetables.filter((t) => t.day_of_week === activeDay);

  const classNameDisplay = student
    ? `${student.classes?.class_name || 'Class'} (${student.section_name || student.classes?.section_name || 'Section A'})`
    : 'Class Schedule';

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-bold text-gray-500 animate-pulse">
        Loading Class Timetable...
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-6 font-sans">
      
      {/* 1. TOP HEADER SECTION */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        
        <div className="flex justify-between items-center flex-wrap gap-3 border-b pb-3">
          <div>
            <h2 className="text-lg md:text-xl font-black text-blue-950">
              Class Subject Timetable
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Subject periods schedule with teacher names and room numbers
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="bg-blue-950 hover:bg-blue-900 text-white text-xs font-black px-4 py-2 rounded-xl transition shadow-md flex items-center gap-1.5"
          >
            <span>🖨️</span> Print Schedule
          </button>
        </div>

        {/* Your Class Badge & Day Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border">
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-600">Your Class:</span>
            <span className="bg-blue-100 text-blue-950 border border-blue-200 text-xs font-black px-3.5 py-1 rounded-xl">
              {classNameDisplay}
            </span>
          </div>

          {/* Day Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {DAYS.map((day) => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition whitespace-nowrap ${
                  activeDay === day
                    ? 'bg-blue-900 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-slate-200 border'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* 2. TIMETABLE PERIODS LIST */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">
            {activeDay.toUpperCase()} SCHEDULE ({classNameDisplay.toUpperCase()})
          </h3>
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black px-3 py-0.5 rounded-full">
            Active Schedule
          </span>
        </div>

        {/* Periods Grid / List */}
        {currentDayPeriods.length > 0 ? (
          <div className="space-y-3">
            {currentDayPeriods.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-4 bg-slate-50 hover:bg-slate-100/90 rounded-2xl border flex items-center justify-between flex-wrap gap-3 transition shadow-sm"
              >
                {/* Left: Period Badge, Subject & Time */}
                <div className="flex items-center gap-3.5">
                  <span className="w-10 h-10 bg-blue-900 text-white rounded-2xl flex items-center justify-center font-black text-xs font-mono shrink-0 shadow-inner">
                    P-{idx + 1}
                  </span>

                  <div>
                    <h4 className="font-extrabold text-blue-950 text-sm md:text-base">
                      {item.subject_name}
                    </h4>
                    <p className="text-xs text-gray-500 font-bold mt-0.5 flex items-center gap-1">
                      <span>⏱</span>
                      <span>{formatTime(item.start_time)} - {formatTime(item.end_time)}</span>
                    </p>
                  </div>
                </div>

                {/* Right: Teacher Name & Room/Lab */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="bg-white px-3 py-1.5 rounded-xl border text-slate-800 font-extrabold shadow-sm flex items-center gap-1.5">
                    <span>👨‍🏫</span>
                    <span>{item.staff?.full_name || 'Assigned Teacher'}</span>
                  </span>

                  <span className="bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 text-blue-950 font-black shadow-sm flex items-center gap-1.5">
                    <span>📍</span>
                    <span>{item.room_no || 'Room 1'}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed">
            No periods set for {activeDay} for this class yet.
          </div>
        )}

      </div>

    </div>
  );
}