'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function FeeDirectoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Active Tab: 'pending' or 'paid'
  const [activeTab, setActiveTab] = useState<'pending' | 'paid'>('pending');

  // Class Filter & Search States
  const [classesList, setClassesList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState('August 2026');

  // Live Data States
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [concessions, setConcessions] = useState<any[]>([]);

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
    fetchFeeDirectoryData();
  }, []);

  const fetchFeeDirectoryData = async () => {
    setLoading(true);

    try {
      // 1. Fetch Classes
      const { data: cData } = await supabase.from('classes').select('*').order('class_name');
      if (cData) setClassesList(cData);

      // 2. Fetch Active Students
      const { data: stData } = await supabase
        .from('students')
        .select('*, classes:class_id(class_name, section_name)')
        .eq('is_active', true)
        .order('roll_no', { ascending: true });

      // 3. Fetch Fee Collections for Current Month
      const { data: feeData } = await supabase.from('fee_collections').select('*');

      // 4. Fetch Configured Fee Structures
      const { data: structData } = await supabase.from('class_fee_structure').select('*');

      // 5. Fetch Student Fee Concessions / Discounts
      const { data: concData } = await supabase.from('student_fee_concessions').select('*');

      setStudentsList(stData || []);
      setFeeRecords(feeData || []);
      setFeeStructures(structData || []);
      setConcessions(concData || []);
    } catch (err) {
      console.error('Error fetching fee directory:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate student exact net payable fee
  const getStudentNetPayable = (st: any) => {
    let base = 2000;
    if (st.monthly_fee && parseFloat(st.monthly_fee) > 0) {
      base = parseFloat(st.monthly_fee);
    } else {
      const struct = feeStructures.find((f) => f.class_id === st.class_id);
      if (struct && struct.tuition_fee) base = parseFloat(struct.tuition_fee);
    }

    const conc = concessions.find((c) => c.student_id === st.id);
    const disc = conc ? parseFloat(conc.discount_amount || 0) : 0;

    return Math.max(0, base - disc);
  };

  // Filter students by selected Class Dropdown
  const filteredStudents = studentsList.filter((st) => {
    return selectedClassId === 'all' || st.class_id === selectedClassId;
  });

  // Calculate stats directly during render (prevents useEffect infinite loop warning)
  let paidCount = 0;
  let paidAmount = 0;
  let pendingCount = 0;
  let pendingAmount = 0;

  filteredStudents.forEach((st) => {
    const netFee = getStudentNetPayable(st);

    const rec = feeRecords.find(
      (c) =>
        c.student_id === st.id &&
        (c.fee_month === selectedMonth || c.month_year === selectedMonth) &&
        c.status === 'Paid'
    );

    if (rec) {
      paidCount++;
      paidAmount += parseFloat(rec.amount_paid || netFee);
    } else {
      pendingCount++;
      pendingAmount += netFee;
    }
  });

  // Direct Redirect to Fee Collection Page
  const handleCollectFeeRedirect = (studentId: string) => {
    router.push(`/admin/student-fees?student_id=${studentId}`);
  };

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-5 text-left font-sans text-slate-900 pb-16">
      
      {/* CUSTOM POPUP MODAL */}
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

      {/* Main Header Container */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        
        <div className="border-b pb-3 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h2 className="text-lg md:text-xl font-black text-blue-950">
              Fee Directory & Recovery Status
            </h2>
            <p className="text-[11px] text-gray-500 font-medium">
              Track class-wise paid and pending student fees for current session
            </p>
          </div>

          <span className="bg-blue-950 text-white font-extrabold text-xs px-3.5 py-1 rounded-full shadow-sm">
            Session 2026
          </span>
        </div>

        {/* CLASS FILTER & MONTH DROPDOWN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border">
          <div>
            <label className="block text-[11px] font-black text-slate-700 mb-1">
              Filter by Class Section
            </label>
            <select
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold outline-none text-blue-950"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="all">All Classes ({studentsList.length} Students)</option>
              {classesList.map((c) => {
                const count = studentsList.filter((s) => s.class_id === c.id).length;
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
              Selected Fee Month
            </label>
            <input
              type="text"
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold outline-none text-blue-950 font-mono"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
        </div>

        {/* Live Summary Stat Cards (Class-Wise Dynamic) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Paid Card */}
          <div className="bg-emerald-50/80 p-4.5 rounded-2xl border border-emerald-200 flex justify-between items-center shadow-sm">
            <div className="space-y-1">
              <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider block">
                CLASS PAID STUDENTS
              </span>
              <h3 className="text-xl font-black text-emerald-950 font-mono">
                {paidCount} <span className="text-xs font-bold text-emerald-800">(Rs. {paidAmount.toLocaleString()})</span>
              </h3>
            </div>
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-md">
              ✓
            </div>
          </div>

          {/* Pending Card */}
          <div className="bg-rose-50/80 p-4.5 rounded-2xl border border-rose-200 flex justify-between items-center shadow-sm">
            <div className="space-y-1">
              <span className="text-[11px] font-black text-rose-800 uppercase tracking-wider block">
                CLASS PENDING STUDENTS
              </span>
              <h3 className="text-xl font-black text-rose-950 font-mono">
                {pendingCount} <span className="text-xs font-bold text-rose-800">(Rs. {pendingAmount.toLocaleString()})</span>
              </h3>
            </div>
            <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-md">
              ⏳
            </div>
          </div>

        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition ${
              activeTab === 'pending' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            ⏳ Pending Fees ({pendingCount})
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('paid')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition ${
              activeTab === 'paid' ? 'bg-emerald-700 text-white shadow-md' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            ✓ Paid Fees ({paidCount})
          </button>
        </div>

        {/* Directory List Area */}
        <div className="space-y-2 pt-2">
          {loading ? (
            <p className="text-xs text-gray-400 text-center py-12 font-medium animate-pulse">
              Syncing Class Fee Directory...
            </p>
          ) : (
            <>
              {filteredStudents.map((student) => {
                const netFee = getStudentNetPayable(student);
                const rec = feeRecords.find(
                  (c) =>
                    c.student_id === student.id &&
                    (c.fee_month === selectedMonth || c.month_year === selectedMonth) &&
                    c.status === 'Paid'
                );

                const isPaid = !!rec;

                // Filter based on activeTab
                if (activeTab === 'pending' && isPaid) return null;
                if (activeTab === 'paid' && !isPaid) return null;

                const displayAmount = isPaid ? parseFloat(rec.amount_paid || netFee) : netFee;

                return (
                  <div key={student.id} className="p-3.5 bg-slate-50 rounded-2xl border flex items-center justify-between flex-wrap gap-2 hover:bg-slate-100 transition">
                    
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${
                        isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {isPaid ? '✓' : '⏳'}
                      </div>

                      <div>
                        <h4 className="font-extrabold text-xs text-blue-950">
                          {student.full_name} <span className="text-gray-500 font-mono font-medium">({student.admission_no || 'N/A'})</span>
                        </h4>
                        <p className="text-[11px] text-gray-500 font-medium">
                          S/O: <b>{student.father_name || 'N/A'}</b> | Class: <b>{student.classes?.class_name || 'Class'} ({student.classes?.section_name || 'Section'})</b> | Roll: <b>{student.roll_no || '-'}</b>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs">
                        <span className="text-[10px] font-bold text-gray-400 block uppercase">
                          {isPaid ? 'Paid Amount' : 'Payable Amount'}
                        </span>
                        <b className={isPaid ? 'text-emerald-700 font-mono text-sm' : 'text-rose-700 font-mono text-sm'}>
                          Rs. {displayAmount.toLocaleString()}
                        </b>
                      </div>

                      {!isPaid && (
                        <button
                          onClick={() => handleCollectFeeRedirect(student.id)}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black px-3.5 py-2 rounded-xl transition shadow-sm"
                        >
                          💳 Collect Fee
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}

              {((activeTab === 'pending' && pendingCount === 0) || (activeTab === 'paid' && paidCount === 0)) && (
                <p className="text-xs text-gray-400 text-center py-12 font-medium">
                  {activeTab === 'pending' ? 'No pending fee records found for this class!' : 'No paid fee records found for this class!'}
                </p>
              )}
            </>
          )}
        </div>

      </div>

    </div>
  );
}