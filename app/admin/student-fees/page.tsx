'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminStudentFeesPage() {
  const [loading, setLoading] = useState(true);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [concessions, setConcessions] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('August 2026');

  const [students, setStudents] = useState<any[]>([]);
  const [feeRecords, setFeeRecords] = useState<any[]>([]);

  // Collect Fee Modal & Receipt State
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  
  // Fee Amounts State
  const [baseClassFee, setBaseClassFee] = useState(0);
  const [studentDiscount, setStudentDiscount] = useState(0);
  const [netPayable, setNetPayable] = useState(0);
  const [alreadyPaidAmount, setAlreadyPaidAmount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  // Custom Reverse Fee Confirmation Modal State (Replaces browser confirm)
  const [reverseConfirmTarget, setReverseConfirmTarget] = useState<{ id: string; name: string } | null>(null);

  // Custom Notification Alert State
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

      // 2. Fetch Class Fee Structures
      const { data: structData } = await supabase.from('class_fee_structure').select('*');
      if (structData) setFeeStructures(structData);

      // 3. Fetch Student Fee Concessions / Discounts
      const { data: concData } = await supabase.from('student_fee_concessions').select('*');
      if (concData) setConcessions(concData);

      // 4. Fetch Active Students
      const { data: stData } = await supabase
        .from('students')
        .select('*, classes(class_name, section_name)')
        .eq('is_active', true)
        .order('roll_no', { ascending: true });
      if (stData) setStudents(stData);

      // 5. Fetch Existing Fee Collections from DB
      const { data: fData } = await supabase.from('fee_collections').select('*');
      if (fData) setFeeRecords(fData);
    } catch (err) {
      console.error('Error loading fees data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate exact monthly fee details
  const getStudentFeeDetails = (st: any) => {
    let base = 2000;
    if (st.monthly_fee && parseFloat(st.monthly_fee) > 0) {
      base = parseFloat(st.monthly_fee);
    } else {
      const struct = feeStructures.find((f) => f.class_id === st.class_id);
      if (struct && struct.tuition_fee) {
        base = parseFloat(struct.tuition_fee);
      }
    }

    const conc = concessions.find((c) => c.student_id === st.id);
    const disc = conc ? parseFloat(conc.discount_amount || 0) : 0;
    const net = Math.max(0, base - disc);

    return { baseFee: base, discount: disc, netPayable: net };
  };

  // Filter Students based on Class Dropdown & Search
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

  // Open Collect Fee Modal
  const handleOpenCollect = (studentItem: any) => {
    setSelectedStudent(studentItem);
    const { baseFee, discount, netPayable: net } = getStudentFeeDetails(studentItem);
    
    // Get already collected payments for this student in selected month
    const stPayments = feeRecords.filter(
      (rec) =>
        rec.student_id === studentItem.id &&
        (rec.fee_month === selectedMonth || rec.month_year === selectedMonth)
    );
    const paidSoFar = stPayments.reduce((sum, item) => sum + (parseFloat(item.amount_paid) || 0), 0);
    const remToPay = Math.max(0, net - paidSoFar);

    setBaseClassFee(baseFee);
    setStudentDiscount(discount);
    setNetPayable(net);
    setAlreadyPaidAmount(paidSoFar);
    setAmountPaid(remToPay);
    setPaymentMode('Cash');
    setIsSavedSuccess(false);
    
    // Auto Generate Invoice Number
    const generatedInvoice = `INV-${Date.now().toString().slice(-6)}-${studentItem.roll_no || '0'}`;
    setInvoiceNo(generatedInvoice);

    setShowCollectModal(true);
  };

  // Submit Fee Collection Record
  const handleSubmitCollectFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setSubmitting(true);
    setAlert(null);

    const totalAfterThisPayment = alreadyPaidAmount + amountPaid;
    const isFullyPaidNow = totalAfterThisPayment >= netPayable && netPayable > 0;

    const payload = {
      student_id: selectedStudent.id,
      fee_month: selectedMonth,
      total_payable: netPayable,
      amount_paid: amountPaid,
      trx_id: invoiceNo,
      payment_method: paymentMode,
      status: isFullyPaidNow ? 'Paid' : 'Unpaid',
    };

    const { error } = await supabase.from('fee_collections').insert([payload]);

    if (error) {
      setAlert({ type: 'error', msg: 'Fee Save Error: ' + error.message });
    } else {
      setIsSavedSuccess(true);
      const { data: updatedFees } = await supabase.from('fee_collections').select('*');
      if (updatedFees) setFeeRecords(updatedFees);
    }

    setSubmitting(false);
  };

  // REVERSE ALL FEE PAYMENTS FOR STUDENT IN THIS MONTH (Executed via UI Modal)
  const confirmExecuteReverseFee = async () => {
    if (!reverseConfirmTarget) return;

    const { id: studentId, name: studentName } = reverseConfirmTarget;
    setReverseConfirmTarget(null);

    const { error } = await supabase
      .from('fee_collections')
      .delete()
      .eq('student_id', studentId)
      .eq('fee_month', selectedMonth);

    if (error) {
      setAlert({ type: 'error', msg: 'Failed to reverse fee: ' + error.message });
    } else {
      setAlert({
        type: 'success',
        msg: `Fee collection for ${studentName} successfully reversed! Status set back to Pending.`,
      });

      // Refresh Fee Collections List
      const { data: updatedFees } = await supabase.from('fee_collections').select('*');
      if (updatedFees) setFeeRecords(updatedFees);
    }
  };

  // Send WhatsApp Receipt
  const handleSendWhatsApp = () => {
    if (!selectedStudent) return;

    let rawPhone = selectedStudent.whatsapp || selectedStudent.parent_phone || '';
    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');

    if (cleanPhone.startsWith('0')) {
      cleanPhone = '92' + cleanPhone.slice(1);
    }

    const currentTotalPaid = alreadyPaidAmount + amountPaid;
    const remaining = Math.max(0, netPayable - currentTotalPaid);

    const textMessage = `*NEW BRIGHT SCHOLARS SCIENCE ACADEMY* 🏫\n*FEE COLLECTION RECEIPT*\n-----------------------------------\n👤 *Student Name:* ${selectedStudent.full_name}\n👨‍👦 *Father Name:* ${selectedStudent.father_name || 'N/A'}\n📚 *Class:* ${selectedStudent.classes?.class_name || ''} (${selectedStudent.classes?.section_name || ''})\n📅 *Month:* ${selectedMonth}\n🧾 *Invoice No:* #${invoiceNo}\n-----------------------------------\n🏛️ *Class Base Fee:* Rs. ${baseClassFee.toLocaleString()}\n🎁 *Concession/Discount:* Rs. ${studentDiscount.toLocaleString()}\n💵 *Net Payable Fee:* Rs. ${netPayable.toLocaleString()}\n✅ *Amount Paid (Now):* Rs. ${amountPaid.toLocaleString()}\n📊 *Total Amount Received:* Rs. ${currentTotalPaid.toLocaleString()}\n⏳ *Remaining Balance:* Rs. ${remaining.toLocaleString()}\n💳 *Payment Method:* ${paymentMode}\n-----------------------------------\nThank you! New Bright Scholars Science Academy Karor.`;

    const encodedText = encodeURIComponent(textMessage);
    const whatsappUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(whatsappUrl, '_blank');
  };

  const newRemainingAfterInput = Math.max(0, netPayable - (alreadyPaidAmount + amountPaid));

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-bold text-gray-500 animate-pulse">
        Syncing Class Fee Structure, Concessions & Student Roster...
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-5 font-sans text-slate-900 pb-16">
      
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
                  <th className="p-3">Net Fee (After Disc.)</th>
                  <th className="p-3 text-center">Month Status</th>
                  <th className="p-3 text-center rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium text-slate-800">
                {filteredStudents.map((st) => {
                  const stPayments = feeRecords.filter(
                    (rec) =>
                      rec.student_id === st.id &&
                      (rec.fee_month === selectedMonth || rec.month_year === selectedMonth)
                  );

                  const totalPaidForSt = stPayments.reduce((sum, item) => sum + (parseFloat(item.amount_paid) || 0), 0);
                  const { baseFee, discount, netPayable: net } = getStudentFeeDetails(st);

                  const remainingAmount = Math.max(0, net - totalPaidForSt);
                  const isFullyPaid = totalPaidForSt >= net && net > 0;
                  const hasPayments = stPayments.length > 0;

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

                      <td className="p-3 font-bold font-mono">
                        <span className="text-emerald-800 font-black block">Rs. {net.toLocaleString()}</span>
                        {discount > 0 && (
                          <span className="text-[10px] text-rose-600 font-bold block">
                            (Base: {baseFee} - Disc: {discount})
                          </span>
                        )}
                      </td>

                      {/* MONTH STATUS BADGE */}
                      <td className="p-3 text-center">
                        {isFullyPaid ? (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-xl text-[11px] font-black inline-flex items-center gap-1 shadow-sm">
                            ✓ Paid (Rs. {totalPaidForSt.toLocaleString()})
                          </span>
                        ) : totalPaidForSt > 0 ? (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-xl text-[11px] font-black inline-flex items-center gap-1 shadow-sm">
                            ⏳ Pending (Rec: {totalPaidForSt} | Rem: {remainingAmount})
                          </span>
                        ) : (
                          <span className="bg-rose-100 text-rose-800 border border-rose-300 px-3 py-1 rounded-xl text-[11px] font-black inline-flex items-center gap-1 shadow-sm">
                            ✕ Unpaid
                          </span>
                        )}
                      </td>

                      {/* ACTION BUTTONS */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          
                          {/* COLLECT FEE BUTTON (LOCKED IF FULLY PAID) */}
                          {isFullyPaid ? (
                            <button
                              disabled
                              className="bg-slate-100 text-slate-400 font-bold px-3 py-1.5 rounded-xl text-xs border cursor-not-allowed flex items-center gap-1"
                            >
                              🔒 Paid & Locked
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenCollect(st)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1"
                            >
                              💳 Collect Fee
                            </button>
                          )}

                          {/* REVERSE FEE BUTTON */}
                          {hasPayments && (
                            <button
                              onClick={() => setReverseConfirmTarget({ id: st.id, name: st.full_name })}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-black px-2.5 py-1.5 rounded-xl text-xs transition shadow-sm flex items-center gap-1"
                              title="Reverse/Cancel Fee Payment"
                            >
                              <span>🔄</span>
                              <span>Reverse</span>
                            </button>
                          )}

                        </div>
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

      {/* 🚀 4. CUSTOM REVERSE FEE CONFIRMATION POPUP MODAL */}
      {reverseConfirmTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border-t-8 border-rose-600 text-center space-y-4 font-sans">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full mx-auto flex items-center justify-center text-3xl font-black shadow-inner">
              🔄
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">
                Confirm Fee Reversal
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Are you sure you want to reverse/cancel the recorded fee for <b className="text-blue-950 font-extrabold">{reverseConfirmTarget.name}</b> for {selectedMonth}?
              </p>
              <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-xl border border-rose-200 mt-2">
                This will delete the fee collection record and set the status back to Pending (Unpaid).
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReverseConfirmTarget(null)}
                className="flex-1 py-3 rounded-2xl text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmExecuteReverseFee}
                className="flex-1 py-3 rounded-2xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 transition shadow-md"
              >
                Yes, Reverse Fee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. FEE COLLECTION & RECEIPT POPUP MODAL */}
      {showCollectModal && selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border space-y-4">
            
            <div className="border-b pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-blue-950">
                  {isSavedSuccess ? '🎉 Fee Receipt Generated' : 'Record Student Fee Collection'}
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

            {!isSavedSuccess ? (
              <form onSubmit={handleSubmitCollectFee} className="space-y-3.5 text-xs">
                
                <div className="bg-blue-50 p-3 rounded-2xl border border-blue-200 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-blue-900 font-extrabold uppercase block">Student Details</span>
                    <p className="font-bold text-blue-950 text-sm">{selectedStudent.full_name}</p>
                    <p className="text-[11px] text-slate-600">
                      Class: {selectedStudent.classes?.class_name} ({selectedStudent.classes?.section_name}) | Roll #{selectedStudent.roll_no}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold block">Invoice No</span>
                    <span className="font-mono font-black text-blue-950 text-xs bg-white px-2 py-0.5 border rounded-lg shadow-sm">
                      #{invoiceNo}
                    </span>
                  </div>
                </div>

                {studentDiscount > 0 && (
                  <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex justify-between items-center text-amber-900 font-bold">
                    <span>🎁 Student Fee Concession:</span>
                    <span className="font-mono font-black text-rose-700">- Rs. {studentDiscount.toLocaleString()}</span>
                  </div>
                )}

                {alreadyPaidAmount > 0 && (
                  <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl flex justify-between items-center text-blue-900 font-bold">
                    <span>📊 Already Received Earlier:</span>
                    <span className="font-mono font-black text-blue-950">Rs. {alreadyPaidAmount.toLocaleString()}</span>
                  </div>
                )}

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

                {/* AMOUNTS BREAKDOWN GRID */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Net Payable</label>
                    <input
                      type="number"
                      required
                      readOnly
                      className="w-full p-2.5 border rounded-xl font-bold font-mono bg-slate-100 text-slate-900 outline-none"
                      value={netPayable}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Receiving</label>
                    <input
                      type="number"
                      required
                      className="w-full p-2.5 border rounded-xl font-bold font-mono bg-emerald-50 border-emerald-300 text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Remaining</label>
                    <input
                      type="number"
                      readOnly
                      className={`w-full p-2.5 border rounded-xl font-bold font-mono outline-none ${
                        newRemainingAfterInput > 0
                          ? 'bg-rose-50 text-rose-800 border-rose-300 font-black'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                      value={newRemainingAfterInput}
                    />
                  </div>
                </div>

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

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full p-3.5 bg-blue-950 hover:bg-blue-900 text-white rounded-2xl font-black text-xs transition shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Saving Fee Record...' : 'Confirm & Save Fee Payment'}
                </button>

              </form>
            ) : (
              <div className="space-y-4 text-center py-2 animate-fadeIn">
                
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
                  ✓
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-black text-emerald-900">
                    Fee Collected Successfully!
                  </h4>
                  <p className="text-xs text-gray-500 font-medium">
                    Fee record inserted into database successfully.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border text-left text-xs space-y-2 font-sans">
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-gray-500 font-bold">Invoice Number:</span>
                    <span className="font-mono font-black text-blue-950">#{invoiceNo}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-gray-500 font-bold">Student Name:</span>
                    <span className="font-bold text-slate-900">{selectedStudent.full_name}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-gray-500 font-bold">Class Base Fee:</span>
                    <span className="font-mono font-bold text-slate-800">Rs. {baseClassFee.toLocaleString()}</span>
                  </div>
                  {studentDiscount > 0 && (
                    <div className="flex justify-between border-b pb-1.5 text-rose-700">
                      <span className="font-bold">Fee Concession:</span>
                      <span className="font-mono font-bold">- Rs. {studentDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-gray-500 font-bold">Amount Paid (Now):</span>
                    <span className="font-mono font-extrabold text-emerald-700">Rs. {amountPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-bold">Remaining Balance:</span>
                    <span className={`font-mono font-bold ${newRemainingAfterInput > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                      Rs. {newRemainingAfterInput.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleSendWhatsApp}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs transition shadow-lg flex items-center justify-center gap-2"
                  >
                    <span className="text-base">💬</span>
                    <span>Send Fee Receipt on WhatsApp</span>
                  </button>

                  <button
                    onClick={() => setShowCollectModal(false)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition"
                  >
                    Done & Close Popup
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}