'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function FeeDirectoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Active Tab: 'pending' or 'paid'
  const [activeTab, setActiveTab] = useState<'pending' | 'paid'>('pending');

  // Live Data States
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);

  // Calculated Stats
  const [totalPaidCount, setTotalPaidCount] = useState(0);
  const [totalPaidAmount, setTotalPaidAmount] = useState(0);
  const [totalPendingCount, setTotalPendingCount] = useState(0);
  const [totalPendingAmount, setTotalPendingAmount] = useState(0);

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

    // 1. Fetch Active Students
    const { data: stData } = await supabase
      .from('students')
      .select('*, classes:class_id(class_name, section_name)')
      .eq('is_active', true);

    // 2. Fetch Fee Collections for Current Session/Month
    const { data: feeData } = await supabase.from('fee_collections').select('*');

    // 3. Fetch Configured Fee Structures
    const { data: structData } = await supabase.from('class_fee_structure').select('*');

    const students = stData || [];
    const collections = feeData || [];
    const structures = structData || [];

    setStudentsList(students);
    setFeeRecords(collections);
    setFeeStructures(structures);

    // Calculate Paid vs Pending
    let paidCnt = 0;
    let paidAmt = 0;
    let pendingCnt = 0;
    let pendingAmt = 0;

    students.forEach((st) => {
      // Find payments for this student
      const stPayments = collections.filter((c) => c.student_id === st.id);
      const totalPaidForSt = stPayments.reduce((sum, item) => sum + (parseFloat(item.amount_paid) || 0), 0);

      // Get monthly fee from student or class structure
      const classStruct = structures.find((s) => s.class_id === st.class_id);
      const monthlyFee = st.monthly_fee ? parseFloat(st.monthly_fee) : classStruct ? parseFloat(classStruct.tuition_fee) : 2500;

      if (totalPaidForSt >= monthlyFee && monthlyFee > 0) {
        paidCnt++;
        paidAmt += totalPaidForSt;
      } else {
        pendingCnt++;
        const remaining = Math.max(0, monthlyFee - totalPaidForSt);
        pendingAmt += remaining;
      }
    });

    setTotalPaidCount(paidCnt);
    setTotalPaidAmount(paidAmt);
    setTotalPendingCount(pendingCnt);
    setTotalPendingAmount(pendingAmt);

    setLoading(false);
  };

  // Direct Redirect to Fee Collection Page with Selected Student
  const handleCollectFeeRedirect = (studentId: string) => {
    router.push(`/admin/student-fees?student_id=${studentId}`);
  };

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-5 text-left font-sans text-slate-900">
      
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

      {/* Main Header Container */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        <div className="border-b pb-2 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h2 className="text-lg md:text-xl font-black text-blue-900">
              Fee Directory & Recovery Status
            </h2>
            <p className="text-[11px] text-gray-500">
              Track paid and pending student fees for current session
            </p>
          </div>
          <span className="bg-slate-100 text-gray-700 font-extrabold text-xs px-3.5 py-1 rounded-full border">
            Session 2026
          </span>
        </div>

        {/* Live Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Paid Card */}
          <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 flex justify-between items-center">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                TOTAL PAID STUDENTS
              </span>
              <h3 className="text-xl font-black text-emerald-950 font-mono">
                {totalPaidCount} <span className="text-xs font-normal text-emerald-800">(Rs. {totalPaidAmount.toLocaleString()})</span>
              </h3>
            </div>
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-md">
              ✓
            </div>
          </div>

          {/* Pending Card */}
          <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200 flex justify-between items-center">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                TOTAL PENDING STUDENTS
              </span>
              <h3 className="text-xl font-black text-rose-950 font-mono">
                {totalPendingCount} <span className="text-xs font-normal text-rose-800">(Rs. {totalPendingAmount.toLocaleString()})</span>
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
              activeTab === 'pending' ? 'bg-rose-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ⏳ Pending Fees ({totalPendingCount})
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('paid')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition ${
              activeTab === 'paid' ? 'bg-emerald-700 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ✓ Paid Fees ({totalPaidCount})
          </button>
        </div>

        {/* Directory List Area */}
        <div className="space-y-2 pt-2">
          {loading ? (
            <p className="text-xs text-gray-400 text-center py-12 font-medium">Loading Live Fee Directory...</p>
          ) : (
            <>
              {studentsList.map((student) => {
                const stPayments = feeRecords.filter((c) => c.student_id === student.id);
                const totalPaidForSt = stPayments.reduce((sum, item) => sum + (parseFloat(item.amount_paid) || 0), 0);

                const classStruct = feeStructures.find((s) => s.class_id === student.class_id);
                const expectedFee = student.monthly_fee ? parseFloat(student.monthly_fee) : classStruct ? parseFloat(classStruct.tuition_fee) : 2500;

                const isPaid = totalPaidForSt >= expectedFee && expectedFee > 0;

                // Filter based on selected activeTab
                if (activeTab === 'pending' && isPaid) return null;
                if (activeTab === 'paid' && !isPaid) return null;

                const remainingAmount = Math.max(0, expectedFee - totalPaidForSt);

                return (
                  <div key={student.id} className="p-3 bg-slate-50 rounded-2xl border flex items-center justify-between flex-wrap gap-2">
                    
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                        isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {isPaid ? '✓' : '⏳'}
                      </div>

                      <div>
                        <h4 className="font-extrabold text-xs text-blue-950">
                          {student.full_name} <span className="text-gray-500 font-normal">({student.registration_no})</span>
                        </h4>
                        <p className="text-[11px] text-gray-500 font-medium">
                          Class: <b>{student.classes?.class_name || 'Class'} ({student.classes?.section_name || 'A'})</b> | Roll: <b>{student.roll_no || '-'}</b>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs">
                        <span className="text-[10px] font-bold text-gray-400 block uppercase">
                          {isPaid ? 'Paid Amount' : 'Payable Amount'}
                        </span>
                        <b className={isPaid ? 'text-emerald-700 font-mono text-sm' : 'text-rose-700 font-mono text-sm'}>
                          Rs. {isPaid ? totalPaidForSt.toLocaleString() : remainingAmount.toLocaleString()}
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

              {((activeTab === 'pending' && totalPendingCount === 0) || (activeTab === 'paid' && totalPaidCount === 0)) && (
                <p className="text-xs text-gray-400 text-center py-12 font-medium">
                  {activeTab === 'pending' ? 'No pending fee records found!' : 'No paid fee records found!'}
                </p>
              )}
            </>
          )}
        </div>

      </div>

    </div>
  );
}