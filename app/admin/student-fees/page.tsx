'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminStudentFeesPage() {
  const [loading, setLoading] = useState(true);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('August 2026');

  const [students, setStudents] = useState<any[]>([]);
  const [feeRecords, setFeeRecords] = useState<any[]>([]);

  // Collect Fee Modal State
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [payableAmount, setPayableAmount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
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

    try {
      // 1. Fetch Classes
      const { data: cData } = await supabase.from('classes').select('*').order('class_name');
      if (cData) setClassesList(cData);

      // 2. Fetch Class Fee Structures (Gets Rs. 2000 setup from class_fee_structure)
      const { data: structData } = await supabase.from('class_fee_structure').select('*');
      if (structData) setFeeStructures(structData);

      // 3. Fetch Active Students with Class Details
      const { data: stData } = await supabase
        .from('students')
        .select('*, classes(class_name, section_name)')
        .eq('is_active', true)
        .order('roll_no', { ascending: true });
      if (stData) setStudents(stData);

      // 4. Fetch Existing Fee Collections from DB
      const { data: fData } = await supabase.from('fee_collections').select('*');
      if (fData) setFeeRecords(fData);
    } catch (err) {
      console.error('Error loading fees data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate exact monthly fee for a student
  const getStudentMonthlyFee = (st: any) => {
    if (st.monthly_fee && parseFloat(st.monthly_fee) > 0) {
      return parseFloat(st.monthly_fee);
    }
    // Match with class_fee_structure table
    const struct = feeStructures.find((f) => f.class_id === st.class_id);
    if (struct && struct.tuition_fee) {
      return parseFloat(struct.tuition_fee);
    }
    return 2000; // Fallback to class default 2000
  };

  // Filter Students based on Class Dropdown & Search (Name + Father Name)
  const filteredStudents = students.filter((st) => {
    const name = (st.full_name || '').toLowerCase();
    const father = (st.father_name || '').toLowerCase();
    const admNo = (st.admission_no || '').toLowerCase();
    const rollNo = String(st.roll_no || '');
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch = !q || name.includes(q) || father.includes(q) || admNo.includes(q) || rollNo.includes(q);
    const matchesClass = selectedClassId === 'all' || st.class_id === selectedClassId;

    return matchesSearch && matchesClass;
  });

  // Open Collect Fee Modal for Selected Student
  const handleOpenCollect = (studentItem: any) => {
    setSelectedStudent(studentItem);
    const exactFee = getStudentMonthlyFee(studentItem);
    setPayableAmount(exactFee);
    setAmountPaid(exactFee);
    setPaymentMode('Cash');
    setTrxId('CASH-HAND');
    setShowCollectModal(true);
  };

  // Submit Fee Collection Record to Supabase
  const handleSubmitCollectFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setSubmitting(true);

    const payload = {
      student_id: selectedStudent.id,
      fee_month: selectedMonth,
      total_payable: payableAmount,
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
        msg: `Fee collection of Rs. ${amountPaid} recorded successfully for ${selectedStudent.full_name}!`,
      });

      // Refresh Fee Collections List from DB
      const { data: updatedFees } = await supabase.from('fee_collections').select('*');
      if (updatedFees) setFeeRecords(updatedFees);
    }

    setSubmitting(false);
    setShowCollectModal(false);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-bold text-gray-500 animate-pulse">
        Syncing Class Fee Structure & Student Roster...
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-5 font-sans text-slate-900">
      
      {/* 1. HEADER SECTION */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-blue-950">
            Student Fee Collection & Ledger Management
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Class-wise fee collection, student search, and paid status verification
          </p>
        </div>

        <button
          onClick={loadClassesAndFees}
          className="bg-blue-950 hover:bg-blue-900 text-white text-xs font-black px-4 py-2 rounded-xl transition shadow-sm"
        >
          🔄 Refresh DB Ledger
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

      {/* 2. FILTERS */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-black text-slate-700 mb-1">
              Search Student / Father Name
            </label>
            <input
              type="text"
              placeholder="Type Student Name or Father Name..."
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold outline-none focus:border-blue-950 transition"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Class Filter Dropdown */}
          <div>
            <label className="block text-[11px] font-black text-slate-700 mb-1">
              Select Class Section
            </label>
            <select
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold outline-none text-blue-950"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="all">All Classes ({students.length} Students)</option>
              {classesList.map((c) => {
                const count = students.filter((s) => s.class_id === c.id).length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.class_name} ({c.section_name || 'Section'}) — {count} Students
                  </option>
                );
              })}
            </select>
          </div>

          {/* Fee Month Selector */}
          <div>
            <label className="block text-[11px] font-black text-slate-700 mb-1">
              Fee Month
            </label>
            <input
              type="text"
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold outline-none text-blue-950 font-mono"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>

        </div>
      </div>

      {/* 3. STUDENTS FEE LEDGER TABLE */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        
        <div className="border-b pb-3 flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">
            STUDENTS FEE ROSTER FOR {selectedMonth.toUpperCase()} ({filteredStudents.length} STUDENTS)
          </h3>
        </div>

        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-700 font-black">
                  <th className="p-3 rounded-l-xl">Roll #</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Father Name</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">DB Monthly Fee</th>
                  <th className="p-3 text-center">Month Status</th>
                  <th className="p-3 text-center rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-slate-800">
                {filteredStudents.map((st) => {
                  // Check if student has paid fee for the selected month in DB
                  const paidRecord = feeRecords.find(
                    (rec) =>
                      rec.student_id === st.id &&
                      (rec.fee_month === selectedMonth || rec.month_year === selectedMonth) &&
                      rec.status === 'Paid'
                  );

                  const isPaid = !!paidRecord;
                  const exactFee = getStudentMonthlyFee(st);

                  return (
                    <tr key={st.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold font-mono text-slate-600">
                        {st.roll_no || '-'}
                      </td>
                      
                      <td className="p-3">
                        <b className="font-extrabold text-blue-950 block">{st.full_name}</b>
                        <span className="text-[10px] text-gray-500 font-mono">
                          Adm #: {st.admission_no || 'N/A'}
                        </span>
                      </td>

                      <td className="p-3 font-bold text-slate-700">
                        {st.father_name || 'N/A'}
                      </td>

                      <td className="p-3 font-bold text-slate-700">
                        {st.classes?.class_name || 'Class'} ({st.classes?.section_name || 'Section'})
                      </td>

                      <td className="p-3 font-bold font-mono text-emerald-800">
                        Rs. {exactFee.toLocaleString()}
                      </td>

                      {/* MONTH STATUS BADGE */}
                      <td className="p-3 text-center">
                        {isPaid ? (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-xl text-[11px] font-black inline-flex items-center gap-1 shadow-sm">
                            ✓ Paid
                          </span>
                        ) : (
                          <span className="bg-rose-100 text-rose-800 border border-rose-300 px-3 py-1 rounded-xl text-[11px] font-black inline-flex items-center gap-1 shadow-sm">
                            ✕ Unpaid
                          </span>
                        )}
                      </td>

                      {/* ACTION BUTTON */}
                      <td className="p-3 text-center">
                        {isPaid ? (
                          <button
                            disabled
                            className="bg-slate-100 text-slate-400 font-bold px-3 py-1.5 rounded-xl text-xs border cursor-not-allowed"
                          >
                            🔒 Paid & Locked
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenCollect(st)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs transition shadow-sm"
                          >
                            💳 Collect Fee
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
          <div className="text-center py-16 text-xs text-gray-400 font-bold bg-slate-50 rounded-2xl border border-dashed">
            No students found for the selected class or search query.
          </div>
        )}

      </div>

      {/* 4. FEE COLLECTION MODAL */}
      {showCollectModal && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border space-y-4">
            
            <div className="border-b pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-blue-950">
                  Record Student Fee Collection
                </h3>
                <p className="text-xs text-gray-500 font-bold">
                  {selectedStudent.full_name} (S/O: {selectedStudent.father_name || 'N/A'})
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

            <form onSubmit={handleSubmitCollectFee} className="space-y-3.5 text-xs">
              
              <div className="bg-blue-50 p-3 rounded-2xl border border-blue-200">
                <span className="text-[10px] text-blue-900 font-extrabold uppercase block">Student Details</span>
                <p className="font-bold text-blue-950 text-sm">{selectedStudent.full_name}</p>
                <p className="text-[11px] text-slate-600">
                  Class: {selectedStudent.classes?.class_name} ({selectedStudent.classes?.section_name}) | Roll #{selectedStudent.roll_no}
                </p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Fee Month</label>
                <input
                  type="text"
                  required
                  readOnly
                  className="w-full p-2.5 border rounded-xl font-bold bg-slate-100 text-slate-800 outline-none font-mono"
                  value={selectedMonth}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Class Structure Fee (Rs.)</label>
                  <input
                    type="number"
                    required
                    className="w-full p-2.5 border rounded-xl font-bold font-mono bg-slate-50 text-slate-900 outline-none"
                    value={payableAmount}
                    onChange={(e) => setPayableAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Amount Receiving (Rs.)</label>
                  <input
                    type="number"
                    required
                    className="w-full p-2.5 border rounded-xl font-bold font-mono bg-slate-50 text-emerald-800 outline-none"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Payment Method</label>
                  <select
                    className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 text-slate-900 outline-none"
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
                    className="w-full p-2.5 border rounded-xl font-bold font-mono bg-slate-50 text-slate-900 outline-none"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full p-3.5 bg-blue-950 hover:bg-blue-900 text-white rounded-2xl font-black text-xs transition shadow-md disabled:opacity-50"
              >
                {submitting ? 'Saving Fee Record...' : 'Confirm & Clear Student Fee'}
              </button>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}