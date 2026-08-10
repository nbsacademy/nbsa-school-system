'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<'admin' | 'account'>('admin');

  // 1. ADMIN SECTION MODULES
  const adminModules = [
    { title: 'Registration Form', subTitle: 'Staff & Student Setup', icon: '📝', path: '/admin/registration' },
    { title: 'Student Admission', subTitle: 'Register New Student', icon: '👨‍🎓', path: '/admin/admission' },
    { title: 'Staff Attendance', subTitle: 'Daily Attendance', icon: '📅', path: '/admin/staff_attendance' },
    { title: 'Books Upload', subTitle: 'Upload Study Material', icon: '📚', path: '/admin/upload-books' },
    { title: 'Messages & Notices', subTitle: 'Broadcast Notices', icon: '💬', path: '/admin/message' },
    { title: 'Staff Resign', subTitle: 'Manage Resignations', icon: '🚪', path: '/admin/resign-staff' },
    { title: 'Class Assign', subTitle: 'Assign Teacher Classes', icon: '🔗', path: '/admin/assign-class' },
    { title: 'Student Promote', subTitle: 'Promote Academic Session', icon: '📈', path: '/admin/promote-students' },
    { title: 'Add Class', subTitle: 'Class & Section Setup', icon: '🏫', path: '/admin/add_class' },
    { title: 'Add Account Number', subTitle: 'Payment Bank Accounts', icon: '💳', path: '/admin/payment-accounts' },
    { title: 'Status & Reports', subTitle: 'System Analytics', icon: '📊', path: '/admin/status-center' },
  ];

  // 2. ACCOUNTS SECTION MODULES
  const accountModules = [
    { title: 'Student Fees', subTitle: 'Collect & View Vouchers', icon: '🎓', path: '/admin/student-fees' },
    { title: 'Fee Management', subTitle: 'Structure & Settings', icon: '⚙️', path: '/admin/fee-management' },
    { title: 'Confirm Payment', subTitle: 'Approve TRX Receipts', icon: '✅', path: '/admin/confirm-payments' },
    { title: 'Fee Received List', subTitle: 'Cleared History', icon: '📄', path: '/admin/fee-list' },
    { title: 'Staff Salary', subTitle: 'Salary Disbursement', icon: '💵', path: '/admin/pay-salary' },
    { title: 'Salary Management', subTitle: 'Payroll & Deductions', icon: '⚖️', path: '/admin/salary-config' },
    { title: 'Daily Expenses', subTitle: 'Add Expense Entry', icon: '💸', path: '/admin/expenses' },
    { title: 'Expense Report', icon: '📋', subTitle: 'Financial Reports', path: '/admin/expenses-report' },
  ];

  const currentModules = activeSection === 'admin' ? adminModules : accountModules;

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-6 font-sans">
      
      {/* 🟢 TOP SECTION TOGGLE TABS (ADMIN / ACCOUNT) */}
      <div className="flex justify-center">
        <div className="bg-slate-200/80 p-1.5 rounded-2xl flex items-center gap-2 border border-slate-300 shadow-inner max-w-md w-full">
          
          <button
            type="button"
            onClick={() => setActiveSection('admin')}
            className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-black transition shadow-sm flex items-center justify-center gap-2 ${
              activeSection === 'admin'
                ? 'bg-blue-950 text-white shadow-md'
                : 'text-slate-700 hover:text-blue-950'
            }`}
          >
            <span>📊</span>
            <span>Admin Section</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('account')}
            className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-black transition shadow-sm flex items-center justify-center gap-2 ${
              activeSection === 'account'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-700 hover:text-rose-900'
            }`}
          >
            <span>💸</span>
            <span>Account Section</span>
          </button>

        </div>
      </div>

      {/* 🟢 MODULE CARDS CONTAINER */}
      <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border space-y-4">
        
        <div className="border-b pb-3 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="text-xs md:text-sm font-black text-blue-950 uppercase tracking-wider">
              {activeSection === 'admin' ? 'ACADEMY ADMIN DASHBOARD' : 'ACCOUNTS & FINANCE DASHBOARD'}
            </h3>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
              {activeSection === 'admin'
                ? 'Control panel for admissions, staff, attendance, and academic modules'
                : 'Financial management for student fees, salaries, and academy expenses'}
            </p>
          </div>

          <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${
            activeSection === 'admin' 
              ? 'bg-blue-50 text-blue-900 border-blue-200' 
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}>
            {currentModules.length} Modules Active
          </span>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 pt-2">
          {currentModules.map((mod, idx) => (
            <button
              key={idx}
              onClick={() => router.push(mod.path)}
              className="bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-2xl p-4 text-center space-y-2.5 transition shadow-sm hover:shadow-md group flex flex-col items-center justify-between min-h-[120px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-2xl shadow-inner group-hover:scale-105 transition">
                {mod.icon}
              </div>

              <div>
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-blue-950 leading-tight">
                  {mod.title}
                </h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                  {mod.subTitle}
                </p>
              </div>
            </button>
          ))}
        </div>

      </div>

    </div>
  );
}