'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface MessageState {
  type: 'success' | 'error';
  msg: string;
}

export default function StudentFeesPage() {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [feeHistory, setFeeHistory] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  // Payment Form States
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [trxId, setTrxId] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [receiptPhoto, setReceiptPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<MessageState | null>(null);

  useEffect(() => {
    fetchStudentFeeDetails();
  }, []);

  const fetchStudentFeeDetails = async () => {
    setLoading(true);

    const storedStudentId = localStorage.getItem('user_id');
    const storedRegNo = localStorage.getItem('user_reg_no') || localStorage.getItem('username');

    let studentRecord: any = null;

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

      // Fetch Fee Vouchers
      const { data: feesData } = await supabase
        .from('student_fees')
        .select('*')
        .eq('student_id', studentRecord.id)
        .order('created_at', { ascending: false });

      if (feesData) {
        setFeeHistory(feesData);
      }

      // Fetch Academy Payment Bank Accounts
      const { data: accData } = await supabase
        .from('payment_accounts')
        .select('*')
        .eq('is_active', true);

      if (accData) {
        setBankAccounts(accData);
        if (accData.length > 0) {
          setPaymentMethod(accData[0].bank_name || 'Easypaisa');
        }
      }
    }

    setLoading(false);
  };

  // Submit Online Payment Receipt
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVoucher) {
      setFormMessage({ type: 'error', msg: 'Please select a fee voucher to pay.' });
      return;
    }

    if (!trxId.trim() || !amountPaid) {
      setFormMessage({ type: 'error', msg: 'Please fill in Transaction TRX ID and Amount.' });
      return;
    }

    setSubmitting(true);
    setFormMessage(null);

    let receiptUrl = '';

    // Upload receipt photo if attached
    if (receiptPhoto) {
      const fileExt = receiptPhoto.name.split('.').pop();
      const fileName = `receipts/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('fee_receipts')
        .upload(fileName, receiptPhoto);

      if (!uploadErr && uploadData) {
        const { data: pubUrlData } = supabase.storage
          .from('fee_receipts')
          .getPublicUrl(fileName);
        receiptUrl = pubUrlData.publicUrl;
      }
    }

    // Insert pending payment approval record
    const { error: insertErr } = await supabase
      .from('fee_payments')
      .insert([
        {
          fee_id: selectedVoucher.id,
          student_id: student.id,
          amount_paid: Number(amountPaid),
          payment_method: paymentMethod,
          transaction_id: trxId.trim(),
          receipt_photo_url: receiptUrl,
          status: 'Pending',
        },
      ]);

    if (insertErr) {
      setFormMessage({ type: 'error', msg: insertErr.message || 'Payment submission failed.' });
    } else {
      setFormMessage({ type: 'success', msg: 'Payment receipt submitted successfully! Pending admin approval.' });
      setTrxId('');
      setAmountPaid('');
      setReceiptPhoto(null);
      setSelectedVoucher(null);
      fetchStudentFeeDetails();
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-bold text-gray-500 animate-pulse">
        Loading Student Fee Vouchers...
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-6 font-sans">
      
      {/* HEADER SECTION */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-blue-950">
            Fees & Online Payment Portal
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            View monthly fee vouchers and submit online payment proof
          </p>
        </div>

        <span className="bg-blue-50 text-blue-900 border border-blue-200 px-4 py-1.5 rounded-full text-xs font-black shadow-sm">
          Student: {student?.full_name || 'Student'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. FEE VOUCHERS LIST */}
        <div className="lg:col-span-2 bg-white p-5 rounded-3xl shadow-sm border space-y-4">
          <div className="border-b pb-3 flex justify-between items-center">
            <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">
              MY FEE VOUCHERS ({feeHistory.length})
            </h3>
            <span className="text-[11px] font-bold text-gray-400">
              Class: {student?.classes?.class_name || '9th'}
            </span>
          </div>

          {feeHistory.length > 0 ? (
            <div className="space-y-3">
              {feeHistory.map((fee) => {
                const isPaid = fee.status === 'Paid';
                const isPending = fee.status === 'Pending Verification';

                return (
                  <div
                    key={fee.id}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition shadow-sm ${
                      selectedVoucher?.id === fee.id
                        ? 'border-blue-950 bg-blue-50/50'
                        : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-900 text-white text-[10px] font-black px-2.5 py-0.5 rounded-lg font-mono">
                          {fee.fee_month || 'Monthly Fee'}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPending
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {fee.status || 'Unpaid'}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-blue-950 text-sm">
                        Total Payable Fee: Rs. {fee.total_amount || fee.amount || 0}
                      </h4>
                      <p className="text-[11px] text-gray-500 font-medium">
                        Due Date: {fee.due_date || 'End of Month'}
                      </p>
                    </div>

                    {!isPaid && (
                      <button
                        onClick={() => setSelectedVoucher(fee)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition shadow-sm ${
                          selectedVoucher?.id === fee.id
                            ? 'bg-blue-950 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {selectedVoucher?.id === fee.id ? 'Selected' : 'Pay Online'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-gray-400 font-bold bg-slate-50 rounded-2xl border border-dashed">
              No fee vouchers issued for your account yet.
            </div>
          )}
        </div>

        {/* 2. SUBMIT ONLINE PAYMENT FORM */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4 h-fit">
          <div className="border-b pb-3">
            <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">
              ONLINE FEE PAYMENT
            </h3>
            <p className="text-[11px] text-gray-500 font-medium">
              Submit Easypaisa/JazzCash TRX ID & receipt
            </p>
          </div>

          {/* Bank Accounts Info Box */}
          {bankAccounts.length > 0 && (
            <div className="bg-slate-900 text-white p-3.5 rounded-2xl text-xs space-y-2 border border-slate-800">
              <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider block">
                ACADEMY PAYMENT ACCOUNTS
              </span>
              {bankAccounts.map((acc, i) => (
                <div key={i} className="border-b border-slate-800 pb-1.5 last:border-b-0 last:pb-0">
                  <p className="font-bold text-white">{acc.bank_name}: <b className="font-mono text-sky-300">{acc.account_number}</b></p>
                  <p className="text-[10px] text-slate-400">Title: {acc.account_title}</p>
                </div>
              ))}
            </div>
          )}

          {formMessage && (
            <div
              className={`p-3 rounded-2xl text-xs font-black border ${
                formMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              {formMessage.msg}
            </div>
          )}

          <form onSubmit={handlePaymentSubmit} className="space-y-3.5 text-xs font-semibold">
            <div>
              <label className="block text-slate-700 mb-1">Selected Voucher</label>
              <input
                type="text"
                readOnly
                value={
                  selectedVoucher
                    ? `${selectedVoucher.fee_month || 'Fee'} - Rs. ${selectedVoucher.total_amount || selectedVoucher.amount}`
                    : 'Click "Pay Online" on a voucher'
                }
                className="w-full p-2.5 bg-slate-100 border rounded-xl font-bold text-slate-800 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-slate-900"
              >
                <option value="Easypaisa">Easypaisa</option>
                <option value="JazzCash">JazzCash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 mb-1">Transaction ID (TRX ID)</label>
              <input
                type="text"
                placeholder="e.g. 02938481923"
                value={trxId}
                onChange={(e) => setTrxId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono font-bold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1">Amount Paid (PKR)</label>
              <input
                type="number"
                placeholder="e.g. 3500"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono font-bold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1">Attach Receipt Screenshot (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setReceiptPhoto(e.target.files ? e.target.files[0] : null)}
                className="w-full p-2 bg-slate-50 border rounded-xl text-[11px] text-slate-600"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl transition shadow-md disabled:opacity-50"
            >
              {submitting ? 'Submitting Receipt...' : 'Submit Payment Proof'}
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}