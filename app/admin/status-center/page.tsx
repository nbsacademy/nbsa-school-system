'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import CircularChart from '@/components/CircularChart';

export default function StatusCenterPage() {
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalStudents: 0,
    studentPresentPercent: 0,
    totalStaff: 0,
    staffPresentPercent: 0,
    totalClasses: 0,
    pendingFees: 0,
    collectedFees: 0,
    feeCollectedPercent: 0,
    paidSalary: 0,
    pendingSalary: 0,
    salaryPaidPercent: 0,
    resignedStaff: 0,
  });

  useEffect(() => {
    fetchRealStats();
  }, []);

  const fetchRealStats = async () => {
    setLoading(true);

    try {
      // 1. Fetch Students Counts
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // 2. Fetch Active & Resigned Staff Counts
      const { count: activeStaffCount } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: resignedStaffCount } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', false);

      // 3. Fetch Total Classes Count
      const { count: classCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true });

      // 4. Fetch Today's Staff Attendance %
      const todayDate = new Date().toISOString().split('T')[0];
      const { data: staffAtt } = await supabase
        .from('staff_attendance')
        .select('status')
        .eq('date', todayDate);

      let staffPresencePercent = 0;
      if (staffAtt && staffAtt.length > 0) {
        const presentStaff = staffAtt.filter((a) => a.status === 'Present' || a.status === 'Late').length;
        staffPresencePercent = Math.round((presentStaff / staffAtt.length) * 100);
      }

      // 5. Fetch Today's Student Attendance %
      const { data: studentAtt } = await supabase
        .from('student_attendance')
        .select('status')
        .eq('date', todayDate);

      let studentPresencePercent = 0;
      if (studentAtt && studentAtt.length > 0) {
        const presentStudents = studentAtt.filter((a) => a.status === 'Present' || a.status === 'Late').length;
        studentPresencePercent = Math.round((presentStudents / studentAtt.length) * 100);
      }

      // 6. Fetch Live Fee Collection Analytics
      const { data: collections } = await supabase.from('fee_collections').select('amount_paid');
      const totalCollected = collections ? collections.reduce((sum, item) => sum + (parseFloat(item.amount_paid) || 0), 0) : 0;

      // Estimate Expected Fees based on Active Students & Class Structures
      const { data: studentsData } = await supabase.from('students').select('monthly_fee, class_id').eq('is_active', true);
      const { data: feeStructData } = await supabase.from('class_fee_structure').select('class_id, tuition_fee');

      let totalExpectedFees = 0;
      if (studentsData) {
        studentsData.forEach((st) => {
          const struct = feeStructData?.find((f) => f.class_id === st.class_id);
          const fee = st.monthly_fee ? parseFloat(st.monthly_fee) : struct ? parseFloat(struct.tuition_fee) : 2500;
          totalExpectedFees += fee;
        });
      }

      const totalPendingFees = Math.max(0, totalExpectedFees - totalCollected);
      const feePercent = totalExpectedFees > 0 ? Math.round((totalCollected / totalExpectedFees) * 100) : 100;

      // 7. Fetch Live Staff Salary Payout Analytics
      const { data: salaryData } = await supabase.from('salary_payments').select('net_paid, net_salary');
      const totalSalaryPaid = salaryData
        ? salaryData.reduce((sum, item) => sum + (parseFloat(item.net_paid || item.net_salary) || 0), 0)
        : 0;

      const { data: salaryConfigs } = await supabase.from('salary_config').select('basic_salary');
      const totalExpectedSalary = salaryConfigs
        ? salaryConfigs.reduce((sum, item) => sum + (parseFloat(item.basic_salary) || 0), 0)
        : 0;

      const totalPendingSalary = Math.max(0, totalExpectedSalary - totalSalaryPaid);
      const salaryPercent = totalExpectedSalary > 0 ? Math.round((totalSalaryPaid / totalExpectedSalary) * 100) : 100;

      setStats({
        totalStudents: studentCount || 0,
        studentPresentPercent: studentPresencePercent,
        totalStaff: activeStaffCount || 0,
        staffPresentPercent: staffPresencePercent,
        totalClasses: classCount || 0,
        collectedFees: totalCollected,
        pendingFees: totalPendingFees,
        feeCollectedPercent: Math.min(100, feePercent),
        paidSalary: totalSalaryPaid,
        pendingSalary: totalPendingSalary,
        salaryPaidPercent: Math.min(100, salaryPercent),
        resignedStaff: resignedStaffCount || 0,
      });
    } catch (err) {
      console.error('Error fetching status center metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 text-left font-sans text-slate-900">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl shadow-lg border-t-8 border-blue-900 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-blue-900">
            Academy Status & Control Center
          </h2>
          <p className="text-xs text-gray-500">
            Real-time overview of Students, Staff, Classes and Finance Status from Database
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="text-xs font-bold text-amber-600 animate-pulse bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              Syncing Live DB...
            </span>
          )}
          <span className="bg-blue-100 text-blue-900 px-4 py-1.5 rounded-full text-xs font-bold font-mono">
            Session 2026
          </span>
        </div>
      </div>

      {/* Top 4 Circular Progress Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CircularChart
          percentage={stats.feeCollectedPercent}
          colorClass="bg-emerald-100 text-emerald-800"
          strokeColor="#059669"
          title="Fee Collection"
          subtitle={`Rs. ${stats.collectedFees.toLocaleString()} Collected`}
          icon="💳"
        />

        <CircularChart
          percentage={stats.staffPresentPercent}
          colorClass="bg-blue-100 text-blue-800"
          strokeColor="#1e3a8a"
          title="Staff Attendance"
          subtitle="Today Staff Presence"
          icon="👨‍🏫"
        />

        <CircularChart
          percentage={stats.studentPresentPercent}
          colorClass="bg-purple-100 text-purple-800"
          strokeColor="#7e22ce"
          title="Student Attendance"
          subtitle="Today Student Presence"
          icon="🎓"
        />

        <CircularChart
          percentage={stats.salaryPaidPercent}
          colorClass="bg-amber-100 text-amber-800"
          strokeColor="#d97706"
          title="Staff Salary Paid"
          subtitle={`Rs. ${stats.paidSalary.toLocaleString()} Paid`}
          icon="💵"
        />
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition">
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold text-gray-500">Total Students</span>
            <span className="text-2xl">🎓</span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl md:text-3xl font-extrabold text-blue-900 font-mono">
              {loading ? '...' : stats.totalStudents}
            </h3>
            <p className="text-[10px] text-emerald-600 font-bold mt-1">Enrolled in Academy</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition">
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold text-gray-500">Active Staff</span>
            <span className="text-2xl">👨‍🏫</span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl md:text-3xl font-extrabold text-blue-900 font-mono">
              {loading ? '...' : stats.totalStaff}
            </h3>
            <p className="text-[10px] text-blue-600 font-bold mt-1">Teachers & Admin</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition">
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold text-gray-500">Total Classes</span>
            <span className="text-2xl">🏫</span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl md:text-3xl font-extrabold text-blue-900 font-mono">
              {loading ? '...' : stats.totalClasses}
            </h3>
            <p className="text-[10px] text-purple-600 font-bold mt-1">Configured Sections</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition">
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold text-gray-500">Fee Collected (PKR)</span>
            <span className="text-2xl">💵</span>
          </div>
          <div className="mt-3">
            <h3 className="text-xl md:text-2xl font-extrabold text-emerald-600 font-mono">
              Rs. {loading ? '...' : stats.collectedFees.toLocaleString()}
            </h3>
            <p className="text-[10px] text-gray-400 font-bold mt-1">Current Session Total</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition">
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold text-gray-500">Pending Fees (PKR)</span>
            <span className="text-2xl">⏳</span>
          </div>
          <div className="mt-3">
            <h3 className="text-xl md:text-2xl font-extrabold text-red-600 font-mono">
              Rs. {loading ? '...' : stats.pendingFees.toLocaleString()}
            </h3>
            <p className="text-[10px] text-red-500 font-bold mt-1">Unpaid Balance</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition">
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold text-gray-500">Resigned Staff</span>
            <span className="text-2xl">🚫</span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl md:text-3xl font-extrabold text-gray-700 font-mono">
              {loading ? '...' : stats.resignedStaff}
            </h3>
            <p className="text-[10px] text-gray-400 font-bold mt-1">Inactive Directory</p>
          </div>
        </div>
      </div>

      {/* Quick Navigation Panel */}
      <div className="bg-white p-6 rounded-3xl shadow-lg border-t-8 border-red-600 space-y-4">
        <h3 className="text-base font-extrabold text-slate-800 border-b pb-2">
          Quick Access Shortcuts
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/admin/student-admission" className="p-3 bg-slate-50 border rounded-xl text-center hover:bg-red-50 hover:border-red-600 transition">
            <span className="block text-xl">🎓</span>
            <span className="text-xs font-bold text-gray-800">New Admission</span>
          </Link>
          <Link href="/admin/staff-register" className="p-3 bg-slate-50 border rounded-xl text-center hover:bg-blue-50 hover:border-blue-900 transition">
            <span className="block text-xl">📝</span>
            <span className="text-xs font-bold text-gray-800">Staff Register</span>
          </Link>
          <Link href="/admin/staff-attendance" className="p-3 bg-slate-50 border rounded-xl text-center hover:bg-emerald-50 hover:border-emerald-600 transition">
            <span className="block text-xl">📋</span>
            <span className="text-xs font-bold text-gray-800">Staff Attendance</span>
          </Link>
          <Link href="/admin/classes" className="p-3 bg-slate-50 border rounded-xl text-center hover:bg-purple-50 hover:border-purple-600 transition">
            <span className="block text-xl">🏫</span>
            <span className="text-xs font-bold text-gray-800">Class & Subjects</span>
          </Link>
        </div>
      </div>

    </div>
  );
}