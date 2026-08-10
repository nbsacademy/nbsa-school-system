'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ResignStaffPage() {
  const [loading, setLoading] = useState(false);

  // Database State
  const [activeStaffList, setActiveStaffList] = useState<any[]>([]);
  const [resignedStaffList, setResignedStaffList] = useState<any[]>([]);

  // Certificate Modal State
  const [certData, setCertData] = useState<any>(null);

  // Form State
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [resignDate, setResignDate] = useState(new Date().toISOString().split('T')[0]);
  const [resignReason, setResignReason] = useState('');
  const [pendingSalary, setPendingSalary] = useState('0');
  const [advanceDues, setAdvanceDues] = useState('0');

  // Custom UI Popup Notification
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
    fetchStaffLists();
  }, []);

  const fetchStaffLists = async () => {
    // 1. Active Staff
    const { data: activeData } = await supabase
      .from('staff')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (activeData) setActiveStaffList(activeData);

    // 2. Resigned Staff
    const { data: resignedData } = await supabase
      .from('staff')
      .select('*')
      .eq('is_active', false)
      .order('resign_date', { ascending: false });
    if (resignedData) setResignedStaffList(resignedData);
  };

  // Resign Staff Handler
  const handleMarkResigned = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Select Staff Required',
        message: 'Please select a staff member to process resignation!',
      });
      return;
    }

    setLoading(true);

    const targetStaff = activeStaffList.find((s) => s.id === selectedStaffId);

    // Update Staff Record to Resigned
    const { error } = await supabase
      .from('staff')
      .update({
        is_active: false,
        resign_date: resignDate,
        resign_reason: resignReason.trim() || 'Personal Reasons',
        pending_salary: parseFloat(pendingSalary) || 0,
        advance_dues: parseFloat(advanceDues) || 0,
      })
      .eq('id', selectedStaffId);

    if (!error && targetStaff?.registration_no) {
      // Delete or deactivate profile login
      await supabase.from('profiles').delete().eq('username', targetStaff.registration_no);
    }

    setLoading(false);

    if (error) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Process Failed',
        message: error.message,
      });
      return;
    }

    setPopup({
      show: true,
      type: 'success',
      title: 'Staff Marked as Resigned',
      message: 'Staff member marked as resigned and portal login disabled.',
    });

    setSelectedStaffId('');
    setResignReason('');
    setPendingSalary('0');
    setAdvanceDues('0');
    fetchStaffLists();
  };

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-5 text-left font-sans text-slate-900">
      
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

      {/* 📜 PRINTABLE EXPERIENCE & CHARACTER CERTIFICATE MODAL */}
      {certData && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 overflow-y-auto">
          <div className="bg-white p-6 md:p-10 rounded-3xl shadow-2xl max-w-3xl w-full border-8 border-blue-950 space-y-6 print:border-4 print:p-8 print:shadow-none print:w-full print:max-w-none text-left font-sans">
            
            {/* Header / Logo */}
            <div className="text-center border-b-2 border-blue-900 pb-4 space-y-1">
              <span className="text-4xl block">🏫</span>
              <h1 className="text-xl md:text-2xl font-black text-blue-950 uppercase tracking-wide">
                New Bright Scholars Science Academy
              </h1>
              <p className="text-xs text-gray-600 font-bold">
                Karor Lal Esan, District Layyah | Reg No: NBSA-OFFICIAL
              </p>
              <div className="inline-block bg-amber-100 text-amber-900 text-[11px] font-black px-4 py-1 rounded-full border border-amber-300 mt-2 uppercase tracking-widest">
                Experience & Character Certificate
              </div>
            </div>

            {/* Certificate Body Text */}
            <div className="space-y-4 text-xs md:text-sm text-gray-800 leading-relaxed font-medium">
              <p className="text-right text-gray-500 font-mono text-[11px]">
                Date: <b>{new Date().toLocaleDateString('en-GB')}</b>
              </p>

              <p>
                To Whom It May Concern,
              </p>

              <p className="text-justify">
                This is to certify that Mr./Ms. <b className="text-blue-950 text-base">{certData.full_name}</b> (Reg No: <b className="font-mono">{certData.registration_no}</b>), Son/Daughter of <b>{certData.father_name || 'N/A'}</b>, was employed with <b>New Bright Scholars Science Academy</b> as a <b>{certData.role || 'Staff Member'}</b>.
              </p>

              <p className="text-justify">
                They served our institution from <b className="font-mono">{certData.created_at ? new Date(certData.created_at).toLocaleDateString('en-GB') : 'Joining Date'}</b> to <b className="font-mono">{certData.resign_date || 'Resignation Date'}</b>. During their tenure with us, we found them to be hard-working, punctual, dedicated, and extremely professional in their duties.
              </p>

              <p className="text-justify">
                Their character and conduct during their service were highly commendable. They bear a good moral character and leave behind a positive mark in our academy.
              </p>

              {/* Settlement Info Box */}
              <div className="bg-slate-50 p-3 rounded-2xl border text-xs grid grid-cols-2 gap-2 my-2">
                <div>
                  <span className="text-gray-500 block text-[10px]">Reason for Leaving:</span>
                  <b className="text-gray-800">{certData.resign_reason || 'Personal Reasons'}</b>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Account Settlement Status:</span>
                  <b className="text-emerald-700">All Accounts Cleared ✓</b>
                </div>
              </div>

              <p>
                We appreciate their contributions and wish them the best of luck in all their future endeavors.
              </p>
            </div>

            {/* Signatures & Seal Footer */}
            <div className="pt-8 flex justify-between items-end border-t border-gray-300 text-xs font-bold">
              <div className="text-center space-y-1">
                <div className="w-24 h-12 border-b-2 border-dashed border-gray-400 mx-auto"></div>
                <span className="block text-gray-600">Academy Office Stamp</span>
              </div>

              <div className="text-center space-y-1">
                <div className="w-32 h-12 border-b-2 border-gray-900 mx-auto"></div>
                <span className="block text-blue-950 font-black">Principal Signature</span>
                <span className="text-[10px] text-gray-500 block">New Bright Scholars Science Academy</span>
              </div>
            </div>

            {/* Action Buttons (Hidden on Print) */}
            <div className="pt-4 flex gap-3 print:hidden">
              <button
                onClick={() => setCertData(null)}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-gray-800 p-3 rounded-2xl font-bold transition text-xs"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 bg-blue-950 hover:bg-blue-900 text-white p-3 rounded-2xl font-black transition shadow-md text-xs"
              >
                🖨️ Print / Download PDF
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* 1. RESIGNATION & CLEARANCE FORM */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
          <div className="border-b pb-2">
            <h2 className="text-sm font-extrabold text-blue-900">
              1. Staff Resignation Process
            </h2>
            <p className="text-[11px] text-gray-500">
              Select active staff member and clear all pending dues
            </p>
          </div>

          <form onSubmit={handleMarkResigned} className="space-y-3 text-xs">
            {/* Select Active Staff */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Select Active Staff</label>
              <select
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none text-blue-900 focus:border-blue-900"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
              >
                <option value="">-- Select Active Staff --</option>
                {activeStaffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.registration_no || 'No Reg'}) - {s.role || 'Staff'}
                  </option>
                ))}
              </select>
            </div>

            {/* Resignation Date */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Resignation Date</label>
              <input
                type="date"
                required
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none focus:border-blue-900"
                value={resignDate}
                onChange={(e) => setResignDate(e.target.value)}
              />
            </div>

            {/* Financial Settlement Dues */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border">
              <div>
                <label className="block font-bold text-emerald-800 mb-1">Pending Salary Payable</label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full p-2 border rounded-xl font-mono font-bold bg-white outline-none text-emerald-700 focus:border-blue-900"
                  value={pendingSalary}
                  onChange={(e) => setPendingSalary(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-rose-800 mb-1">Advance / Dues Receivable</label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full p-2 border rounded-xl font-mono font-bold bg-white outline-none text-rose-700 focus:border-blue-900"
                  value={advanceDues}
                  onChange={(e) => setAdvanceDues(e.target.value)}
                />
              </div>
            </div>

            {/* Resignation Reason */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Reason for Resignation</label>
              <textarea
                rows={2}
                placeholder="e.g. Personal Reasons, Relocating, Better opportunity"
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none focus:border-blue-900"
                value={resignReason}
                onChange={(e) => setResignReason(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-700 hover:bg-rose-800 text-white p-3.5 rounded-2xl font-black transition shadow-md disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Mark as Resigned & Clear Dues'}
            </button>
          </form>
        </div>

        {/* 2. RESIGNED STAFF DIRECTORY */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
          <div className="border-b pb-2 flex justify-between items-center">
            <h2 className="text-sm font-extrabold text-blue-900">
              Resigned Staff Directory
            </h2>
            <span className="bg-rose-50 text-rose-800 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-rose-200">
              Total: {resignedStaffList.length}
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {resignedStaffList.map((item) => (
              <div key={item.id} className="p-3 bg-slate-50 rounded-2xl border space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-xs text-gray-900">
                      👨‍🏫 {item.full_name} <span className="text-gray-400 font-normal font-mono">({item.registration_no})</span>
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Role: <b>{item.role || 'Staff'}</b> | Date: <b className="text-rose-700 font-mono">{item.resign_date || '-'}</b>
                    </p>
                  </div>

                  <button
                    onClick={() => setCertData(item)}
                    className="bg-blue-900 hover:bg-blue-800 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition shadow-sm"
                  >
                    📜 Certificate
                  </button>
                </div>

                <div className="text-[10px] bg-white p-2 rounded-xl border flex justify-between text-gray-600 font-bold font-mono">
                  <span>Payable Salary: <b className="text-emerald-700">Rs. {item.pending_salary || 0}</b></span>
                  <span>Advance Dues: <b className="text-rose-700">Rs. {item.advance_dues || 0}</b></span>
                </div>
              </div>
            ))}

            {resignedStaffList.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-12 font-medium">
                No resigned staff members found in database.
              </p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}