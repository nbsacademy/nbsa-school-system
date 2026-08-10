'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ClassAttendanceRegisterPage() {
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<'en' | 'ur'>('en');

  // Live Database States
  const [classesList, setClassesList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentsList, setStudentsList] = useState<any[]>([]);

  // Attendance State (student_id -> 'Present' | 'Absent' | 'Leave')
  const [attendanceMap, setAttendanceMap] = useState<{ [key: string]: 'Present' | 'Absent' | 'Leave' }>({});

  // Locking State if Already Marked Today
  const [isAlreadyMarked, setIsAlreadyMarked] = useState(false);

  // Custom UI Popup Notification State
  const [popup, setPopup] = useState<{
    show: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    whatsappUrl?: string;
  }>({
    show: false,
    type: 'success',
    title: '',
    message: '',
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  // Fetch All Classes from Database
  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('class_name', { ascending: true });
    if (data && data.length > 0) {
      setClassesList(data);
      setSelectedClassId(data[0].id);
      loadClassStudentsAndAttendance(data[0].id, attendanceDate);
    }
  };

  // Strictly Load Students Matching Selected Class ID Only
  const loadClassStudentsAndAttendance = async (classId: string, dateStr: string) => {
    if (!classId) return;

    setLoading(true);
    setStudentsList([]); 
    setAttendanceMap({});

    // Strictly Query Students belonging ONLY to the selected class_id
    const { data: stData } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .order('full_name', { ascending: true });

    const currentStudents = stData || [];
    setStudentsList(currentStudents);

    // Check Existing Attendance for this Specific Class & Date
    if (currentStudents.length > 0) {
      const { data: attData } = await supabase
        .from('student_attendance')
        .select('*')
        .eq('class_id', classId)
        .eq('attendance_date', dateStr);

      if (attData && attData.length > 0) {
        setIsAlreadyMarked(true);
        const newMap: { [key: string]: 'Present' | 'Absent' | 'Leave' } = {};
        attData.forEach((record) => {
          newMap[record.student_id] = record.status;
        });

        currentStudents.forEach((st) => {
          if (!newMap[st.id]) newMap[st.id] = 'Present';
        });

        setAttendanceMap(newMap);
      } else {
        setIsAlreadyMarked(false);
        const initialMap: { [key: string]: 'Present' | 'Absent' | 'Leave' } = {};
        currentStudents.forEach((st) => {
          initialMap[st.id] = 'Present';
        });
        setAttendanceMap(initialMap);
      }
    } else {
      setIsAlreadyMarked(false);
    }

    setLoading(false);
  };

  // Class Selection Change Handler
  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    loadClassStudentsAndAttendance(newClassId, attendanceDate);
  };

  // Attendance Date Change Handler
  const handleDateChange = (newDate: string) => {
    setAttendanceDate(newDate);
    loadClassStudentsAndAttendance(selectedClassId, newDate);
  };

  // Change Status for Individual Student
  const handleStatusChange = (studentId: string, status: 'Present' | 'Absent' | 'Leave') => {
    if (isAlreadyMarked) return;
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  };

  // Mark All Present Shortcut
  const handleMarkAllPresent = () => {
    if (isAlreadyMarked) return;
    const allPresentMap: { [key: string]: 'Present' | 'Absent' | 'Leave' } = {};
    studentsList.forEach((st) => {
      allPresentMap[st.id] = 'Present';
    });
    setAttendanceMap(allPresentMap);
  };

  // Count Statistics
  const presentCount = Object.values(attendanceMap).filter((s) => s === 'Present').length;
  const absentCount = Object.values(attendanceMap).filter((s) => s === 'Absent').length;
  const leaveCount = Object.values(attendanceMap).filter((s) => s === 'Leave').length;

  // Save Attendance & Generate WhatsApp Group Summary
  const handleSaveAttendance = async () => {
    if (studentsList.length === 0) {
      setPopup({
        show: true,
        type: 'error',
        title: 'No Students Found',
        message: 'No active students available in this class to mark attendance.',
      });
      return;
    }

    setLoading(true);

    const payload = studentsList.map((st) => ({
      student_id: st.id,
      class_id: selectedClassId,
      attendance_date: attendanceDate,
      status: attendanceMap[st.id] || 'Present',
    }));

    const { error } = await supabase
      .from('student_attendance')
      .upsert(payload, { onConflict: 'student_id,attendance_date' });

    setLoading(false);

    if (error) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Save Failed',
        message: error.message,
      });
      return;
    }

    setIsAlreadyMarked(true);

    const currentClass = classesList.find((c) => c.id === selectedClassId);
    const classNameStr = currentClass ? `${currentClass.class_name} (${currentClass.section_name || 'Section A'})` : 'Class';

    const absentStudents = studentsList.filter((s) => attendanceMap[s.id] === 'Absent');
    const leaveStudents = studentsList.filter((s) => attendanceMap[s.id] === 'Leave');
    const presentStudents = studentsList.filter((s) => (attendanceMap[s.id] || 'Present') === 'Present');

    let waText = `🏫 *NEW BRIGHT SCHOLARS SCIENCE ACADEMY*\n`;
    waText += `📋 *DAILY CLASS ATTENDANCE REPORT*\n`;
    waText += `------------------------------------\n`;
    waText += `🏫 *Class:* ${classNameStr}\n`;
    waText += `📅 *Date:* ${attendanceDate}\n`;
    waText += `📊 *Total:* ${studentsList.length} | ✅ *Present:* ${presentCount} | ❌ *Absent:* ${absentCount} | 🟡 *Leave:* ${leaveCount}\n`;
    waText += `------------------------------------\n\n`;

    waText += `❌ *ABSENT STUDENTS (${absentStudents.length}):*\n`;
    if (absentStudents.length > 0) {
      absentStudents.forEach((st, idx) => {
        waText += `${idx + 1}. ${st.full_name} (Reg: ${st.registration_no || 'A-2026-0001'})\n`;
      });
    } else {
      waText += `(All Present / No Absentees)\n`;
    }

    waText += `\n🟡 *LEAVE / ON-LEAVE STUDENTS (${leaveStudents.length}):*\n`;
    if (leaveStudents.length > 0) {
      leaveStudents.forEach((st, idx) => {
        waText += `${idx + 1}. ${st.full_name} (Reg: ${st.registration_no || 'A-2026-0001'})\n`;
      });
    } else {
      waText += `(None)\n`;
    }

    waText += `\n✅ *PRESENT STUDENTS (${presentStudents.length}):*\n`;
    if (presentStudents.length > 0) {
      presentStudents.forEach((st, idx) => {
        waText += `${idx + 1}. ${st.full_name}\n`;
      });
    }

    waText += `\n------------------------------------\n`;
    waText += `*Saqqa Software Service © 2026*`;

    const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;

    setPopup({
      show: true,
      type: 'success',
      title: 'Attendance Saved & Locked!',
      message: `Daily attendance for ${classNameStr} saved successfully. Click below to share to WhatsApp group.`,
      whatsappUrl: waUrl,
    });
  };

  return (
    <div className={`p-3 md:p-6 max-w-5xl mx-auto space-y-5 ${lang === 'ur' ? 'font-urdu text-right' : 'text-left'}`}>
      
      {/* CUSTOM POPUP MODAL WITH WHATSAPP LINK */}
      {popup.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className={`bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border-t-8 text-center space-y-4 ${
            popup.type === 'success' ? 'border-emerald-600' : 'border-red-600'
          }`}>
            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl font-black ${
              popup.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
            }`}>
              {popup.type === 'success' ? '✓' : '✕'}
            </div>

            <div className="space-y-1">
              <h3 className={`text-lg font-black ${popup.type === 'success' ? 'text-emerald-900' : 'text-red-900'}`}>
                {popup.title}
              </h3>
              <p className="text-xs text-gray-600 font-medium">{popup.message}</p>
            </div>

            {popup.type === 'success' && popup.whatsappUrl && (
              <a
                href={popup.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 rounded-2xl font-black text-xs transition shadow-md flex items-center justify-center gap-2"
              >
                <span>💬</span>
                <span>Share Attendance on WhatsApp Group</span>
              </a>
            )}

            <button
              onClick={() => setPopup({ ...popup, show: false })}
              className="w-full py-3 rounded-2xl text-xs font-black text-gray-700 bg-slate-100 hover:bg-slate-200 transition shadow-sm"
            >
              Close & Continue
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-5">
        
        {/* Header & Lock Status Badge */}
        <div className="border-b pb-3 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h2 className="text-lg md:text-xl font-black text-blue-900">
              Class Attendance Register
            </h2>
            <p className="text-[11px] text-gray-500">
              Select class, mark presence & send WhatsApp group report
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isAlreadyMarked && (
              <button
                onClick={handleMarkAllPresent}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-sm"
              >
                ✓ Mark All Present
              </button>
            )}

            <span className={`px-3.5 py-1.5 rounded-full font-black text-xs border flex items-center gap-1.5 shadow-sm ${
              isAlreadyMarked
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-amber-100 text-amber-900 border-amber-300'
            }`}>
              <span>{isAlreadyMarked ? '✓' : '⏳'}</span>
              <span>
                {isAlreadyMarked ? 'Attendance Marked & Locked for Today' : 'Attendance Pending'}
              </span>
            </span>
          </div>
        </div>

        {/* Attendance Summary Count Cards */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">
            <span className="text-[10px] font-extrabold text-emerald-800 uppercase block">PRESENT</span>
            <b className="text-xl font-black text-emerald-950 font-mono">{presentCount}</b>
          </div>

          <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl">
            <span className="text-[10px] font-extrabold text-rose-800 uppercase block">ABSENT</span>
            <b className="text-xl font-black text-rose-950 font-mono">{absentCount}</b>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl">
            <span className="text-[10px] font-extrabold text-amber-800 uppercase block">LEAVE</span>
            <b className="text-xl font-black text-amber-950 font-mono">{leaveCount}</b>
          </div>
        </div>

        {/* Select Class & Date Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-2xl border">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Select Class</label>
            <select
              className="w-full p-2.5 border rounded-xl font-bold bg-white outline-none text-blue-900"
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
            <label className="block font-bold text-gray-700 mb-1">Attendance Date</label>
            <input
              type="date"
              className="w-full p-2.5 border rounded-xl font-bold bg-white outline-none text-blue-900"
              value={attendanceDate}
              onChange={(e) => handleDateChange(e.target.value)}
            />
          </div>
        </div>

        {/* Student Attendance List */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-black text-blue-900 uppercase tracking-wider">
            STUDENT ATTENDANCE LIST ({studentsList.length})
          </h3>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {studentsList.map((st, idx) => {
              const currentStatus = attendanceMap[st.id] || 'Present';

              return (
                <div key={st.id} className="p-3 bg-slate-50 rounded-2xl border flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 bg-blue-900 text-white rounded-full flex items-center justify-center font-bold font-mono text-xs">
                      {st.roll_no || idx + 1}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-blue-950">{st.full_name}</h4>
                      <p className="text-[11px] text-gray-500 font-medium">
                        S/O: {st.father_name || '-'} | Reg: <b className="text-gray-700">{st.registration_no || 'A-2026-0001'}</b>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isAlreadyMarked}
                      onClick={() => handleStatusChange(st.id, 'Present')}
                      className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition border ${
                        currentStatus === 'Present'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-slate-100'
                      }`}
                    >
                      Present
                    </button>

                    <button
                      type="button"
                      disabled={isAlreadyMarked}
                      onClick={() => handleStatusChange(st.id, 'Absent')}
                      className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition border ${
                        currentStatus === 'Absent'
                          ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-slate-100'
                      }`}
                    >
                      Absent
                    </button>

                    <button
                      type="button"
                      disabled={isAlreadyMarked}
                      onClick={() => handleStatusChange(st.id, 'Leave')}
                      className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition border ${
                        currentStatus === 'Leave'
                          ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-slate-100'
                      }`}
                    >
                      Leave
                    </button>
                  </div>
                </div>
              );
            })}

            {studentsList.length === 0 && !loading && (
              <p className="text-xs text-gray-400 text-center py-12 font-medium">
                No active students enrolled in this class yet.
              </p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSaveAttendance}
          disabled={loading || isAlreadyMarked || studentsList.length === 0}
          className={`w-full p-3.5 rounded-2xl font-black text-xs transition shadow-md flex items-center justify-center gap-2 ${
            isAlreadyMarked
              ? 'bg-emerald-800 text-white cursor-not-allowed opacity-80'
              : 'bg-blue-900 hover:bg-blue-800 text-white'
          }`}
        >
          <span>💬</span>
          <span>
            {isAlreadyMarked
              ? '✓ Attendance Already Done & Locked for this Class'
              : 'Save Attendance & Share WhatsApp Group Report'}
          </span>
        </button>

      </div>

    </div>
  );
}