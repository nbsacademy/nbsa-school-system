'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdvanceSalaryPage() {
  const [loading, setLoading] = useState(false);

  // Live Database States
  const [staffList, setStaffList] = useState<any[]>([]);
  const [salaryConfigs, setSalaryConfigs] = useState<any[]>([]);
  const [advanceLogs, setAdvanceLogs] = useState<any[]>([]);

  // Form Inputs
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [reason, setReason] = useState('');

  // Selected Staff Salary & Arrears Details State
  const [selectedStaffDetails, setSelectedStaffDetails] = useState<{
    basicSalary: number;
    arrears: number;
    pendingAdvance: number;
  } | null>(null);

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
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);

    try {
      // 1. Fetch Active Staff
      const { data: stData } = await supabase
        .from('staff')
        .select('id, full_name, registration_no, role, phone, whatsapp')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (stData) setStaffList(stData);

      // 2. Fetch Salary Configs for Basic Salary & Arrears
      const { data: cfgData } = await supabase.from('salary_config').select('*');
      if (cfgData) setSalaryConfigs(cfgData);

      // 3. Fetch Live Advance Salary Records
      fetchAdvanceLogs(stData || []);
    } catch (err) {
      console.error('Error loading advance page data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvanceLogs = async (currentStaff?: any[]) => {
    const staffToMap = currentStaff && currentStaff.length > 0 ? currentStaff : staffList;

    const { data: advData, error } = await supabase
      .from('advance_salary')
      .select('*');

    if (!error && advData) {
      const mergedData = advData.map((item) => {
        const foundStaff = staffToMap.find((s) => s.id === item.staff_id);
        return {
          ...item,
          full_name: foundStaff ? foundStaff.full_name : 'Staff Member',
          registration_no: foundStaff ? foundStaff.registration_no : '-',
          role: foundStaff ? foundStaff.role : 'Staff',
          phone: foundStaff ? foundStaff.phone || foundStaff.whatsapp : '',
        };
      });
      setAdvanceLogs(mergedData);
    }
  };

  // Staff Selection Handler -> Auto Calculates & Displays Basic Salary & Arrears
  const handleStaffSelect = (staffId: string) => {
    setSelectedStaffId(staffId);

    if (!staffId) {
      setSelectedStaffDetails(null);
      return;
    }

    // Find Salary Config for selected staff
    const cfg = salaryConfigs.find((c) => c.staff_id === staffId);
    const basic = cfg?.basic_salary ? parseFloat(cfg.basic_salary) : 0;
    const arr = cfg?.arrears ? parseFloat(cfg.arrears) : 0;

    // Find any un-deducted existing advance for this staff
    const staffAdvances = advanceLogs.filter(
      (a) => a.staff_id === staffId && a.is_deducted !== true
    );
    const pendAdv = staffAdvances.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);

    setSelectedStaffDetails({
      basicSalary: basic,
      arrears: arr,
      pendingAdvance: pendAdv,
    });
  };

  // Issue Advance Salary Handler
  const handleSaveAdvance = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStaffId) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Select Staff Required',
        message: 'Please select a staff member to issue advance salary!',
      });
      return;
    }

    const amt = parseFloat(advanceAmount);
    if (!amt || amt <= 0) {
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
      staff_id: selectedStaffId,
      amount: amt,
      reason: reason.trim() || 'Personal Emergency / Advance Request',
      is_deducted: false,
    };

    const { error } = await supabase.from('advance_salary').insert([payload]);

    setLoading(false);

    if (error) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Issue Failed',
        message: error.message,
      });
      return;
    }

    setPopup({
      show: true,
      type: 'success',
      title: 'Advance Issued Successfully!',
      message: 'Advance salary record has been saved in database.',
    });

    // Reset Form
    setSelectedStaffId('');
    setAdvanceAmount('');
    setReason('');
    setSelectedStaffDetails(null);

    // Refresh Logs
    fetchAdvanceLogs();
  };

  // Delete Advance Record
  const handleDeleteAdvance = async (id: string) => {
    if (!confirm('Are you sure you want to delete this advance salary record?')) return;

    const { error } = await supabase.from('advance_salary').delete().eq('id', id);

    if (!error) {
      setPopup({
        show: true,
        type: 'success',
        title: 'Deleted Successfully',
        message: 'Advance salary entry removed from database.',
      });
      fetchAdvanceLogs();
    } else {
      setPopup({
        show: true,
        type: 'error',
        title: 'Delete Failed',
        message: error.message,
      });
    }
  };

  // Send WhatsApp Receipt
  const handleSendWhatsApp = (item: any) => {
    let rawPhone = item.phone || '';
    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');

    if (cleanPhone.startsWith('0')) {
      cleanPhone = '92' + cleanPhone.slice(1);
    }

    const textMessage = `*NEW BRIGHT SCHOLARS SCIENCE ACADEMY* 🏫\n*ADVANCE SALARY RECEIPT*\n-----------------------------------\n👤 *Staff Name:* ${item.full_name}\n💼 *Role:* ${item.role}\n🆔 *Reg No:* ${item.registration_no}\n💸 *Advance Issued:* Rs. ${parseFloat(item.amount).toLocaleString()}\n📝 *Reason:* ${item.reason || 'Personal Request'}\n-----------------------------------\nThank you! New Bright Scholars Science Academy.`;

    const encodedText = encodeURIComponent(textMessage);
    const whatsappUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-5 text-left font-sans text-slate-900 pb-16">
      
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

      {/* Main Header Container */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        
        <div className="border-b pb-3 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h2 className="text-lg md:text-xl font-black text-blue-950">
              Advance Salary Management
            </h2>
            <p className="text-[11px] text-gray-500 font-medium">
              Disburse advance salary & send automatic WhatsApp confirmation receipt
            </p>
          </div>

          <span className="bg-blue-950 text-white font-extrabold text-xs px-3.5 py-1 rounded-full shadow-sm">
            Active Logs ({advanceLogs.length})
          </span>
        </div>

        {/* ISSUE ADVANCE SALARY FORM */}
        <form onSubmit={handleSaveAdvance} className="space-y-3.5 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* 1. SELECT STAFF DROPDOWN */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Staff Member ({staffList.length} Available)
              </label>
              <select
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none text-blue-950 focus:border-blue-950"
                value={selectedStaffId}
                onChange={(e) => handleStaffSelect(e.target.value)}
                required
              >
                <option value="">-- Choose Staff Member --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.registration_no || 'Reg #'}) - {s.role || 'Staff'}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. ADVANCE AMOUNT */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Advance Amount (PKR)
              </label>
              <input
                type="number"
                placeholder="e.g. 5000"
                className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 text-blue-950 outline-none focus:border-blue-950"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                required
              />
            </div>

            {/* 3. REASON / NOTES */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Reason / Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Medical / Emergency / Personal"
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 text-slate-800 outline-none"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

          </div>

          {/* DYNAMIC FINANCIAL DETAILS SUMMARY BOX FOR SELECTED STAFF */}
          {selectedStaffDetails && (
            <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs animate-fadeIn">
              <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-blue-100">
                <span className="font-sans font-extrabold text-gray-600">🏛️ Basic Salary:</span>
                <span className="font-black text-emerald-700">Rs. {selectedStaffDetails.basicSalary.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-blue-100">
                <span className="font-sans font-extrabold text-gray-600">💼 Previous Arrears:</span>
                <span className="font-black text-rose-700">Rs. {selectedStaffDetails.arrears.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-blue-100">
                <span className="font-sans font-extrabold text-gray-600">💸 Active Pending Advance:</span>
                <span className="font-black text-amber-700">Rs. {selectedStaffDetails.pendingAdvance.toLocaleString()}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-950 hover:bg-blue-900 text-white p-3.5 rounded-2xl font-black transition shadow-md disabled:opacity-50 text-xs flex items-center justify-center gap-2"
          >
            <span>💬</span>
            <span>{loading ? 'Processing...' : 'Issue Advance & Save Record'}</span>
          </button>

        </form>

      </div>

      {/* ADVANCE PAYMENT LOGS DIRECTORY TABLE */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        
        <div className="border-b pb-2 flex justify-between items-center">
          <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">
            ADVANCE PAYMENT LOGS ({advanceLogs.length})
          </h3>
          <span className="bg-emerald-50 text-emerald-800 font-mono font-black text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-200">
            Active Logs
          </span>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {advanceLogs.map((item) => (
            <div key={item.id} className="p-3.5 bg-slate-50 rounded-2xl border flex items-center justify-between flex-wrap gap-2 hover:bg-slate-100 transition">
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-black text-base shrink-0 shadow-sm">
                  💸
                </div>

                <div>
                  <h4 className="font-extrabold text-xs text-blue-950 flex items-center gap-1.5">
                    {item.full_name} <span className="text-gray-500 font-mono font-normal">({item.registration_no})</span>
                  </h4>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Role: <b>{item.role}</b> | Note: <i className="text-slate-700 font-bold">{item.reason || 'N/A'}</i>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right text-xs">
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">
                    Advance Issued
                  </span>
                  <b className="text-rose-700 font-mono text-sm font-black">
                    Rs. {(parseFloat(item.amount) || 0).toLocaleString()}
                  </b>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleSendWhatsApp(item)}
                    className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-black px-2.5 py-1 rounded-xl text-[11px] transition shadow-sm"
                    title="Send WhatsApp Receipt"
                  >
                    💬 WhatsApp
                  </button>

                  <button
                    onClick={() => handleDeleteAdvance(item.id)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold px-2 py-1 rounded-xl text-[11px] transition font-mono"
                  >
                    Delete
                  </button>
                </div>
              </div>

            </div>
          ))}

          {advanceLogs.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-16 font-medium border border-dashed rounded-2xl">
              No advance salary records found in database yet.
            </p>
          )}
        </div>

      </div>

    </div>
  );
}