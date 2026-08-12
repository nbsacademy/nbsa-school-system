'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function PaySalaryPage() {
  const [loading, setLoading] = useState(false);

  // Live Database States
  const [staffList, setStaffList] = useState<any[]>([]);
  const [salaryConfigs, setSalaryConfigs] = useState<any[]>([]);
  const [salaryLogs, setSalaryLogs] = useState<any[]>([]);

  // Form Inputs
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [salaryMonth, setSalaryMonth] = useState('August 2026');

  // Auto Calculated & Synced States
  const [basicSalary, setBasicSalary] = useState(0);
  const [allowedLeaves, setAllowedLeaves] = useState(2);
  const [takenLeaves, setTakenLeaves] = useState(0);
  const [leaveDeduction, setLeaveDeduction] = useState(0);
  const [advanceDeducted, setAdvanceDeducted] = useState(0);
  const [previousArrears, setPreviousArrears] = useState(0);
  const [bonusAmount, setBonusAmount] = useState('0');

  // Amounts & Payment Status Calculation States
  const [netPayable, setNetPayable] = useState(0);
  const [cashPaidSoFar, setCashPaidSoFar] = useState(0);
  const [amountPaying, setAmountPaying] = useState('0');
  const [paymentMethod, setPaymentMode] = useState('Cash');

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

      // 2. Fetch Master Salary Configs
      const { data: cfgData } = await supabase.from('salary_config').select('*');
      if (cfgData) setSalaryConfigs(cfgData);

      // 3. Fetch Recent Salary Payment Logs from DB
      fetchSalaryLogs(stData || []);
    } catch (err) {
      console.error('Error fetching salary initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaryLogs = async (currentStaff?: any[]) => {
    const staffToMap = currentStaff && currentStaff.length > 0 ? currentStaff : staffList;

    const { data: logsData, error } = await supabase
      .from('salary_payments')
      .select('*')
      .order('payment_date', { ascending: false });

    if (!error && logsData) {
      const mergedData = logsData.map((item) => {
        const foundStaff = staffToMap.find((s) => s.id === item.staff_id);
        return {
          ...item,
          full_name: foundStaff ? foundStaff.full_name : 'Staff Member',
          registration_no: foundStaff ? foundStaff.registration_no : '-',
          role: foundStaff ? foundStaff.role : 'Staff',
          phone: foundStaff ? foundStaff.phone || foundStaff.whatsapp : '',
        };
      });
      setSalaryLogs(mergedData);
    }
  };

  // Helper to normalize month string for comparison (e.g., "August 2026", "2026-08", "august 2026")
  const isMonthMatch = (m1: string, m2: string) => {
    if (!m1 || !m2) return false;
    const s1 = String(m1).toLowerCase().trim();
    const s2 = String(m2).toLowerCase().trim();
    return s1 === s2 || s1.includes('august') && s2.includes('august') || s1.includes('2026-08') && s2.includes('2026-08');
  };

  // Staff Selection Handler
  const handleStaffSelect = async (staffId: string) => {
    setSelectedStaffId(staffId);

    if (!staffId) {
      resetCalculations();
      return;
    }

    // 1. Find Salary Config
    const cfg = salaryConfigs.find((c) => c.staff_id === staffId);
    const basic = cfg?.basic_salary ? parseFloat(cfg.basic_salary) : 0;
    const allowedL = cfg?.allowed_leaves ? parseInt(cfg.allowed_leaves, 10) : 2;
    const arrears = cfg?.arrears ? parseFloat(cfg.arrears) : 0;

    setBasicSalary(basic);
    setAllowedLeaves(allowedL);
    setPreviousArrears(arrears);

    // 2. Fetch Payments Already Disbursed for this staff
    const { data: existingPayments } = await supabase
      .from('salary_payments')
      .select('*')
      .eq('staff_id', staffId);

    const monthPayments = existingPayments
      ? existingPayments.filter((p) => isMonthMatch(p.salary_month, salaryMonth) || isMonthMatch(p.month_year, salaryMonth))
      : [];

    const cashPaid = monthPayments.reduce(
      (sum, item) => sum + (parseFloat(item.net_paid || item.net_salary) || 0),
      0
    );

    setCashPaidSoFar(cashPaid);

    // 3. Calculate Un-deducted Advances (or advances already deducted in this month)
    let totalAdv = 0;
    if (monthPayments && monthPayments.length > 0) {
      totalAdv = monthPayments.reduce((sum, item) => sum + (parseFloat(item.advance_deducted) || 0), 0);
    } else {
      const { data: advData } = await supabase
        .from('advance_salary')
        .select('amount')
        .eq('staff_id', staffId)
        .eq('is_deducted', false);

      totalAdv = advData
        ? advData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
        : 0;
    }

    setAdvanceDeducted(totalAdv);

    // 4. Fetch Leave Deductions
    const { data: attData } = await supabase
      .from('staff_attendance')
      .select('status')
      .eq('staff_id', staffId)
      .eq('status', 'Absent');

    const totalAbsents = attData ? attData.length : 0;
    setTakenLeaves(totalAbsents);

    const extraLeaves = Math.max(0, totalAbsents - allowedL);
    const perDaySalary = basic > 0 ? basic / 30 : 0;
    const leaveDed = Math.round(extraLeaves * perDaySalary);

    setLeaveDeduction(leaveDed);

    // Calculate Net Payable Cash Salary: (Basic + Arrears + Bonus) - (Leave Deduction + Advance)
    const bonus = parseFloat(bonusAmount) || 0;
    const net = Math.max(0, basic + arrears + bonus - leaveDed - totalAdv);

    setNetPayable(net);

    const remainingCashToPay = Math.max(0, net - cashPaid);
    setAmountPaying(remainingCashToPay.toString());
  };

  // Recalculate when Bonus or Month changes
  useEffect(() => {
    if (!selectedStaffId) return;
    handleStaffSelect(selectedStaffId);
  }, [salaryMonth, bonusAmount]);

  const resetCalculations = () => {
    setBasicSalary(0);
    setAllowedLeaves(2);
    setTakenLeaves(0);
    setLeaveDeduction(0);
    setAdvanceDeducted(0);
    setPreviousArrears(0);
    setBonusAmount('0');
    setNetPayable(0);
    setCashPaidSoFar(0);
    setAmountPaying('0');
  };

  // Submit Salary Payment Handler
  const handlePaySalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStaffId) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Select Staff Required',
        message: 'Please select a staff member to process salary!',
      });
      return;
    }

    // Safety check against duplicate payment
    if (cashPaidSoFar > 0 || isStaffFullyPaid) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Already Disbursed',
        message: 'Salary for this month has already been disbursed for this staff member!',
      });
      return;
    }

    const paying = parseFloat(amountPaying) || 0;
    if (paying <= 0) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Invalid Amount',
        message: 'Paying salary amount must be greater than 0!',
      });
      return;
    }

    setLoading(true);

    const bonus = parseFloat(bonusAmount) || 0;
    const totalCashAfterThis = cashPaidSoFar + paying;
    const isFullyPaidNow = (totalCashAfterThis + advanceDeducted) >= (basicSalary + previousArrears + bonus - leaveDeduction);
    const remainingArrears = Math.max(0, netPayable - totalCashAfterThis);

    const todayDate = new Date().toISOString().split('T')[0];

    const payload = {
      staff_id: selectedStaffId,
      salary_month: salaryMonth,
      basic_salary: basicSalary,
      leave_deduction: leaveDeduction,
      advance_deducted: advanceDeducted,
      bonus: bonus,
      arrears: previousArrears,
      net_salary: netPayable,
      net_paid: paying,
      status: 'Paid',
      payment_date: todayDate,
    };

    const { error } = await supabase.from('salary_payments').insert([payload]);

    if (error) {
      setLoading(false);
      setPopup({
        show: true,
        type: 'error',
        title: 'Payment Failed',
        message: error.message,
      });
      return;
    }

    // Mark advance entries as deducted
    if (advanceDeducted > 0) {
      await supabase
        .from('advance_salary')
        .update({ is_deducted: true })
        .eq('staff_id', selectedStaffId)
        .eq('is_deducted', false);
    }

    // Update remaining arrears in salary_config
    await supabase
      .from('salary_config')
      .update({ arrears: remainingArrears, updated_at: new Date().toISOString() })
      .eq('staff_id', selectedStaffId);

    setLoading(false);

    setPopup({
      show: true,
      type: 'success',
      title: 'Salary Disbursed Successfully!',
      message: `Cash salary of Rs. ${paying.toLocaleString()} disbursed. Salary for ${salaryMonth} is now LOCKED.`,
    });

    // Reset Form
    setSelectedStaffId('');
    resetCalculations();

    // Refresh Logs
    fetchSalaryLogs();
  };

  // Reverse Salary Payment
  const handleDeleteSalaryLog = async (id: string) => {
    if (!confirm('Are you sure you want to delete/reverse this salary payment entry?')) return;

    const { error } = await supabase.from('salary_payments').delete().eq('id', id);

    if (!error) {
      setPopup({
        show: true,
        type: 'success',
        title: 'Reversed Successfully',
        message: 'Salary payment entry removed from database and unlocked.',
      });
      fetchSalaryLogs();
      if (selectedStaffId) handleStaffSelect(selectedStaffId);
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

    const cashAmt = parseFloat(item.net_paid || item.net_salary || 0);
    const advAmt = parseFloat(item.advance_deducted || 0);
    const totalBenefit = cashAmt + advAmt;

    const textMessage = `*NEW BRIGHT SCHOLARS SCIENCE ACADEMY* 🏫\n*SALARY PAYMENT RECEIPT*\n-----------------------------------\n👤 *Staff Name:* ${item.full_name}\n💼 *Role:* ${item.role}\n📅 *Salary Month:* ${item.salary_month}\n-----------------------------------\n🏛️ *Basic Salary:* Rs. ${parseFloat(item.basic_salary || 0).toLocaleString()}\n🎁 *Bonus:* Rs. ${parseFloat(item.bonus || 0).toLocaleString()}\n💼 *Previous Arrears:* Rs. ${parseFloat(item.arrears || 0).toLocaleString()}\n🔻 *Leave Deduction:* Rs. ${parseFloat(item.leave_deduction || 0).toLocaleString()}\n-----------------------------------\n💸 *Advance Deducted:* Rs. ${advAmt.toLocaleString()}\n💵 *Cash Handover Paid:* Rs. ${cashAmt.toLocaleString()}\n✅ *Total Cleared Value:* Rs. ${totalBenefit.toLocaleString()}\n-----------------------------------\nThank you! New Bright Scholars Science Academy.`;

    const encodedText = encodeURIComponent(textMessage);
    const whatsappUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(whatsappUrl, '_blank');
  };

  // ABSOLUTE LOCK CONDITION: If ANY cash payment exists for staff in this month, or cash + adv >= basic
  const isStaffFullyPaid = cashPaidSoFar > 0 || (cashPaidSoFar + advanceDeducted) >= basicSalary && basicSalary > 0;
  const remainingArrearsAfterInput = Math.max(0, netPayable - (cashPaidSoFar + (parseFloat(amountPaying) || 0)));

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
              Staff Salary Disbursement & Payroll
            </h2>
            <p className="text-[11px] text-gray-500 font-medium">
              Disburse monthly salary, auto-deduct attendance/advances, and add arrears
            </p>
          </div>

          <span className="bg-blue-950 text-white font-extrabold text-xs px-3.5 py-1 rounded-full shadow-sm">
            Session 2026
          </span>
        </div>

        {/* PAY SALARY FORM */}
        <form onSubmit={handlePaySalarySubmit} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Select Staff Member</label>
              <select
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none text-blue-950 focus:border-blue-950"
                value={selectedStaffId}
                onChange={(e) => handleStaffSelect(e.target.value)}
                required
              >
                <option value="">-- Select Staff Member --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.registration_no || 'Reg #'}) - {s.role || 'Staff'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Salary Month</label>
              <input
                type="text"
                required
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none text-blue-950 font-mono"
                value={salaryMonth}
                onChange={(e) => setSalaryMonth(e.target.value)}
              />
            </div>
          </div>

          {/* AUTO-SYNCED PARAMETERS DISPLAY GRID */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border space-y-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
              ⚡ AUTO-SYNCED PARAMETERS (DATABASE)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
              <div className="bg-white p-2.5 rounded-xl border">
                <span className="text-[10px] font-sans text-gray-500 font-bold block">Basic Salary</span>
                <b className="text-emerald-700 text-xs font-black">Rs. {basicSalary.toLocaleString()}</b>
              </div>

              <div className="bg-white p-2.5 rounded-xl border">
                <span className="text-[10px] font-sans text-gray-500 font-bold block">Absents / Allowed</span>
                <b className="text-blue-900 text-xs font-black">{takenLeaves} / {allowedLeaves} Days</b>
              </div>

              <div className="bg-white p-2.5 rounded-xl border">
                <span className="text-[10px] font-sans text-gray-500 font-bold block">Leave Deduction</span>
                <b className="text-rose-700 text-xs font-black">Rs. {leaveDeduction.toLocaleString()}</b>
              </div>

              <div className="bg-white p-2.5 rounded-xl border">
                <span className="text-[10px] font-sans text-gray-500 font-bold block">Advance Deducted</span>
                <b className="text-amber-700 text-xs font-black">Rs. {advanceDeducted.toLocaleString()}</b>
              </div>
            </div>
          </div>

          {/* BONUS & PREVIOUS ARREARS INPUTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Add Month Bonus (Optional)</label>
              <input
                type="number"
                placeholder="0"
                disabled={isStaffFullyPaid}
                className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 outline-none text-emerald-800 disabled:opacity-50"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Previous Arrears (PKR)</label>
              <input
                type="number"
                placeholder="0"
                disabled={isStaffFullyPaid}
                className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 outline-none text-rose-800 disabled:opacity-50"
                value={previousArrears}
                onChange={(e) => setPreviousArrears(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* FINAL NET PAYABLE HIGHLIGHT BANNER & STATUS */}
          <div className="bg-amber-100/80 border-2 border-amber-300 p-4 rounded-2xl text-center space-y-1 shadow-sm">
            <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider block">
              FINAL NET PAYABLE CASH SALARY FOR {salaryMonth.toUpperCase()}
            </span>
            <h3 className="text-2xl md:text-3xl font-black text-amber-950 font-mono">
              Rs. {netPayable.toLocaleString()}
            </h3>

            {/* STATUS BADGE */}
            <div className="pt-1">
              {isStaffFullyPaid ? (
                <span className="bg-emerald-600 text-white font-black text-xs px-3.5 py-1 rounded-full shadow-sm inline-flex items-center gap-1">
                  ✓ Salary 100% Cleared & Paid (Cash: Rs. {cashPaidSoFar.toLocaleString()} | Adv: Rs. {advanceDeducted.toLocaleString()})
                </span>
              ) : cashPaidSoFar > 0 ? (
                <span className="bg-amber-600 text-white font-black text-xs px-3.5 py-1 rounded-full shadow-sm">
                  ⏳ Partial Paid (Cash: Rs. {cashPaidSoFar.toLocaleString()} | Remaining: Rs. {netPayable - cashPaidSoFar})
                </span>
              ) : (
                <span className="bg-rose-600 text-white font-black text-xs px-3.5 py-1 rounded-full shadow-sm">
                  ✕ Unpaid (Pending Full Salary)
                </span>
              )}
            </div>
          </div>

          {/* AMOUNT PAYING NOW & PAYMENT METHOD GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Amount Paying Now (PKR) *</label>
              <input
                type="number"
                required
                disabled={isStaffFullyPaid}
                className="w-full p-2.5 border rounded-xl font-mono font-black text-sm bg-emerald-50 border-emerald-300 text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                value={amountPaying}
                onChange={(e) => setAmountPaying(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Payment Method</label>
              <select
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none text-slate-900 disabled:opacity-50"
                value={paymentMethod}
                onChange={(e) => setPaymentMode(e.target.value)}
                disabled={isStaffFullyPaid}
              >
                <option value="Cash">Cash Handover</option>
                <option value="JazzCash">JazzCash</option>
                <option value="EasyPaisa">EasyPaisa</option>
                <option value="Bank Transfer">Bank Deposit</option>
              </select>
            </div>
          </div>

          {/* DISBURSE BUTTON / LOCKED STATE */}
          {isStaffFullyPaid ? (
            <button
              type="button"
              disabled
              className="w-full bg-slate-200 text-slate-500 p-3.5 rounded-2xl font-black border border-slate-300 cursor-not-allowed text-xs flex items-center justify-center gap-2"
            >
              <span>🔒</span>
              <span>Salary Fully Paid & Locked for {salaryMonth}</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white p-3.5 rounded-2xl font-black transition shadow-md disabled:opacity-50 text-xs flex items-center justify-center gap-2"
            >
              <span>✓</span>
              <span>{loading ? 'Disbursing Salary...' : 'Confirm & Disburse Staff Salary'}</span>
            </button>
          )}

        </form>

      </div>

      {/* RECENT SALARY PAYMENTS LOG TABLE */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        
        <div className="border-b pb-2 flex justify-between items-center">
          <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">
            RECENT SALARY PAYMENTS LOG ({salaryLogs.length})
          </h3>
          <button
            onClick={() => fetchSalaryLogs()}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-[10px] px-3 py-1 rounded-full border"
          >
            🔄 Refresh Logs
          </button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {salaryLogs.map((item) => {
            const cashAmt = parseFloat(item.net_paid || item.net_salary || 0);
            const advAmt = parseFloat(item.advance_deducted || 0);
            const totalBenefit = cashAmt + advAmt;

            return (
              <div key={item.id} className="p-3.5 bg-slate-50 rounded-2xl border flex items-center justify-between flex-wrap gap-2 hover:bg-slate-100 transition">
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-black text-base shrink-0 shadow-sm">
                    💵
                  </div>

                  <div>
                    <h4 className="font-extrabold text-xs text-blue-950 flex items-center gap-1.5">
                      {item.full_name} <span className="text-gray-500 font-mono font-normal">({item.registration_no})</span>
                    </h4>
                    <p className="text-[11px] text-gray-500 font-medium">
                      Month: <b>{item.salary_month}</b> | Role: <b>{item.role}</b> | Date: <b>{item.payment_date || '-'}</b>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right text-xs space-y-0.5">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">
                      Total Disbursed: <b className="text-emerald-800 font-mono text-xs">Rs. {totalBenefit.toLocaleString()}</b>
                    </span>
                    <div className="flex gap-1.5 font-mono text-[10px] font-bold">
                      <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-200">
                        Cash: Rs. {cashAmt.toLocaleString()}
                      </span>
                      {advAmt > 0 && (
                        <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200">
                          Adv: Rs. {advAmt.toLocaleString()}
                        </span>
                      )}
                    </div>
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
                      onClick={() => handleDeleteSalaryLog(item.id)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold px-2 py-1 rounded-xl text-[11px] transition font-mono"
                    >
                      Reverse
                    </button>
                  </div>
                </div>

              </div>
            );
          })}

          {salaryLogs.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-16 font-medium border border-dashed rounded-2xl">
              No salary payment records found in database yet.
            </p>
          )}
        </div>

      </div>

    </div>
  );
}