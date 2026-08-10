'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminStudentFeesPage() {
  const [loading, setLoading] = useState(true);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [feeRecords, setFeeRecords] = useState<any[]>([]);

  // Collect Fee Modal State
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [feeMonth, setFeeMonth] = useState('August 2026');
  const [payableAmount, setPayableAmount] = useState(2500);
  const [amountPaid, setAmountPaid] = useState(2500);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [trxId, setTrxId] = useState('CASH-HAND');
  const [submitting, setSubmitting] = useState(false);
  
  // Alert State
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    loadClassesAndFees();
  }, []);

  const loadClassesAndFees = async () => {
    setLoading(true);

    // 1. Fetch Classes
    const { data: cData } = await supabase.from('classes').select('*').order('class_name');
    if (cData) setClassesList(cData);

    // 2. Fetch Students
    const { data: stData } = await supabase
      .from('students')
      .select('*, classes(class_name, section_name)')
      .order('full_name');
    if (stData) setStudents(stData);

    // 3. Fetch Fee Collections
    const { data: fData } = await supabase
      .from('fee_collections')
      .select('*, students(full_name, registration_no, admission_no, roll_no, classes(class_name, section_name))')
      .order('created_at', { ascending: false });
    if (fData) setFeeRecords(fData);

    setLoading(false);
  };

  // Filter Fee Collections based on search & class
  const filteredFees = feeRecords.filter((rec) => {
    const stName = (rec.students?.full_name || '').toLowerCase();
    const regNo = (rec.students?.registration_no || rec.students?.admission_no || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch = !q || stName.includes(q) || regNo.includes(q);
    const matchesClass = selectedClassId === 'all' || rec.students?.class_id === selectedClassId;

    return matchesSearch && matchesClass;
  });

  // Open Collect Fee Modal
  const handleOpenCollect = (studentItem: any) => {
    setSelectedStudent(studentItem);
    setFeeMonth('August 2026');
    setPayableAmount(2500);
    setAmountPaid(2500);
    setPaymentMode('Cash');
    setTrxId('CASH-HAND');
    setShowCollectModal(true);
  };

  // Submit Fee Collection Record
  const handleSubmitCollectFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setSubmitting(true);

    const payload = {
      student_id: selectedStudent.id,
      month_year: feeMonth,
      payable_amount: payableAmount,
      amount_paid: amountPaid,
      transaction_id: trxId.trim() || 'CASH-REC',
      payment_method: paymentMode,
      status: amountPaid >= payableAmount ? 'Paid' : 'Unpaid',
    };

    const { error } = await supabase.from('fee_collections').insert([payload]);

    if (error) {
      setAlert({ type: 'error', msg: error.message });
    } else {
      setAlert({
        type: 'success',
        msg: `Fee collection recorded successfully for ${selectedStudent.full_name}!`,
      });

      // Refresh DB
      const { data: updatedFees } = await supabase
        .from('fee_collections')
        .select('*, students(full_name, registration_no, admission_no, roll_no, classes(class_name, section_name))')
        .order('created_at', { ascending: false });
      if (updatedFees) setFeeRecords(updatedFees);
    }

    setSubmitting(false);
    setShowCollectModal(false);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-bold text-gray-500 animate-pulse">
        Loading Admin Student Fees Control...
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-6 font-sans">
      
      {/* 1. TOP HEADER SECTION */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-blue-950">
            Student Fee Collection & Ledger Management
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Collect fees, issue vouchers, and view student fee status
          </p>
        </div>

        <button
          onClick={loadClassesAndFees}
          className="bg-blue-950 hover:bg-blue-900 text-white text-xs font-black px-4 py-2 rounded-xl transition shadow-md"
        >
          🔄 Refresh Fee Ledger
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

      {/* 2. FILTERS & MANUAL FEE RECEIPT BUTTON */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="w-full sm:w-1/2">
            <input
              type="text"
              placeholder="Search by Student Name or Reg / Admission No..."
              className="w-full p-3 rounded-2xl border border-slate-300 bg-slate-50 text-xs font-bold outline-none focus:border-blue-900 transition"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Class Filter */}
          <div className="w-full sm:w-auto flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Filter Class:</span>
            <select
              className="p-3 rounded-2xl border border-slate-300 bg-slate-50 text-xs font-bold outline-none text-blue-950"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="all">All Classes</option>
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_name} ({c.section_name || 'A'})
                </option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* 3. FEE COLLECTIONS TABLE */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        
        <div className="border-b pb-3 flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">
            FEE TRANSACTIONS LEDGER ({filteredFees.length})
          </h3>
          
          <button
            onClick={() => handleOpenCollect(students[0] || null)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs transition shadow-sm"
          >
            💳 Collect Manual Fee
          </button>
        </div>

        {filteredFees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-700 font-black">
                  <th className="p-3 rounded-l-xl">#</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">Month</th>
                  <th className="p-3">Payable</th>
                  <th className="p-3">Paid</th>
                  <th className="p-3">TRX ID / Mode</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center rounded-r-xl">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-slate-800">
                {filteredFees.map((row, idx) => {
                  const st = (row.status || 'Unpaid').trim();

                  return (
                    <tr key={row.id || idx} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold font-mono">{idx + 1}</td>
                      <td className="p-3">
                        <b className="font-extrabold text-blue-950 block">{row.students?.full_name || 'Student'}</b>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {row.students?.registration_no || row.students?.admission_no}
                        </span>
                      </td>

                      <td className="p-3 font-bold text-slate-700">
                        {row.students?.classes?.class_name || '-'}
                      </td>

                      <td className="p-3 font-black text-blue-950">{row.month_year}</td>
                      <td className="p-3 font-bold font-mono">Rs. {row.payable_amount || 2500}</td>
                      <td className="p-3 font-bold font-mono text-emerald-700">Rs. {row.amount_paid || 0}</td>
                      
                      <td className="p-3 font-mono font-bold text-slate-600">
                        {row.transaction_id || '-'} ({row.payment_method || 'Cash'})
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

                      <td className="p-3 text-center">
                        <button
                          onClick={() => window.print()}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-xl text-xs border transition"
                        >
                          📄 Print
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-xs text-gray-400 font-bold bg-slate-50 rounded-2xl border border-dashed">
            No fee records found in Supabase database.
          </div>
        )}

      </div>

      {/* 4. MANUAL FEE COLLECTION MODAL */}
      {showCollectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border space-y-4">
            
            <div className="border-b pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-blue-950">
                  Record Student Fee Collection
                </h3>
                <p className="text-xs text-gray-500 font-bold">
                  Enter fee details for academy records
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCollectModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCollectFee} className="space-y-4 text-xs">
              
              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Student</label>
                <select
                  className="w-full p-3 border rounded-xl font-bold bg-slate-50 text-blue-950 outline-none"
                  value={selectedStudent?.id || ''}
                  onChange={(e) => {
                    const found = students.find((s) => s.id === e.target.value);
                    if (found) setSelectedStudent(found);
                  }}
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.registration_no || s.admission_no}) - {s.classes?.class_name || 'Class'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Fee Month</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. August 2026"
                  className="w-full p-3 border rounded-xl font-bold bg-slate-50 text-slate-900 outline-none"
                  value={feeMonth}
                  onChange={(e) => setFeeMonth(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Payable (Rs.)</label>
                  <input
                    type="number"
                    required
                    className="w-full p-3 border rounded-xl font-bold font-mono bg-slate-50 text-slate-900 outline-none"
                    value={payableAmount}
                    onChange={(e) => setPayableAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Amount Paid (Rs.)</label>
                  <input
                    type="number"
                    required
                    className="w-full p-3 border rounded-xl font-bold font-mono bg-slate-50 text-emerald-800 outline-none"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Payment Method</label>
                  <select
                    className="w-full p-3 border rounded-xl font-bold bg-slate-50 text-slate-900 outline-none"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                  >
                    <option value="Cash">Cash Handover</option>
                    <option value="JazzCash">JazzCash</option>
                    <option value="EasyPaisa">EasyPaisa</option>
                    <option value="Bank Transfer">Bank Deposit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Receipt / TRX No</label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 border rounded-xl font-bold font-mono bg-slate-50 text-slate-900 outline-none"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full p-3.5 bg-blue-950 hover:bg-blue-900 text-white rounded-2xl font-black text-xs transition shadow-md"
              >
                {submitting ? 'Saving Fee Record...' : 'Save & Clear Student Fee'}
              </button>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}