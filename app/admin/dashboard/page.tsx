'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'admin' | 'accounts'>('admin');

  // Admin Section Modules (With Student Result View Added)
  const adminModules = [
    {
      title: 'Staff Attendance',
      desc: 'DAILY STAFF ATTENDANCE',
      icon: '📋',
      link: '/admin/staff_attendance',
    },
    {
      title: 'Student Attendance',
      desc: 'DAILY STUDENT ATTENDANCE',
      icon: '🎓',
      link: '/admin/student_attendance',
    },
    {
      title: 'Student Result View',
      desc: 'VIEW CLASS TEST RESULTS',
      icon: '📜',
      link: '/admin/results',
    },
    {
      title: 'Status & Reports',
      desc: 'SYSTEM ANALYTICS & STATS',
      icon: '📊',
      link: '/admin/status-center',
    },
    {
      title: 'Registration Form',
      desc: 'STAFF & STUDENT SETUP',
      icon: '📝',
      link: '/admin/registration',
    },
    {
      title: 'Student Admission',
      desc: 'REGISTER NEW STUDENT',
      icon: '👨‍🎓',
      link: '/admin/admission',
    },
    {
      title: 'Books Upload',
      desc: 'UPLOAD STUDY MATERIAL',
      icon: '📚',
      link: '/admin/upload-books',
    },
    {
      title: 'Messages & Notices',
      desc: 'BROADCAST NOTICES',
      icon: '💬',
      link: '/admin/message',
    },
    {
      title: 'Staff Resign',
      desc: 'MANAGE RESIGNATIONS',
      icon: '🚪',
      link: '/admin/resign-staff',
    },
    {
      title: 'Class Assign',
      desc: 'ASSIGN TEACHER CLASSES',
      icon: '🔗',
      link: '/admin/assign-class',
    },
    {
      title: 'Student Promote',
      desc: 'PROMOTE ACADEMIC SESSION',
      icon: '📈',
      link: '/admin/promote-students',
    },
    {
      title: 'Add Class',
      desc: 'CLASS & SECTION SETUP',
      icon: '🏫',
      link: '/admin/add_class',
    },
  ];

  // Accounts & Finance Section Modules
  const accountModules = [
    {
      title: 'Student Fees',
      desc: 'COLLECT & VIEW VOUCHERS',
      icon: '🎓',
      link: '/admin/student-fees',
    },
    {
      title: 'Fee Management',
      desc: 'STRUCTURE & SETTINGS',
      icon: '⚙️',
      link: '/admin/fee-management',
    },
    {
      title: 'Confirm Payment',
      desc: 'APPROVE TRX RECEIPTS',
      icon: '✅',
      link: '/admin/confirm-payments',
    },
    {
      title: 'Fee Received List',
      desc: 'CLEARED HISTORY',
      icon: '📄',
      link: '/admin/fee-list',
    },
    {
      title: 'Staff Salary',
      desc: 'SALARY DISBURSEMENT',
      icon: '💵',
      link: '/admin/pay-salary',
    },
    {
      title: 'Salary Management',
      desc: 'PAYROLL & DEDUCTIONS',
      icon: '⚖️',
      link: '/admin/salary-config',
    },
    {
      title: 'Advance Salary',
      desc: 'ADVANCE SALARY LOGS',
      icon: '💸',
      link: '/admin/advance-salary',
    },
    {
      title: 'Daily Expenses',
      desc: 'ADD EXPENSE ENTRY',
      icon: '📊',
      link: '/admin/expenses',
    },
    {
      title: 'Expense Report',
      desc: 'FINANCIAL REPORTS',
      icon: '📋',
      link: '/admin/expenses-report',
    },
    {
      title: 'Add Bank Account',
      desc: 'PAYMENT BANK ACCOUNTS',
      icon: '💳',
      link: '/admin/accounts',
    },
  ];

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-6 font-sans text-slate-900 pb-16">
      
      {/* TOP SECTION SWITCHER TABS */}
      <div className="flex bg-slate-200/80 p-1.5 rounded-3xl max-w-md mx-auto shadow-inner border border-slate-300">
        <button
          type="button"
          onClick={() => setActiveTab('admin')}
          className={`flex-1 py-3 rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 ${
            activeTab === 'admin'
              ? 'bg-blue-950 text-white shadow-lg'
              : 'text-slate-700 hover:text-slate-950'
          }`}
        >
          <span>📊</span>
          <span>Admin Section</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={`flex-1 py-3 rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 ${
            activeTab === 'accounts'
              ? 'bg-rose-700 text-white shadow-lg'
              : 'text-slate-700 hover:text-slate-950'
          }`}
        >
          <span>💸</span>
          <span>Account Section</span>
        </button>
      </div>

      {/* DASHBOARD MODULES CONTAINER */}
      <div className="bg-slate-100/70 p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        
        {/* Banner Title */}
        <div className="flex justify-between items-center border-b pb-3 flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-black uppercase text-slate-800 tracking-wider">
              {activeTab === 'admin' ? 'ACADEMY ADMIN DASHBOARD' : 'ACCOUNTS & FINANCE DASHBOARD'}
            </h2>
            <p className="text-[11px] text-gray-500 font-medium">
              {activeTab === 'admin'
                ? 'Control panel for admissions, staff, attendance, and academic modules'
                : 'Financial management for student fees, salaries, bank accounts, and academy expenses'}
            </p>
          </div>

          <span className="bg-blue-100 text-blue-900 font-black text-[10px] px-3 py-1 rounded-full border border-blue-200 font-mono">
            {activeTab === 'admin' ? `${adminModules.length} Modules Active` : `${accountModules.length} Modules Active`}
          </span>
        </div>

        {/* 1. ADMIN SECTION GRID */}
        {activeTab === 'admin' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 animate-fadeIn">
            {adminModules.map((mod, index) => (
              <Link
                key={index}
                href={mod.link}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-900 hover:shadow-md transition text-center space-y-2 flex flex-col items-center justify-center min-h-[110px] group active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center text-xl transition">
                  {mod.icon}
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-blue-950 group-hover:text-blue-900 block">
                    {mod.title}
                  </h3>
                  <span className="text-[9px] font-bold text-gray-400 block tracking-tight">
                    {mod.desc}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 2. ACCOUNT SECTION GRID */}
        {activeTab === 'accounts' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 animate-fadeIn">
            {accountModules.map((mod, index) => (
              <Link
                key={index}
                href={mod.link}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-rose-700 hover:shadow-md transition text-center space-y-2 flex flex-col items-center justify-center min-h-[110px] group active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-rose-50 flex items-center justify-center text-xl transition">
                  {mod.icon}
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-blue-950 group-hover:text-rose-800 block">
                    {mod.title}
                  </h3>
                  <span className="text-[9px] font-bold text-gray-400 block tracking-tight">
                    {mod.desc}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
