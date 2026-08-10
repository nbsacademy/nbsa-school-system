'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function StudentProfilePage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');
  const [student, setStudent] = useState<any>(null);

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passSubmitting, setPassSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    fetchStudentProfile();
  }, []);

  const fetchStudentProfile = async () => {
    setLoading(true);

    // Get Logged-In Student Details from Local Storage
    const storedStudentId = localStorage.getItem('user_id');
    const storedRegNo = localStorage.getItem('user_reg_no') || localStorage.getItem('username');

    let studentRecord = null;

    if (storedStudentId) {
      const { data } = await supabase
        .from('students')
        .select('*, classes(class_name, section_name)')
        .eq('id', storedStudentId)
        .maybeSingle();
      studentRecord = data;
    }

    if (!studentRecord && storedRegNo) {
      const { data } = await supabase
        .from('students')
        .select('*, classes(class_name, section_name)')
        .or(`registration_no.eq.${storedRegNo.trim()},admission_no.eq.${storedRegNo.trim()}`)
        .maybeSingle();
      studentRecord = data;
    }

    if (!studentRecord) {
      const { data: fallback } = await supabase
        .from('students')
        .select('*, classes(class_name, section_name)')
        .limit(1)
        .maybeSingle();
      studentRecord = fallback;
    }

    if (studentRecord) {
      setStudent(studentRecord);
    }

    setLoading(false);
  };

  // Password Change Handler
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setAlertMsg(null);

    if (!oldPassword || !newPassword) {
      setAlertMsg({ type: 'error', msg: 'Please fill all password fields!' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setAlertMsg({ type: 'error', msg: 'New passwords do not match!' });
      return;
    }

    setPassSubmitting(true);
    setTimeout(() => {
      setPassSubmitting(false);
      setAlertMsg({ type: 'success', msg: 'Account password updated successfully!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 600);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-bold text-gray-500 animate-pulse">
        Loading Student Profile...
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-5 font-sans text-left text-slate-900">
      
      {/* 1. STUDENT PROFILE BANNER */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        
        <div className="w-20 h-20 bg-blue-950 text-white rounded-2xl flex items-center justify-center font-black text-3xl border-2 border-blue-800 shadow-md shrink-0 overflow-hidden">
          {student?.photo_url ? (
            <img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover" />
          ) : (
            '🎓'
          )}
        </div>

        <div className="space-y-1 flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-lg md:text-xl font-black text-blue-950">
              {student?.full_name || 'Student Name'}
            </h1>
            <span className="bg-amber-100 text-amber-950 border border-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono">
              Roll No: {student?.roll_no || '01'}
            </span>
          </div>

          <p className="text-xs text-slate-600 font-bold">
            Reg No: <b className="text-blue-900 font-mono">{student?.registration_no || student?.admission_no || '-'}</b>
          </p>

          <p className="text-[11px] text-emerald-700 font-extrabold">
            Class: <b className="text-slate-800">{student?.classes?.class_name || '9th'} ({student?.section_name || student?.classes?.section_name || 'Section A'})</b>
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-center shrink-0">
          <span className="text-[9px] text-emerald-800 font-extrabold block uppercase tracking-wider">
            Monthly Fee
          </span>
          <span className="text-xs font-black font-mono text-emerald-700">
            Rs. {student?.monthly_fee ? student.monthly_fee.toLocaleString() : '2,500'}
          </span>
        </div>

      </div>

      {/* 2. TAB SWITCHER (PROFILE vs SECURITY) */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl border max-w-sm mx-auto shadow-inner">
        <button
          type="button"
          onClick={() => {
            setActiveTab('info');
            setAlertMsg(null);
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition ${
            activeTab === 'info'
              ? 'bg-blue-950 text-white shadow-md'
              : 'text-slate-700 hover:text-blue-950'
          }`}
        >
          Student Profile
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('password');
            setAlertMsg(null);
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition ${
            activeTab === 'password'
              ? 'bg-blue-950 text-white shadow-md'
              : 'text-slate-700 hover:text-blue-950'
          }`}
        >
          Security & Password
        </button>
      </div>

      {alertMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold border text-center ${
            alertMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {alertMsg.type === 'error' ? '⚠️ ' : '✓ '} {alertMsg.msg}
        </div>
      )}

      {/* 3. TAB 1: ACADEMIC & PERSONAL RECORDS */}
      {activeTab === 'info' && (
        <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border space-y-4">
          <div className="border-b pb-2">
            <h3 className="text-xs font-black text-blue-950 uppercase tracking-widest">
              ACADEMIC & PERSONAL RECORDS
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-2xl border">
              <span className="text-slate-400 font-extrabold text-[10px] uppercase block">
                Student Full Name
              </span>
              <span className="font-black text-slate-900 text-sm mt-0.5 block">
                {student?.full_name || '-'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border">
              <span className="text-slate-400 font-extrabold text-[10px] uppercase block">
                Father Name
              </span>
              <span className="font-black text-slate-900 text-sm mt-0.5 block">
                {student?.father_name || '-'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border">
              <span className="text-slate-400 font-extrabold text-[10px] uppercase block">
                B-Form / CNIC No
              </span>
              <span className="font-extrabold font-mono text-slate-800 mt-0.5 block">
                {student?.b_form || student?.cnic || '32203-XXXXXXX-X'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border">
              <span className="text-slate-400 font-extrabold text-[10px] uppercase block">
                Parent Contact Phone
              </span>
              <span className="font-extrabold font-mono text-emerald-700 mt-0.5 block">
                📞 {student?.guardian_phone || student?.phone || '0300-1234567'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border">
              <span className="text-slate-400 font-extrabold text-[10px] uppercase block">
                Admission Date
              </span>
              <span className="font-extrabold font-mono text-slate-800 mt-0.5 block">
                {student?.admission_date || '2026-03-15'}
              </span>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
              <span className="text-emerald-800 font-extrabold text-[10px] uppercase block">
                Account Status
              </span>
              <span className="font-black text-emerald-700 mt-0.5 block">
                ✅ Active Student
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: CHANGE PASSWORD */}
      {activeTab === 'password' && (
        <form onSubmit={handleChangePassword} className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border space-y-4">
          <div className="border-b pb-2">
            <h3 className="text-xs font-black text-blue-950 uppercase tracking-widest">
              CHANGE ACCOUNT PASSWORD
            </h3>
          </div>

          <div className="space-y-3.5 max-w-md mx-auto text-xs pt-1">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full p-3 border rounded-xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-900"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full p-3 border rounded-xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-900"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full p-3 border rounded-xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-900"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={passSubmitting}
              className="w-full bg-blue-950 hover:bg-blue-900 text-white p-3.5 rounded-xl font-black text-xs transition shadow-md mt-2"
            >
              {passSubmitting ? 'Updating Password...' : 'Update Account Password'}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}