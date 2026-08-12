'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import CircularChart from '@/components/CircularChart';

export default function StatusCenterPage() {
  const [loading, setLoading] = useState(true);

  // Core Stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    studentPresentPercent: 0,
    totalStaff: 0,
    staffPresentPercent: 0,
    totalClasses: 0,
    pendingFees: 0,
    collectedFees: 0,
    totalExpenses: 0,
    netProfit: 0,
    feeCollectedPercent: 0,
    paidSalary: 0,
    pendingSalary: 0,
    salaryPaidPercent: 0,
    resignedStaff: 0,
  });

  // Data lists for Modals
  const [classesList, setClassesList] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Modal Control States
  const [activeModal, setActiveModal] = useState<'none' | 'students' | 'staff'>('none');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [staffFilter, setStaffFilter] = useState<'active' | 'resigned'>('active');

  // Detail View Modals
  const [viewStudent, setViewStudent] = useState<any | null>(null);
  const [viewStaff, setViewStaff] = useState<any | null>(null);

  useEffect(() => {
    fetchRealStats();
  }, []);

  const fetchRealStats = async () => {
    setLoading(true);

    try {
      // 1. Fetch Classes
      const { data: classesData } = await supabase.from('classes').select('*');
      setClassesList(classesData || []);

      // 2. Fetch Active Students
      const { data: studentsData } = await supabase
        .from('students')
        .select('*, classes(class_name, section_name)');
      setStudentsList(studentsData || []);

      const activeStudents = studentsData ? studentsData.filter((s) => s.is_active !== false) : [];

      // 3. Fetch Fee Structures & Concessions for Exact Calculations
      const { data: feeStructData } = await supabase.from('class_fee_structure').select('*');
      const { data: concessionsData } = await supabase.from('student_fee_concessions').select('*');
      const { data: collectionsData } = await supabase.from('fee_collections').select('*');

      // Calculate Total Expected Fee after Concessions
      let totalExpectedFees = 0;
      activeStudents.forEach((st) => {
        let baseFee = 2000;
        if (st.monthly_fee && parseFloat(st.monthly_fee) > 0) {
          baseFee = parseFloat(st.monthly_fee);
        } else if (feeStructData) {
          const struct = feeStructData.find((f) => f.class_id === st.class_id);
          if (struct && struct.tuition_fee) baseFee = parseFloat(struct.tuition_fee);
        }

        const conc = concessionsData?.find((c) => c.student_id === st.id);
        const discount = conc ? parseFloat(conc.discount_amount || 0) : 0;
        const netFee = Math.max(0, baseFee - discount);

        totalExpectedFees += netFee;
      });

      const totalCollected = collectionsData
        ? collectionsData.reduce((sum, item) => sum + (parseFloat(item.amount_paid) || 0), 0)
        : 0;

      const totalPendingFees = Math.max(0, totalExpectedFees - totalCollected);
      const feePercent = totalExpectedFees > 0 ? Math.round((totalCollected / totalExpectedFees) * 100) : 100;

      // 4. Fetch Expenses
      const { data: expensesData } = await supabase.from('expenses').select('amount');
      const totalExp = expensesData
        ? expensesData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
        : 0;

      // 5. Fetch Staff
      const { data: staffData } = await supabase.from('staff').select('*');
      setStaffList(staffData || []);

      const activeStaffCount = staffData?.filter((s) => s.is_active !== false).length || 0;
      const resignedStaffCount = staffData?.filter((s) => s.is_active === false).length || 0;

      // 6. Live Attendance Metrics
      const todayDate = new Date().toISOString().split('T')[0];
      
      // Staff Attendance Live Sync
      const { data: staffAtt } = await supabase.from('staff_attendance').select('status, date').or(`date.eq.${todayDate},created_at.gte.${todayDate}`);
      let staffPresencePercent = 0;
      if (staffAtt && staffAtt.length > 0) {
        const present = staffAtt.filter((a) => a.status === 'Present' || a.status === 'Late').length;
        staffPresencePercent = Math.round((present / staffAtt.length) * 100);
      }

      // Student Attendance Live Sync
      const { data: studentAtt } = await supabase.from('student_attendance').select('status, attendance_date').eq('attendance_date', todayDate);
      let studentPresencePercent = 0;
      if (studentAtt && studentAtt.length > 0) {
        const present = studentAtt.filter((a) => a.status === 'Present' || a.status === 'Late').length;
        studentPresencePercent = Math.round((present / studentAtt.length) * 100);
      } else {
        const { data: latestStudentAtt } = await supabase.from('student_attendance').select('status').order('created_at', { ascending: false }).limit(200);
        if (latestStudentAtt && latestStudentAtt.length > 0) {
          const present = latestStudentAtt.filter((a) => a.status === 'Present' || a.status === 'Late').length;
          studentPresencePercent = Math.round((present / latestStudentAtt.length) * 100);
        }
      }

      // 7. Regular Salaries + Advance Salaries Combined Calculation
      const { data: salaryData } = await supabase.from('salary_payments').select('net_paid, net_salary');
      const totalRegularSalaryPaid = salaryData
        ? salaryData.reduce((sum, item) => sum + (parseFloat(item.net_paid || item.net_salary) || 0), 0)
        : 0;

      // Fetch Advance Salaries Live
      const { data: advanceData } = await supabase.from('advance_salary').select('amount');
      const totalAdvanceSalaryPaid = advanceData
        ? advanceData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
        : 0;

      // Combined Total Paid Salary
      const totalSalaryPaid = totalRegularSalaryPaid + totalAdvanceSalaryPaid;

      const { data: salaryConfigs } = await supabase.from('salary_config').select('basic_salary');
      const totalExpectedSalary = salaryConfigs ? salaryConfigs.reduce((sum, item) => sum + (parseFloat(item.basic_salary) || 0), 0) : 0;

      const totalPendingSalary = Math.max(0, totalExpectedSalary - totalSalaryPaid);
      const salaryPercent = totalExpectedSalary > 0 ? Math.round((totalSalaryPaid / totalExpectedSalary) * 100) : 100;

      // Calculate Net Profit / Savings (Total Income - (Salaries + Advance + Expenses))
      const grandOutflow = totalSalaryPaid + totalExp;
      const profit = totalCollected - grandOutflow;

      setStats({
        totalStudents: activeStudents.length,
        studentPresentPercent: studentPresencePercent,
        totalStaff: activeStaffCount,
        staffPresentPercent: staffPresencePercent,
        totalClasses: classesData ? classesData.length : 0,
        collectedFees: totalCollected,
        pendingFees: totalPendingFees,
        totalExpenses: totalExp,
        netProfit: profit,
        feeCollectedPercent: Math.min(100, feePercent),
        paidSalary: totalSalaryPaid,
        pendingSalary: totalPendingSalary,
        salaryPaidPercent: Math.min(100, salaryPercent),
        resignedStaff: resignedStaffCount,
      });
    } catch (err) {
      console.error('Error fetching status center metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlockStudent = async (studentId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    const { error } = await supabase.from('students').update({ is_active: nextStatus }).eq('id', studentId);
    if (!error) {
      setStudentsList((prev) => prev.map((st) => (st.id === studentId ? { ...st, is_active: nextStatus } : st)));
      fetchRealStats();
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to PERMANENTLY delete this student?')) return;
    const { error } = await supabase.from('students').delete().eq('id', studentId);
    if (!error) {
      setStudentsList((prev) => prev.filter((st) => st.id !== studentId));
      if (viewStudent?.id === studentId) setViewStudent(null);
      fetchRealStats();
    }
  };

  const handleToggleBlockStaff = async (staffId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    const { error } = await supabase.from('staff').update({ is_active: nextStatus }).eq('id', staffId);
    if (!error) {
      setStaffList((prev) => prev.map((sf) => (sf.id === staffId ? { ...sf, is_active: nextStatus } : sf)));
      fetchRealStats();
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to PERMANENTLY delete this staff member?')) return;
    const { error } = await supabase.from('staff').delete().eq('id', staffId);
    if (!error) {
      setStaffList((prev) => prev.filter((sf) => sf.id !== staffId));
      if (viewStaff?.id === staffId) setViewStaff(null);
      fetchRealStats();
    }
  };

  const filteredStudents = selectedClassId ? studentsList.filter((s) => s.class_id === selectedClassId) : [];
  const filteredStaff = staffList.filter((s) => (staffFilter === 'active' ? s.is_active !== false : s.is_active === false));

  return (
    <div className="p-3 md:p-8 max-w-6xl mx-auto space-y-5 text-left font-sans text-slate-900 pb-16">
      
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-blue-950">Academy Status & Control Center</h2>
          <p className="text-xs text-gray-500 font-medium">Real-time overview of Students, Staff, Classes and Finance Status from Database</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <span className="text-[11px] font-bold text-amber-600 animate-pulse bg-amber-50 px-3 py-1 rounded-full border border-amber-200">Syncing Live DB...</span>}
          <span className="bg-blue-950 text-white px-3.5 py-1 rounded-full text-xs font-bold font-mono shadow-sm">Session 2026</span>
        </div>
      </div>

      {/* 💰 LIVE FINANCIAL HEALTH SUMMARY CARDS (INCOME, EXPENSES, PROFIT) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        
        {/* TOTAL INCOME (FEES) */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-emerald-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold text-emerald-800 block uppercase tracking-wider">Total Income (Fees)</span>
            <h3 className="text-2xl font-black text-emerald-600 font-mono mt-1">Rs. {stats.collectedFees.toLocaleString()}</h3>
          </div>
          <span className="text-3xl bg-emerald-50 p-3 rounded-2xl">💰</span>
        </div>

        {/* TOTAL EXPENSES */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-rose-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold text-rose-800 block uppercase tracking-wider">Total Expenses</span>
            <h3 className="text-2xl font-black text-rose-600 font-mono mt-1">Rs. {stats.totalExpenses.toLocaleString()}</h3>
          </div>
          <span className="text-3xl bg-rose-50 p-3 rounded-2xl">💸</span>
        </div>

        {/* NET PROFIT / SAVINGS */}
        <div className={`p-5 rounded-3xl shadow-sm border flex items-center justify-between ${stats.netProfit >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          <div>
            <span className="text-xs font-extrabold opacity-90 block uppercase tracking-wider">Net Profit / Savings</span>
            <h3 className="text-2xl font-black font-mono mt-1">Rs. {stats.netProfit.toLocaleString()}</h3>
          </div>
          <span className="text-3xl bg-white/20 p-3 rounded-2xl">📊</span>
        </div>

      </div>

      {/* Circular Progress Charts (2x2 Mobile Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <CircularChart percentage={stats.feeCollectedPercent} colorClass="bg-emerald-100 text-emerald-800" strokeColor="#059669" title="Fee Collection" subtitle={`Rs. ${stats.collectedFees.toLocaleString()} Collected`} icon="💳" />
        
        {/* LIVE STAFF ATTENDANCE LINK */}
        <Link href="/admin/staff_attendance">
          <CircularChart percentage={stats.staffPresentPercent} colorClass="bg-blue-100 text-blue-800" strokeColor="#1e3a8a" title="Staff Attendance" subtitle="Today Staff Presence" icon="👨‍🏫" />
        </Link>

        {/* LIVE STUDENT ATTENDANCE LINK */}
        <Link href="/admin/student_attendance">
          <CircularChart percentage={stats.studentPresentPercent} colorClass="bg-purple-100 text-purple-800" strokeColor="#7e22ce" title="Student Attendance" subtitle="Today Student Presence" icon="🎓" />
        </Link>

        {/* STAFF SALARY PAID (INCLUDES BOTH REGULAR & ADVANCE SALARIES) */}
        <CircularChart percentage={stats.salaryPaidPercent} colorClass="bg-amber-100 text-amber-800" strokeColor="#d97706" title="Staff Salary Paid" subtitle={`Rs. ${stats.paidSalary.toLocaleString()} Paid`} icon="💵" />
      </div>

      {/* Middle Overview Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
        
        {/* 1. TOTAL STUDENTS CARD */}
        <div onClick={() => { setActiveModal('students'); setSelectedClassId(null); }} className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:border-blue-900 cursor-pointer hover:shadow-md transition active:scale-[0.98]">
          <div className="flex justify-between items-center"><span className="text-xs font-black text-gray-500">Total Students</span><span className="text-2xl">🎓</span></div>
          <div className="mt-3">
            <h3 className="text-2xl md:text-3xl font-black text-blue-950 font-mono">{loading ? '...' : stats.totalStudents}</h3>
            <p className="text-[10px] text-emerald-600 font-extrabold mt-1 flex items-center gap-1"><span>Enrolled in Academy</span><span className="underline">View All →</span></p>
          </div>
        </div>

        {/* 2. ACTIVE STAFF CARD */}
        <div onClick={() => { setStaffFilter('active'); setActiveModal('staff'); }} className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:border-blue-900 cursor-pointer hover:shadow-md transition active:scale-[0.98]">
          <div className="flex justify-between items-center"><span className="text-xs font-black text-gray-500">Active Staff</span><span className="text-2xl">👨‍🏫</span></div>
          <div className="mt-3">
            <h3 className="text-2xl md:text-3xl font-black text-blue-950 font-mono">{loading ? '...' : stats.totalStaff}</h3>
            <p className="text-[10px] text-blue-600 font-extrabold mt-1 flex items-center gap-1"><span>Teachers & Admin</span><span className="underline">Manage →</span></p>
          </div>
        </div>

        {/* 3. TOTAL CLASSES CARD */}
        <Link href="/admin/fee-management" className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:border-blue-900 cursor-pointer hover:shadow-md transition active:scale-[0.98]">
          <div className="flex justify-between items-center"><span className="text-xs font-black text-gray-500">Total Classes</span><span className="text-2xl">🏫</span></div>
          <div className="mt-3">
            <h3 className="text-2xl md:text-3xl font-black text-blue-950 font-mono">{loading ? '...' : stats.totalClasses}</h3>
            <p className="text-[10px] text-purple-600 font-extrabold mt-1 flex items-center gap-1"><span>Configured Sections</span><span className="underline">Add/Edit →</span></p>
          </div>
        </Link>

        {/* 4. FEE COLLECTED CARD */}
        <Link href="/admin/student-fees" className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:border-emerald-600 cursor-pointer hover:shadow-md transition active:scale-[0.98]">
          <div className="flex justify-between items-center"><span className="text-xs font-black text-gray-500">Fee Collected</span><span className="text-2xl">💵</span></div>
          <div className="mt-3">
            <h3 className="text-lg md:text-2xl font-black text-emerald-600 font-mono">Rs. {loading ? '...' : stats.collectedFees.toLocaleString()}</h3>
            <p className="text-[10px] text-gray-400 font-extrabold mt-1 underline">View Fee Register →</p>
          </div>
        </Link>

        {/* 5. PENDING FEES CARD */}
        <Link href="/admin/student-fees" className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:border-rose-600 cursor-pointer hover:shadow-md transition active:scale-[0.98]">
          <div className="flex justify-between items-center"><span className="text-xs font-black text-gray-500">Pending Fees</span><span className="text-2xl">⏳</span></div>
          <div className="mt-3">
            <h3 className="text-lg md:text-2xl font-black text-rose-600 font-mono">Rs. {loading ? '...' : stats.pendingFees.toLocaleString()}</h3>
            <p className="text-[10px] text-rose-500 font-extrabold mt-1 underline">Unpaid Records →</p>
          </div>
        </Link>

        {/* 6. RESIGNED STAFF CARD */}
        <div onClick={() => { setStaffFilter('resigned'); setActiveModal('staff'); }} className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:border-gray-600 cursor-pointer hover:shadow-md transition active:scale-[0.98]">
          <div className="flex justify-between items-center"><span className="text-xs font-black text-gray-500">Resigned Staff</span><span className="text-2xl">🚫</span></div>
          <div className="mt-3">
            <h3 className="text-2xl md:text-3xl font-black text-gray-700 font-mono">{loading ? '...' : stats.resignedStaff}</h3>
            <p className="text-[10px] text-gray-400 font-extrabold mt-1 flex items-center gap-1"><span>Inactive Directory</span><span className="underline">View →</span></p>
          </div>
        </div>

      </div>

      {/* STUDENTS MODAL */}
      {activeModal === 'students' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border space-y-5">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h3 className="text-lg font-black text-blue-950">🎓 Students Management Portal</h3>
                <p className="text-xs text-gray-500 font-medium">{selectedClassId ? 'Viewing students for selected class' : 'Select a class to view enrolled students list'}</p>
              </div>
              <button onClick={() => setActiveModal('none')} className="w-8 h-8 rounded-full bg-slate-100 font-black text-slate-600 text-sm flex items-center justify-center">✕</button>
            </div>

            {!selectedClassId ? (
              <div className="space-y-4">
                <h4 className="text-xs font-black text-blue-950 uppercase tracking-wider">Select Class to View Students ({classesList.length} Classes Configured):</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {classesList.map((cls) => {
                    const count = studentsList.filter((s) => s.class_id === cls.id).length;
                    return (
                      <div key={cls.id} onClick={() => setSelectedClassId(cls.id)} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-950 hover:bg-blue-50/50 cursor-pointer transition shadow-sm space-y-2 group">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-blue-950 text-sm">{cls.class_name} ({cls.section_name})</span>
                          <span className="bg-blue-950 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono">{count} Students</span>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 block group-hover:text-blue-900">Click to open class roster →</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-blue-50 p-3 rounded-2xl border border-blue-200">
                  <span className="text-xs font-black text-blue-950">Class: Total: {filteredStudents.length} Students</span>
                  <button onClick={() => setSelectedClassId(null)} className="text-xs font-extrabold text-blue-900 hover:underline">← Back to Classes</button>
                </div>

                {filteredStudents.length > 0 ? (
                  <div className="divide-y border rounded-2xl overflow-hidden bg-white text-xs">
                    {filteredStudents.map((st) => {
                      const isActive = st.is_active !== false;
                      return (
                        <div key={st.id} className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50 transition">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] bg-slate-100 border text-slate-700 px-2 py-0.5 rounded-md font-bold">Roll #{st.roll_no || '-'}</span>
                              <span className="font-extrabold text-blue-950 text-sm">{st.full_name}</span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{isActive ? 'Active' : 'Blocked'}</span>
                            </div>
                            <p className="text-[11px] text-gray-500 font-medium">S/O: {st.father_name || 'N/A'} | Adm #: {st.admission_no || 'N/A'}</p>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button onClick={() => setViewStudent(st)} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[11px]">👁️ View</button>
                            <Link href={`/admin/admission?id=${st.id}`} className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold rounded-lg text-[11px] border border-blue-200">✏️ Edit</Link>
                            <button onClick={() => handleToggleBlockStudent(st.id, isActive)} className={`px-2.5 py-1 font-bold rounded-lg text-[11px] ${isActive ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>{isActive ? '🚫 Block' : '✅ Unblock'}</button>
                            <button onClick={() => handleDeleteStudent(st.id)} className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold rounded-lg text-[11px]">🗑️ Delete</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 text-xs font-bold text-gray-400 bg-slate-50 rounded-2xl border border-dashed">No students registered in this class yet.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STAFF MODAL */}
      {activeModal === 'staff' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border space-y-5">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-lg font-black text-blue-950">👨‍🏫 Staff Management Portal</h3>
              <button onClick={() => setActiveModal('none')} className="w-8 h-8 rounded-full bg-slate-100 font-black text-slate-600 text-sm flex items-center justify-center">✕</button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setStaffFilter('active')} className={`px-4 py-1.5 rounded-xl text-xs font-black ${staffFilter === 'active' ? 'bg-blue-950 text-white' : 'bg-slate-100 text-slate-700'}`}>Active Staff</button>
              <button onClick={() => setStaffFilter('resigned')} className={`px-4 py-1.5 rounded-xl text-xs font-black ${staffFilter === 'resigned' ? 'bg-rose-950 text-white' : 'bg-slate-100 text-slate-700'}`}>Resigned Staff</button>
            </div>

            {filteredStaff.length > 0 ? (
              <div className="divide-y border rounded-2xl overflow-hidden bg-white text-xs">
                {filteredStaff.map((sf) => {
                  const isActive = sf.is_active !== false;
                  return (
                    <div key={sf.id} className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50 transition">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-blue-950 text-sm">{sf.full_name}</span>
                          <span className="bg-blue-50 text-blue-900 border text-[9px] font-black px-2 py-0.5 rounded-md">{sf.role || 'Teacher'}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{isActive ? 'Active' : 'Blocked'}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 font-medium">S/O: {sf.father_name || 'N/A'} | Phone: {sf.phone || 'N/A'}</p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => setViewStaff(sf)} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[11px]">👁️ View</button>
                        <Link href={`/admin/registration?id=${sf.id}`} className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold rounded-lg text-[11px] border border-blue-200">✏️ Edit</Link>
                        <button onClick={() => handleToggleBlockStaff(sf.id, isActive)} className={`px-2.5 py-1 font-bold rounded-lg text-[11px] ${isActive ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>{isActive ? '🚫 Block' : '✅ Unblock'}</button>
                        <button onClick={() => handleDeleteStaff(sf.id)} className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold rounded-lg text-[11px]">🗑️ Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-xs font-bold text-gray-400 bg-slate-50 rounded-2xl border border-dashed">No staff members found.</div>
            )}
          </div>
        </div>
      )}

      {/* VIEW STUDENT MODAL */}
      {viewStudent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl border space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-black text-blue-950">🎓 Full Student Admission Form Record</h3>
              <button onClick={() => setViewStudent(null)} className="w-7 h-7 rounded-full bg-slate-100 font-bold text-slate-600">✕</button>
            </div>
            <div className="space-y-2.5 divide-y">
              <div className="flex justify-between py-1"><span className="font-extrabold text-gray-500">Full Name:</span><span className="font-black text-blue-950">{viewStudent.full_name || 'N/A'}</span></div>
              <div className="flex justify-between py-1"><span className="font-extrabold text-gray-500">Father Name:</span><span className="font-bold text-slate-800">{viewStudent.father_name || 'N/A'}</span></div>
              <div className="flex justify-between py-1"><span className="font-extrabold text-gray-500">Admission No:</span><span className="font-mono font-bold text-slate-800">{viewStudent.admission_no || 'N/A'}</span></div>
              <div className="flex justify-between py-1"><span className="font-extrabold text-gray-500">Class Roll No:</span><span className="font-mono font-bold text-slate-800">{viewStudent.roll_no || 'N/A'}</span></div>
              <div className="flex justify-between py-1"><span className="font-extrabold text-gray-500">Gender:</span><span className="font-bold text-slate-800">{viewStudent.gender || 'N/A'}</span></div>
              <div className="flex justify-between py-1"><span className="font-extrabold text-gray-500">Phone No:</span><span className="font-mono font-bold text-slate-800">{viewStudent.parent_phone || viewStudent.phone_no || 'N/A'}</span></div>
              <div className="flex justify-between py-1"><span className="font-extrabold text-gray-500">WhatsApp No:</span><span className="font-mono font-bold text-slate-800">{viewStudent.whatsapp_no || viewStudent.whatsapp || 'N/A'}</span></div>
              <div className="flex justify-between py-1"><span className="font-extrabold text-gray-500">Address:</span><span className="font-bold text-slate-800">{viewStudent.address || 'N/A'}</span></div>
            </div>
            <button onClick={() => setViewStudent(null)} className="w-full py-2.5 bg-blue-950 text-white font-bold rounded-xl mt-2">Close Record</button>
          </div>
        </div>
      )}

      {/* VIEW STAFF MODAL */}
      {viewStaff && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl border space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-black text-blue-950">👨‍🏫 Full Staff Form Record</h3>
              <button onClick={() => setViewStaff(null)} className="w-7 h-7 rounded-full bg-slate-100 font-bold text-slate-600">✕</button>
            </div>
            <div className="space-y-2.5 divide-y">
              <div className="flex justify-between py-1"><span className="font-extrabold text-gray-500">Full Name:</span><span className="font-black text-blue-950">{viewStaff.full_name || 'N/A'}</span></div>
              <div className="flex justify-between py-1"><span className="font-extrabold text-gray-500">Father Name:</span><span className="font-bold text-slate-800">{viewStaff.father_name || 'N/A'}</span></div>
              <div className="flex justify-between py-1"><span className="font-extrabold text-gray-500">Role / Designation:</span><span className="font-bold text-slate-800">{viewStaff.role || 'N/A'}</span></div>
              <div className="flex justify-between py-1"><span className="font-extrabold text-gray-500">Phone No:</span><span className="font-mono font-bold text-slate-800">{viewStaff.phone || 'N/A'}</span></div>
            </div>
            <button onClick={() => setViewStaff(null)} className="w-full py-2.5 bg-blue-950 text-white font-bold rounded-xl mt-2">Close Record</button>
          </div>
        </div>
      )}

    </div>
  );
}