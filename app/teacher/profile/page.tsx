'use client';
import { useState } from 'react';

export default function TeacherProfilePage() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');

  // Teacher Profile State
  const [profile, setProfile] = useState({
    id: '1',
    regNo: 'R-2026-001',
    fullName: 'Sir Muhammad Ali',
    fatherName: 'Muhammad Ahmed',
    role: 'Senior Science Teacher',
    assignedClass: '9th (Science A)',
    cnic: '32203-1234567-1',
    phone: '03001234567',
    whatsapp: '03001234567',
    allowedLeaves: 2,
    basicSalary: 35000,
  });

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Save Info Updates
  const handleUpdateInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert('Profile information updated successfully!');
    }, 400);
  };

  // Change Password
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      alert('Please fill all password fields!');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match!');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert('Password changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 400);
  };

  return (
    <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-4 text-left font-sans text-slate-900">
      
      {/* Teacher Profile Card Banner */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <div className="w-20 h-20 bg-blue-900 text-white rounded-full flex items-center justify-center font-black text-2xl border-4 border-blue-100 shadow shrink-0">
          👨‍🏫
        </div>

        <div className="space-y-1 flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-lg md:text-xl font-extrabold text-blue-900">{profile.fullName}</h1>
            <span className="bg-blue-100 text-blue-900 text-[10px] font-black px-2.5 py-0.5 rounded-full font-mono">
              {profile.regNo}
            </span>
          </div>
          <p className="text-xs text-gray-600 font-bold">{profile.role}</p>
          <p className="text-[11px] text-emerald-700 font-bold">
            Assigned Class: <b className="text-blue-900">{profile.assignedClass}</b>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200 p-1 rounded-2xl border max-w-sm mx-auto">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition ${
            activeTab === 'info'
              ? 'bg-blue-900 text-white shadow-sm'
              : 'text-gray-700 hover:text-blue-900'
          }`}
        >
          Personal Details
        </button>

        <button
          onClick={() => setActiveTab('password')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition ${
            activeTab === 'password'
              ? 'bg-blue-900 text-white shadow-sm'
              : 'text-gray-700 hover:text-blue-900'
          }`}
        >
          Security & Password
        </button>
      </div>

      {/* Tab 1: Personal Details */}
      {activeTab === 'info' && (
        <form onSubmit={handleUpdateInfo} className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border space-y-3">
          <h3 className="text-xs font-extrabold text-gray-700 border-b pb-2 uppercase tracking-wider">
            Staff Information Directory
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-gray-600 mb-1">Full Name</label>
              <input
                type="text"
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-bold text-gray-600 mb-1">Father Name</label>
              <input
                type="text"
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none"
                value={profile.fatherName}
                onChange={(e) => setProfile({ ...profile, fatherName: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-bold text-gray-600 mb-1">CNIC Number</label>
              <input
                type="text"
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none"
                value={profile.cnic}
                onChange={(e) => setProfile({ ...profile, cnic: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-bold text-gray-600 mb-1">Phone Number</label>
              <input
                type="text"
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-bold text-gray-600 mb-1">WhatsApp Number</label>
              <input
                type="text"
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none"
                value={profile.whatsapp}
                onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-bold text-gray-600 mb-1">Monthly Basic Salary</label>
              <div className="p-2.5 border rounded-xl font-black bg-emerald-50 text-emerald-800 font-mono">
                Rs. {profile.basicSalary.toLocaleString()}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white p-3 rounded-2xl font-black text-xs transition shadow-md mt-2"
          >
            {loading ? 'Updating...' : 'Save Profile Changes'}
          </button>
        </form>
      )}

      {/* Tab 2: Security & Password */}
      {activeTab === 'password' && (
        <form onSubmit={handleChangePassword} className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border space-y-3">
          <h3 className="text-xs font-extrabold text-gray-700 border-b pb-2 uppercase tracking-wider">
            Change Account Password
          </h3>

          <div className="space-y-3 max-w-md mx-auto">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                className="w-full p-2.5 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-900"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                className="w-full p-2.5 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-900"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                className="w-full p-2.5 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-900"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white p-3 rounded-2xl font-black text-xs transition shadow-md"
            >
              {loading ? 'Changing Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}