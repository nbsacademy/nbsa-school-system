'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdvanceSalaryPage() {
  const [loading, setLoading] = useState(false);

  // Live Database States
  const [staffList, setStaffList] = useState<any[]>([]);
  const [advanceLogs, setAdvanceLogs] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  // Form Inputs
  const [staffId, setStaffId] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceReason, setAdvanceReason] = useState('');

  // Custom UI Popup Notification State (with WhatsApp URL)
  const [popup, setPopup] = useState<{
    show: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    whatsappUrl?: string;
    whatsappPhone?: string;
  }>({
    show: false,
    type: 'success',
    title: '',
    message: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    // 1. Fetch Active Staff Members
    const { data: stData } = await supabase
      .from('staff')
      .select('id, full_name, registration_no, role, phone, whatsapp')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (stData) setStaffList(stData);

    // 2. Fetch Advance Logs
    fetchAdvanceLogs(stData || []);
  };

  const fetchAdvanceLogs = async (currentStaff?: any[]) => {
    const sMap = currentStaff && currentStaff.length > 0 ? currentStaff : staffList;

    const { data: advData, error } = await supabase
      .from('advance_salary')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && advData) {
      const merged = advData.map((log) => {
        const found = sMap.find((s) => s.id === log.staff_id);
        return {
          ...log,
          full_name: found ? found.full_name : 'Staff Member',
          registration_no: found ? found.registration_no : '-',
        };
      });
      setAdvanceLogs(merged);
    }
  };

  // Staff Select Handler
  const handleStaffSelect = (sId: string) => {
    setStaffId(sId);
    const found = staffList.find((s) => s.id === sId);
    setSelectedStaff(found || null);
  };

  // Helper to format WhatsApp phone number
  const formatWhatsAppNumber = (phoneStr: string) => {
    if (!phoneStr) return '';
    let cleaned = phoneStr.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '92' + cleaned.substring(1);
    }
    return cleaned;
  };

  // Issue Advance Salary
  const handleIssueAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId || !selectedStaff) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Select Staff',
        message: 'Please select a staff member to disburse advance!',
      });
      return;
    }

    const amt = parseFloat(advanceAmount) || 0;
    if (amt <= 0) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Invalid Amount',
        message: 'Please enter a valid advance amount!',
      });
      return;
    }

    setLoading(true);

    const payload = {
      staff_id: staffId,
      amount: amt,
      reason: advanceReason.trim() || 'Personal Emergency / Advance Request',
      status: 'Pending',
      is_deducted: false,
      issued_date: new Date().toISOString().split('T')[0],
    };

    const { error } = await supabase.from('advance_salary').insert([payload]);

    setLoading(false);

    if (error) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Disbursement Failed',
        message: error.message,
      });
      return;
    }

    // Construct Professional WhatsApp Message Text
    const rawPhone = selectedStaff.whatsapp || selectedStaff.phone || '';
    const formattedPhone = formatWhatsAppNumber(rawPhone);

    const receiptText = 
      `🏫 *NEW BRIGHT SCHOLARS SCIENCE ACADEMY*\n` +
      `------------------------------------\n` +
      `💵 *ADVANCE SALARY DISBURSED RECEIPT*\n` +
      `------------------------------------\n` +
      `👨‍🏫 *Staff Member:* ${selectedStaff.full_name}\n` +
      `🆔 *Registration No:* ${selectedStaff.registration_no}\n` +
      `💰 *Advance Amount:* Rs. ${amt.toLocaleString()}\n` +
      `📝 *Reason:* ${advanceReason.trim() || 'Personal Need'}\n` +
      `📅 *Issued Date:* ${new Date().toLocaleDateString('en-GB')}\n` +
      `------------------------------------\n` +
      `This amount will be adjusted in the upcoming monthly salary payout.\n` +
      `*Saqqa Software Service*`;

    const waUrl = formattedPhone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(receiptText)}` : '';

    setPopup({
      show: true,
      type: 'success',
      title: 'Advance Disbursed Successfully!',
      message: `Advance salary of Rs. ${amt.toLocaleString()} issued to ${selectedStaff.full_name}. Send WhatsApp receipt below.`,
      whatsappUrl: waUrl,
      whatsappPhone: rawPhone,
    });

    // Reset Form
    setStaffId('');
    setAdvanceAmount('');
    setAdvanceReason('');
    setSelectedStaff(null);

    // Refresh Logs
    fetchAdvanceLogs();
  };

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-5 text-left font-sans text-slate-900">
      
      {/* 🚀 BEAUTIFUL CUSTOM POPUP MODAL WITH WHATSAPP LINK */}
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

            {/* Direct WhatsApp Receipt Button */}
            {popup.type === 'success' && popup.whatsappUrl && (
              <a
                href={popup.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 rounded-2xl font-black text-xs transition shadow-md flex items-center justify-center gap-2"
              >
                <span>💬</span>
                <span>Send WhatsApp Receipt ({popup.whatsappPhone})</span>
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
        
        {/* Header */}
        <div className="border-b pb-2">
          <h2 className="text-lg md:text-xl font-black text-blue-900">
            Advance Salary Management
          </h2>
          <p className="text-[11px] text-gray-500">
            Disburse advance salary & send automatic WhatsApp confirmation receipt
          </p>
        </div>

        {/* Advance Form */}
        <form onSubmit={handleIssueAdvance} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Select Staff */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Staff Member
              </label>
              <select
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none text-blue-900 focus:border-blue-900"
                value={staffId}
                onChange={(e) => handleStaffSelect(e.target.value)}
              >
                <option value="">-- Select Staff --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.registration_no || 'No Reg'}) - {s.role || 'Staff'}
                  </option>
                ))}
              </select>
            </div>

            {/* Advance Amount */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Advance Amount (PKR)
              </label>
              <input
                type="number"
                placeholder="e.g. 5000"
                className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 outline-none text-emerald-800 focus:border-blue-900"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Reason / Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Medical / Emergency / Personal"
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none focus:border-blue-900"
                value={advanceReason}
                onChange={(e) => setAdvanceReason(e.target.value)}
              />
            </div>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white p-3.5 rounded-2xl font-black text-xs transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>💬</span>
            <span>
              {loading ? 'Processing Advance...' : 'Issue Advance & Send WhatsApp'}
            </span>
          </button>

        </form>

        {/* Advance Payment Logs */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-blue-900 uppercase tracking-wider">
              Advance Payment Logs ({advanceLogs.length})
            </h3>
            <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
              Active Logs
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {advanceLogs.map((item) => (
              <div key={item.id} className="p-3 bg-slate-50 rounded-2xl border flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-extrabold text-blue-950">
                    👨‍🏫 {item.full_name} <span className="text-gray-400 font-normal">({item.registration_no})</span>
                  </h4>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Reason: <b>{item.reason || 'Personal'}</b> | Date: {item.issued_date || item.created_at?.split('T')[0]}
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-mono font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl border border-emerald-200 block">
                    Rs. {parseFloat(item.amount || 0).toLocaleString()}
                  </span>
                  <span className={`text-[9px] font-bold block mt-0.5 ${
                    item.is_deducted ? 'text-gray-400' : 'text-amber-800'
                  }`}>
                    {item.is_deducted ? 'Adjusted in Salary' : 'Pending Adjustment'}
                  </span>
                </div>
              </div>
            ))}

            {advanceLogs.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8 font-medium">
                No advance salary records found in database yet.
              </p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}