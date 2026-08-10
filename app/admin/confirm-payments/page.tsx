'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ConfirmOnlinePaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  // Fetch all fee submissions with 'Pending' status
  const fetchPendingPayments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fee_collections')
      .select('*, students(full_name, registration_no, admission_no, roll_no, classes(class_name, section_name))')
      .eq('status', 'Pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else if (data) {
      setPendingPayments(data);
    }
    setLoading(false);
  };

  // Approve Online Payment
  const handleApprove = async (id: string, month: string) => {
    setProcessingId(id);
    setAlert(null);

    const { error } = await supabase
      .from('fee_collections')
      .update({ status: 'Paid' })
      .eq('id', id);

    if (error) {
      setAlert({ type: 'error', msg: error.message });
    } else {
      setAlert({ type: 'success', msg: `Payment for ${month} approved successfully!` });
      fetchPendingPayments();
    }
    setProcessingId(null);
  };

  // Reject Invalid Payment
  const handleReject = async (id: string, month: string) => {
    setProcessingId(id);
    setAlert(null);

    const { error } = await supabase
      .from('fee_collections')
      .update({ status: 'Unpaid', transaction_id: null })
      .eq('id', id);

    if (error) {
      setAlert({ type: 'error', msg: error.message });
    } else {
      setAlert({ type: 'success', msg: `Payment request for ${month} rejected.` });
      fetchPendingPayments();
    }
    setProcessingId(null);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-bold text-gray-500 animate-pulse">
        Loading Pending Online Payments...
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-6 font-sans">
      
      {/* HEADER SECTION */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-blue-950">
            Confirm Online Fee Payments
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Verify student transaction IDs and approve fee receipts
          </p>
        </div>

        <button
          onClick={fetchPendingPayments}
          className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl transition border shadow-sm"
        >
          🔄 Refresh List
        </button>
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

      {/* PENDING TRANSACTIONS TABLE */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        <div className="border-b pb-3 flex justify-between items-center">
          <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">
            PENDING VERIFICATION REQUESTS ({pendingPayments.length})
          </h3>
        </div>

        {pendingPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-700 font-black">
                  <th className="p-3 rounded-l-xl">#</th>
                  <th className="p-3">Student Details</th>
                  <th className="p-3">Month</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Transaction ID (TRX)</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3 text-center rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-slate-800">
                {pendingPayments.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-bold font-mono">{idx + 1}</td>
                    
                    <td className="p-3">
                      <b className="font-extrabold text-blue-950 block">{row.students?.full_name || 'Student'}</b>
                      <span className="text-[10px] text-gray-500 font-mono">
                        Reg: {row.students?.registration_no || row.students?.admission_no} | Class: {row.students?.classes?.class_name || '-'}
                      </span>
                    </td>

                    <td className="p-3 font-bold text-slate-700">{row.month_year}</td>
                    
                    <td className="p-3">
                      <span className="bg-blue-50 text-blue-900 border border-blue-200 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                        {row.payment_method || 'Online'}
                      </span>
                    </td>

                    <td className="p-3 font-mono font-black text-amber-900 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 inline-block my-1">
                      {row.transaction_id || '-'}
                    </td>

                    <td className="p-3 font-black font-mono text-emerald-700 text-sm">
                      Rs. {row.amount_paid || row.payable_amount}
                    </td>

                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          disabled={processingId === row.id}
                          onClick={() => handleApprove(row.id, row.month_year)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1.5 rounded-xl text-xs transition shadow-sm"
                        >
                          ✓ Approve
                        </button>

                        <button
                          disabled={processingId === row.id}
                          onClick={() => handleReject(row.id, row.month_year)}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-black px-3 py-1.5 rounded-xl text-xs transition shadow-sm"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-xs text-gray-400 font-bold bg-slate-50 rounded-2xl border border-dashed">
            No pending online fee receipts for verification at the moment.
          </div>
        )}
      </div>

    </div>
  );
}