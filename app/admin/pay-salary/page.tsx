'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ProcessPaySalaryPage() {
  const [loading, setLoading] = useState(false);

  // Live Database States
  const [staffList, setStaffList] = useState<any[]>([]);
  const [salaryConfigsList, setSalaryConfigsList] = useState<any[]>([]);
  const [recentPaymentsList, setRecentPaymentsList] = useState<any[]>([]);

  // Selection Inputs
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [salaryMonth, setSalaryMonth] = useState('August 2026');

  // Status Badge State ('Pending' | 'Paid')
  const [paymentStatus, setPaymentStatus] = useState<'Pending' | 'Paid'>('Pending');

  // Auto-Synced Parameters
  const [basicSalary, setBasicSalary] = useState(0);
  const [allowedLeaves, setAllowedLeaves] = useState(2);
  const [takenLeaves, setTakenLeaves] = useState(0);
  const [leaveDeduction, setLeaveDeduction] = useState(0);
  const [advanceDeducted, setAdvanceDeducted] = useState(0);
  const [previousArrears, setPreviousArrears] = useState(0);

  // Manual Inputs
  const [monthBonus, setMonthBonus] = useState('0');

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
    // 1. Fetch Staff
    const { data: stData } = await supabase
      .from('staff')
      .select('id, full_name, registration_no, role')
      .eq('is_active', true);
    if (stData) setStaffList(stData);

    // 2. Fetch Master Salary Configs
    const { data: cfgData } = await supabase.from('salary_config').select('*');
    if (cfgData) setSalaryConfigsList(cfgData);

    // 3. Fetch Recent Salary Payments directly
    fetchRecentPayments(stData || []);
  };

  const fetchRecentPayments = async (staffMap?: any[]) => {
    const sMap = staffMap && staffMap.length > 0 ? staffMap : staffList;

    const { data, error } = await supabase
      .from('salary_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      const merged = data.map((pay) => {
        const found = sMap.find((s) => s.id === pay.staff_id);
        return {
          ...pay,
          full_name: found ? found.full_name : 'Staff Member',
          registration_no: found ? found.registration_no : '-',
        };
      });
      setRecentPaymentsList(merged);
    }
  };

  // On Staff or Month Selection -> Check Paid Status & Sync Data
  const handleStaffSelect = async (sId: string, monthVal: string = salaryMonth) => {
    setSelectedStaffId(sId);
    if (!sId) {
      resetCalculations();
      setPaymentStatus('Pending');
      return;
    }

    // Check if Salary is Already Paid for this Month
    const { data: existingPay } = await supabase
      .from('salary_payments')
      .select('*')
      .eq('staff_id', sId)
      .eq('salary_month', monthVal);

    if (existingPay && existingPay.length > 0) {
      setPaymentStatus('Paid');
    } else {
      setPaymentStatus('Pending');
    }

    // Fetch Salary Config
    const config = salaryConfigsList.find((c) => c.staff_id === sId);
    const basic = config ? parseFloat(config.basic_salary) || 0 : 0;
    const allowed = config ? parseInt(config.allowed_leaves, 10) || 2 : 2;
    const arr = config ? parseFloat(config.arrears) || 0 : 0;

    setBasicSalary(basic);
    setAllowedLeaves(allowed);
    setPreviousArrears(arr);

    // Fetch Attendance Count for Selected Month
    const { data: attData } = await supabase
      .from('staff_attendance')
      .select('status')
      .eq('staff_id', sId)
      .eq('status', 'Absent');

    const absents = attData ? attData.length : 0;
    setTakenLeaves(absents);

    // Calculate Leave Deduction (per day rate = basic / 30)
    const extraLeaves = Math.max(0, absents - allowed);
    const perDayRate = basic > 0 ? basic / 30 : 0;
    const deduction = Math.round(extraLeaves * perDayRate);
    setLeaveDeduction(deduction);

    // Fetch Unpaid Advances
    const { data: advData } = await supabase
      .from('advance_salary')
      .select('amount')
      .eq('staff_id', sId)
      .eq('status', 'Pending');

    if (advData && advData.length > 0) {
      const totalAdv = advData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      setAdvanceDeducted(totalAdv);
    } else {
      setAdvanceDeducted(0);
    }
  };

  const resetCalculations = () => {
    setBasicSalary(0);
    setAllowedLeaves(2);
    setTakenLeaves(0);
    setLeaveDeduction(0);
    setAdvanceDeducted(0);
    setPreviousArrears(0);
    setMonthBonus('0');
  };

  // Final Net Salary Calculation
  const bonusVal = parseFloat(monthBonus) || 0;
  const netSalary = Math.max(
    0,
    basicSalary - leaveDeduction - advanceDeducted + previousArrears + bonusVal
  );

  // Submit Process Salary
  const handlePaySalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Select Staff Member',
        message: 'Please select a staff member to process monthly salary!',
      });
      return;
    }

    setLoading(true);

    const payload = {
      staff_id: selectedStaffId,
      salary_month: salaryMonth,
      basic_salary: basicSalary,
      taken_leaves: takenLeaves,
      leave_deduction: leaveDeduction,
      advance_deducted: advanceDeducted,
      bonus: bonusVal,
      arrears: previousArrears,
      net_paid: netSalary,
      net_salary: netSalary,
      payment_date: new Date().toISOString().split('T')[0],
    };

    const { error } = await supabase.from('salary_payments').insert([payload]);

    setLoading(false);

    if (error) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Payment Failed',
        message: error.message,
      });
      return;
    }

    const stObj = staffList.find((s) => s.id === selectedStaffId);

    setPopup({
      show: true,
      type: 'success',
      title: 'Salary Paid Successfully!',
      message: `Monthly salary of Rs. ${netSalary.toLocaleString()} paid to ${stObj?.full_name || 'Staff Member'}.`,
    });

    // Update Status & Refresh
    setPaymentStatus('Paid');
    fetchRecentPayments();
  };

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-5 text-left font-sans text-slate-900">
      
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
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-5">
        
        {/* Header with Status Badge */}
        <div className="border-b pb-3 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h2 className="text-lg md:text-xl font-black text-blue-900">
              Process Monthly Salary
            </h2>
            <p className="text-[11px] text-gray-500">
              All deductions, advances & attendance rules applied automatically
            </p>
          </div>

          {/* 🏷️ LIVE SALARY STATUS BADGE */}
          {selectedStaffId && (
            <div className={`px-4 py-1.5 rounded-full font-black text-xs border flex items-center gap-1.5 shadow-sm ${
              paymentStatus === 'Paid' 
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                : 'bg-amber-100 text-amber-900 border-amber-300'
            }`}>
              <span>{paymentStatus === 'Paid' ? '✓' : '⏳'}</span>
              <span>
                {paymentStatus === 'Paid' ? 'Status: PAID for this Month' : 'Status: PENDING'}
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handlePaySalary} className="space-y-4 text-xs">
          
          {/* Select Staff & Salary Month */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Select Staff Member</label>
              <select
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none text-blue-900 focus:border-blue-900"
                value={selectedStaffId}
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

            <div>
              <label className="block font-bold text-gray-700 mb-1">Salary Month</label>
              <input
                type="text"
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none text-blue-900 focus:border-blue-900"
                value={salaryMonth}
                onChange={(e) => {
                  setSalaryMonth(e.target.value);
                  if (selectedStaffId) handleStaffSelect(selectedStaffId, e.target.value);
                }}
              />
            </div>
          </div>

          {/* Auto-Synced Parameters Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border space-y-2">
            <span className="text-[10px] font-black text-gray-500 uppercase block tracking-wider">
              📊 Auto-Synced Parameters
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-xl border">
                <span className="text-[10px] text-gray-500 font-bold block">
                  Basic Salary
                </span>
                <b className="text-blue-950 text-xs font-mono">Rs. {basicSalary.toLocaleString()}</b>
              </div>

              <div className="bg-white p-2.5 rounded-xl border">
                <span className="text-[10px] text-gray-500 font-bold block">
                  Taken / Allowed Leaves
                </span>
                <b className="text-amber-800 text-xs font-mono">{takenLeaves} / {allowedLeaves} Days</b>
              </div>

              <div className="bg-white p-2.5 rounded-xl border">
                <span className="text-[10px] text-rose-700 font-bold block">
                  Leave Deduction
                </span>
                <b className="text-rose-700 text-xs font-mono">-Rs. {leaveDeduction.toLocaleString()}</b>
              </div>

              <div className="bg-white p-2.5 rounded-xl border">
                <span className="text-[10px] text-rose-700 font-bold block">
                  Advance Deducted
                </span>
                <b className="text-rose-700 text-xs font-mono">-Rs. {advanceDeducted.toLocaleString()}</b>
              </div>
            </div>
          </div>

          {/* Bonus & Previous Arrears Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Add Month Bonus (Optional)</label>
              <input
                type="number"
                placeholder="0"
                className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 outline-none text-emerald-800 focus:border-blue-900"
                value={monthBonus}
                onChange={(e) => setMonthBonus(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Previous Arrears</label>
              <div className="p-2.5 border rounded-xl font-mono font-black bg-slate-100 text-blue-900">
                Rs. {previousArrears.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Final Net Salary Banner */}
          <div className="bg-amber-100 border-2 border-amber-300 p-4 rounded-2xl text-center space-y-1">
            <span className="text-xs font-black text-amber-900 uppercase tracking-widest block">
              Final Net Salary To Pay
            </span>
            <h3 className="text-2xl md:text-3xl font-black text-amber-950 font-mono">
              Rs. {netSalary.toLocaleString()}
            </h3>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || paymentStatus === 'Paid'}
            className={`w-full p-3.5 rounded-2xl font-black text-xs transition shadow-md disabled:opacity-60 ${
              paymentStatus === 'Paid' 
                ? 'bg-emerald-800 text-white cursor-not-allowed' 
                : 'bg-blue-900 hover:bg-blue-800 text-white'
            }`}
          >
            {loading 
              ? 'Processing Salary...' 
              : paymentStatus === 'Paid'
              ? '✓ Salary Already Paid for this Month'
              : 'Confirm & Process Salary Payment'}
          </button>

        </form>

        {/* Recent Salary Payments Log */}
        <div className="border-t pt-4 space-y-3">
          <h3 className="text-xs font-black text-blue-900 uppercase tracking-wider">
            Recent Salary Payments Log ({recentPaymentsList.length})
          </h3>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {recentPaymentsList.map((item) => (
              <div key={item.id} className="p-3 bg-slate-50 rounded-2xl border flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-extrabold text-gray-900">
                    👨‍🏫 {item.full_name} <span className="text-gray-400 font-normal">({item.registration_no})</span>
                  </h4>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Month: <b className="text-blue-900">{item.salary_month}</b> | Date: {item.payment_date || item.created_at?.split('T')[0]}
                  </p>
                </div>

                <div className="text-right font-mono font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                  Rs. {parseFloat(item.net_paid || item.net_salary || 0).toLocaleString()}
                </div>
              </div>
            ))}

            {recentPaymentsList.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6 font-medium">
                No salary payments recorded in database yet.
              </p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}