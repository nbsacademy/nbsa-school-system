'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { generateWhatsAppAttendanceReport } from '@/constants/academy';
import { sendWhatsAppMessage } from '@/utils/helpers';
import { AttendanceStatus } from '@/types';

export default function StaffAttendancePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const [staffList, setStaffList] = useState([
    { id: '1', name: 'Muhammad Ali', role: 'Teacher', status: 'Present' as AttendanceStatus },
    { id: '2', name: 'Usman Ghani', role: 'Accountant', status: 'Present' as AttendanceStatus },
    { id: '3', name: 'Saira Ahmed', role: 'Teacher', status: 'Absent' as AttendanceStatus },
  ]);

  // Custom UI Popup Notification State
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
    fetchRealStaff();
  }, []);

  const fetchRealStaff = async () => {
    const { data } = await supabase.from('staff').select('id, full_name, role');
    if (data && data.length > 0) {
      setStaffList(data.map((s: any) => ({
        id: s.id,
        name: s.full_name,
        role: s.role || 'Staff',
        status: 'Present' as AttendanceStatus,
      })));
    }
  };

  const handleStatusChange = (id: string, status: AttendanceStatus) => {
    setStaffList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  const handleSaveAndSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const presentList = staffList.filter((s) => s.status === 'Present').map((s) => s.name);
    const absentList = staffList.filter((s) => s.status === 'Absent').map((s) => s.name);
    const leaveList = staffList.filter((s) => s.status === 'Leave').map((s) => s.name);
    const lateList = staffList.filter((s) => s.status === 'Late').map((s) => s.name);

    const message = generateWhatsAppAttendanceReport(selectedDate, presentList, absentList, leaveList, lateList);

    setTimeout(() => {
      setLoading(false);
      sendWhatsAppMessage(message);

      setPopup({
        show: true,
        type: 'success',
        title: 'Attendance Saved!',
        message: `Attendance for ${selectedDate} has been saved and WhatsApp report generated successfully.`,
      });
    }, 400);
  };

  return (
    <div className="p-3 md:p-8 max-w-5xl mx-auto text-left font-sans text-slate-900">
      
      {/* 🚀 CUSTOM POPUP MODAL */}
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

            <button
              onClick={() => setPopup({ ...popup, show: false })}
              className={`w-full py-3 rounded-2xl text-xs font-black text-white transition shadow-md ${
                popup.type === 'success' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-red-700 hover:bg-red-800'
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white p-4 md:p-8 rounded-3xl shadow-lg border-t-8 border-blue-900 space-y-5">
        
        {/* Header */}
        <div className="border-b pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-lg md:text-2xl font-extrabold text-blue-900">
              Staff Attendance Register
            </h2>
            <p className="text-xs text-gray-500">
              Mark attendance & auto-generate WhatsApp report
            </p>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-[11px] font-bold text-gray-700 mb-1">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto p-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-900 bg-slate-50 font-bold font-mono"
            />
          </div>
        </div>

        {/* Attendance Form */}
        <form onSubmit={handleSaveAndSendWhatsApp} className="space-y-4">
          <div className="space-y-3">
            {staffList.map((staff, index) => (
              <div key={staff.id} className="p-3 md:p-4 rounded-2xl border bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-blue-900 transition">
                
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-blue-900 text-white font-bold text-xs flex items-center justify-center shrink-0 font-mono">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900 leading-tight">{staff.name}</h3>
                    <p className="text-[11px] text-gray-500 font-medium">{staff.role}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5 w-full sm:w-auto">
                  {[
                    { key: 'Present', labelEn: 'Present', color: 'bg-emerald-600' },
                    { key: 'Absent', labelEn: 'Absent', color: 'bg-red-600' },
                    { key: 'Leave', labelEn: 'Leave', color: 'bg-amber-500' },
                    { key: 'Late', labelEn: 'Late', color: 'bg-purple-600' },
                  ].map((st) => (
                    <button
                      type="button"
                      key={st.key}
                      onClick={() => handleStatusChange(staff.id, st.key as AttendanceStatus)}
                      className={`py-2 px-1.5 rounded-xl text-[11px] font-extrabold transition text-center ${
                        staff.status === st.key ? `${st.color} text-white shadow-md scale-105` : 'bg-white border text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {st.labelEn}
                    </button>
                  ))}
                </div>

              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 rounded-xl font-extrabold shadow-lg transition duration-200 text-sm flex items-center justify-center gap-2 mt-4"
          >
            <span>💬</span>
            <span>{loading ? 'Generating Report...' : 'Save Attendance & Send WhatsApp Report'}</span>
          </button>
        </form>

      </div>
    </div>
  );
}