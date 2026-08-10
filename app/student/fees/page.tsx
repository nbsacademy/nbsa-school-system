'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function StudentFeesPage() {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [feeLedger, setFeeLedger] = useState<any[]>([]);

  // Online Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedFeeRecord, setSelectedFeeRecord] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('JazzCash');
  const [trxId, setTrxId] = useState('');
  const [paidAmountInput, setPaidAmountInput] = useState<number>(2500);
  const [submitting, setSubmitting] = useState(false);

  // Alert State
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    fetchStudentAndFeeLedger();
  }, []);

  const fetchStudentAndFeeLedger = async () => {
    setLoading(true);

    // 1. Get Logged-In Student
    const storedStudentId = localStorage.getItem('user_id');
    const storedRegNo = localStorage.getItem('user_reg_no') || localStorage.getItem('username');

    let studentRecord = null;

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
      const { data: fallback } = await supabase
        .from('students')
        .select('*, classes(class_name, section_name)')
        .limit(1)
        .maybeSingle();
      studentRecord = fallback;
    }

    if (studentRecord) {
      setStudent(studentRecord);

      // 2. Fetch Fee Records from Supabase
      const { data: feesData } = await supabase
        .from('fee_collections')
        .select('*')
        .eq('student_id', studentRecord.id)
        .order('created_at', { ascending: false });

      if (feesData && feesData.length > 0) {
        setFeeLedger(feesData);
      } else {
        // 🚀 AUTO GENERATE DEFAULT VOUCHER IF NONE EXISTS IN DB
        const currentMonthStr = 'August 2026';
        const newVoucher = {
          student_id: studentRecord.id,
          month_year: currentMonthStr,
          payable_amount: 2500,
          amount_paid: 0,
          status: 'Unpaid',
        };

        const { data: createdVoucher } = await supabase
          .from('fee_collections')
          .insert([newVoucher])
          .select();

        if (createdVoucher && createdVoucher.length > 0) {
          setFeeLedger(createdVoucher);
        } else {
          setFeeLedger([
            {
              id: 'temp-1',
              student_id: studentRecord.id,
              month_year: 'August 2026',
              payable_amount: 2500,
              amount_paid: 0,
              status: 'Unpaid',
            },
          ]);
        }
      }
    }

    setLoading(false);
  };

  // Open Online Payment Modal
  const handleOpenPayModal = (item: any) => {
    setSelectedFeeRecord(item);
    setPaidAmountInput(item.payable_amount || 2500);
    setTrxId('');
    setShowPayModal(true);
  };

  // Submit Online Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxId.trim()) {
      alert('Please enter Transaction ID (TRX ID)');
      return;
    }

    setSubmitting(true);

    if (selectedFeeRecord && student) {
      const payload = {
        student_id: student.id,
        month_year: selectedFeeRecord.month_year,
        payable_amount: selectedFeeRecord.payable_amount || 2500,
        amount_paid: paidAmountInput,
        transaction_id: trxId.trim(),
        payment_method: paymentMethod,
        status: 'Pending',
      };

      if (String(selectedFeeRecord.id).startsWith('temp')) {
        await supabase.from('fee_collections').insert([payload]);
      } else {
        await supabase.from('fee_collections').update(payload).eq('id', selectedFeeRecord.id);
      }

      setAlert({
        type: 'success',
        msg: `Transaction submitted! Status is now PENDING for ${selectedFeeRecord.month_year}. Admin will verify shortly.`,
      });

      // Refresh DB Data
      const { data: updatedFees } = await supabase
        .from('fee_collections')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false });

      if (updatedFees) setFeeLedger(updatedFees);
    }

    setSubmitting(false);
    setShowPayModal(false);
  };

  // 📊 CALCULATE STATS
  const totalPayable = feeLedger.reduce((sum, item) => sum + (Number(item.payable_amount) || 0), 0);
  const totalPaid = feeLedger
    .filter((item) => item.status === 'Paid')
    .reduce((sum, item) => sum + (Number(item.amount_paid) || 0), 0);
  const totalPending = totalPayable - totalPaid;

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-bold text-gray-500 animate-pulse">
        Loading Fee Portal...
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-6 font-sans">
      
      {/* 1. TOP HEADER TITLE */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-blue-950">Student Fee & Online Payment Portal</h2>
          <p className="text-xs text-gray-500 font-medium">View monthly fee status and submit online transaction details</p>
        </div>

        <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-4 py-1.5 rounded-full text-xs font-black shadow-sm flex items-center gap-1.5">
          <span>✓</span>
          <span>Account Status: Active</span>
        </div>
      </div>

      {alert && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold border ${
            alert.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {alert.type === 'error' ? '⚠️ ' : '✓ '} {alert.msg}
        </div>
      )}

      {/* 📊 2. FEE SUMMARY SUMMARY CARDS (TOTAL, PAID, PENDING) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        
        <div className="bg-white p-4 rounded-3xl border shadow-sm space-y-1">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
            TOTAL PAYABLE FEE
          </span>
          <b className="text-xl font-black font-mono text-blue-950 block">
            Rs. {totalPayable.toLocaleString()}
          </b>
          <span className="text-[10px] text-slate-400 font-bold">Total Monthly Charges</span>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-3xl shadow-sm space-y-1">
          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
            TOTAL PAID AMOUNT
          </span>
          <b className="text-xl font-black font-mono text-emerald-950 block">
            Rs. {totalPaid.toLocaleString()}
          </b>
          <span className="text-[10px] text-emerald-700 font-bold">✓ Successfully Cleared</span>
        </div>

        <div className="bg-rose-50 border border-rose-200 p-4 rounded-3xl shadow-sm space-y-1">
          <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider block">
            REMAINING / PENDING FEE
          </span>
          <b className="text-xl font-black font-mono text-rose-950 block">
            Rs. {totalPending.toLocaleString()}
          </b>
          <span className="text-[10px] text-rose-700 font-bold">⚠️ Due for Payment</span>
        </div>

      </div>

      {/* 3. ACADEMY ONLINE PAYMENT ACCOUNTS BANNER */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 text-white p-5 rounded-3xl shadow-md border border-blue-800 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
          💳 ACADEMY ONLINE PAYMENT ACCOUNTS
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-blue-200 font-bold block">JazzCash Account</span>
            <b className="text-sm font-black font-mono text-amber-300 block">0300-1234567</b>
            <span className="text-[10px] text-gray-300">New Bright Academy</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-blue-200 font-bold block">EasyPaisa Account</span>
            <b className="text-sm font-black font-mono text-emerald-300 block">0301-9876543</b>
            <span className="text-[10px] text-gray-300">New Bright Academy</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] text-blue-200 font-bold block">Meezan Bank Account</span>
            <b className="text-sm font-black font-mono text-sky-300 block">0102-0109988776</b>
            <span className="text-[10px] text-gray-300">Title: Academy Service</span>
          </div>
        </div>
      </div>

      {/* 4. MONTHLY FEE LEDGER TABLE */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        
        <div className="border-b pb-3 flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">
            MONTHLY FEE LEDGER ({feeLedger.length})
          </h3>
          <span className="text-[11px] text-gray-500 font-bold">
            Student: <b className="text-blue-900">{student?.full_name || '-'}</b> ({student?.registration_no || student?.admission_no || '-'})
          </span>
        </div>

        {feeLedger.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-700 font-black">
                  <th className="p-3 rounded-l-xl">#</th>
                  <th className="p-3">Month</th>
                  <th className="p-3">Payable Amount</th>
                  <th className="p-3">Amount Paid</th>
                  <th className="p-3">Transaction ID</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-slate-800">
                {feeLedger.map((row, idx) => {
                  const st = (row.status || 'Unpaid').trim();

                  return (
                    <tr key={row.id || idx} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold font-mono">{idx + 1}</td>
                      <td className="p-3 font-black text-blue-950">{row.month_year}</td>
                      <td className="p-3 font-bold font-mono">Rs. {row.payable_amount || 2500}</td>
                      <td className="p-3 font-bold font-mono">Rs. {row.amount_paid || 0}</td>
                      <td className="p-3 font-mono font-bold text-gray-600">
                        {row.transaction_id || '-'}
                      </td>

                      {/* STATUS BADGES */}
                      <td className="p-3 text-center">
                        {st === 'Paid' && (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-xl text-[11px] font-black inline-flex items-center gap-1 shadow-sm">
                            ✓ Paid
                          </span>
                        )}

                        {st === 'Pending' && (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-xl text-[11px] font-black inline-flex items-center gap-1 shadow-sm animate-pulse">
                            ⏳ Pending
                          </span>
                        )}

                        {st === 'Unpaid' && (
                          <span className="bg-rose-100 text-rose-800 border border-rose-300 px-3 py-1 rounded-xl text-[11px] font-black inline-flex items-center gap-1 shadow-sm">
                            ✕ Unpaid
                          </span>
                        )}
                      </td>

                      {/* ACTION BUTTONS */}
                      <td className="p-3 text-center">
                        {st === 'Unpaid' && (
                          <button
                            type="button"
                            onClick={() => handleOpenPayModal(row)}
                            className="bg-blue-900 hover:bg-blue-800 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs transition shadow-sm"
                          >
                            💳 Pay Online
                          </button>
                        )}

                        {st === 'Pending' && (
                          <span className="text-[10px] text-gray-400 font-bold italic">
                            Approval Pending
                          </span>
                        )}

                        {st === 'Paid' && (
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-xl text-xs border transition"
                          >
                            📄 Receipt
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-xs text-gray-400 font-bold bg-slate-50 rounded-2xl border border-dashed">
            No fee vouchers found.
          </div>
        )}

      </div>

      {/* 5. PAY ONLINE POPUP MODAL */}
      {showPayModal && selectedFeeRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border space-y-4">
            
            <div className="border-b pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-blue-950">
                  Submit Online Fee Payment
                </h3>
                <p className="text-xs text-gray-500 font-bold">
                  Month: <b className="text-blue-900">{selectedFeeRecord.month_year}</b>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
              
              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Payment Method</label>
                <select
                  className="w-full p-3 border rounded-xl font-bold bg-slate-50 text-blue-900 outline-none"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="JazzCash">JazzCash (0300-1234567)</option>
                  <option value="EasyPaisa">EasyPaisa (0301-9876543)</option>
                  <option value="Bank Transfer">Meezan Bank (0102-0109988776)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Amount Paid (Rs.)</label>
                <input
                  type="number"
                  required
                  className="w-full p-3 border rounded-xl font-bold font-mono bg-slate-50 text-slate-900 outline-none"
                  value={paidAmountInput}
                  onChange={(e) => setPaidAmountInput(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Transaction ID (TRX ID) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TRX-99882211 or 01293848"
                  className="w-full p-3 border rounded-xl font-bold font-mono bg-slate-50 text-blue-950 outline-none focus:border-blue-700"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                />
                <p className="text-[10px] text-gray-400 font-medium mt-1">
                  Enter the confirmation TRX ID received in SMS after payment.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs transition shadow-md"
              >
                {submitting ? 'Submitting Payment...' : 'Submit Transaction Details for Verification'}
              </button>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}