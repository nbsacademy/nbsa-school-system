'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function MasterSalaryConfigPage() {
  const [loading, setLoading] = useState(false);

  // Live Database States
  const [staffList, setStaffList] = useState<any[]>([]);
  const [salaryConfigs, setSalaryConfigs] = useState<any[]>([]);

  // Form Inputs
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [allowedLeaves, setAllowedLeaves] = useState('2');
  const [initialArrears, setInitialArrears] = useState('0');

  // Delete Confirmation Modal State
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    // 1. Fetch Registered Active Staff
    const { data: stData } = await supabase
      .from('staff')
      .select('id, full_name, registration_no, role')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (stData) setStaffList(stData);

    // 2. Fetch Live Salary Configurations
    fetchSalaryConfigs(stData || []);
  };

  const fetchSalaryConfigs = async (currentStaff?: any[]) => {
    const staffToMap = currentStaff && currentStaff.length > 0 ? currentStaff : staffList;

    const { data: configData, error } = await supabase
      .from('salary_config')
      .select('*');

    if (!error && configData) {
      const mergedData = configData.map((config) => {
        const foundStaff = staffToMap.find((s) => s.id === config.staff_id);
        return {
          ...config,
          full_name: foundStaff ? foundStaff.full_name : 'Staff Member',
          registration_no: foundStaff ? foundStaff.registration_no : '-',
          role: foundStaff ? foundStaff.role : 'Staff',
        };
      });
      setSalaryConfigs(mergedData);
    }
  };

  // Select Staff Handler -> Auto Populate existing config if present
  const handleStaffSelect = (sId: string) => {
    setSelectedStaffId(sId);
    const existing = salaryConfigs.find((c) => c.staff_id === sId);

    if (existing) {
      setBasicSalary(existing.basic_salary ? existing.basic_salary.toString() : '');
      setAllowedLeaves(existing.allowed_leaves ? existing.allowed_leaves.toString() : '2');
      setInitialArrears(existing.arrears ? existing.arrears.toString() : '0');
    } else {
      setBasicSalary('');
      setAllowedLeaves('2');
      setInitialArrears('0');
    }
  };

  // Save or Update Salary Config
  const handleSaveSalaryConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Select Staff Required',
        message: 'Please select a staff member to configure salary!',
      });
      return;
    }

    setLoading(true);

    const payload = {
      staff_id: selectedStaffId,
      basic_salary: parseFloat(basicSalary) || 0,
      allowed_leaves: parseInt(allowedLeaves, 10) || 0,
      arrears: parseFloat(initialArrears) || 0,
      updated_at: new Date().toISOString(),
    };

    // Upsert Config
    const { error } = await supabase.from('salary_config').upsert(payload, { onConflict: 'staff_id' });

    setLoading(false);

    if (error) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Save Failed',
        message: error.message,
      });
      return;
    }

    setPopup({
      show: true,
      type: 'success',
      title: 'Salary Config Saved!',
      message: 'Master salary configuration updated successfully in database.',
    });

    // Reset Form
    setSelectedStaffId('');
    setBasicSalary('');
    setAllowedLeaves('2');
    setInitialArrears('0');

    // Refresh List
    const { data: stData } = await supabase.from('staff').select('id, full_name, registration_no, role').eq('is_active', true);
    fetchSalaryConfigs(stData || []);
  };

  // Delete Configuration Handler
  const confirmDeleteConfig = async () => {
    if (!deleteTargetId) return;

    const { error } = await supabase.from('salary_config').delete().eq('id', deleteTargetId);
    setDeleteTargetId(null);

    if (!error) {
      setPopup({
        show: true,
        type: 'success',
        title: 'Deleted Successfully',
        message: 'Salary configuration removed from database.',
      });
      const { data: stData } = await supabase.from('staff').select('id, full_name, registration_no, role').eq('is_active', true);
      fetchSalaryConfigs(stData || []);
    } else {
      setPopup({
        show: true,
        type: 'error',
        title: 'Delete Failed',
        message: error.message,
      });
    }
  };

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-5 text-left font-sans text-slate-900">
      
      {/* 🚀 BEAUTIFUL CUSTOM POPUP MODAL */}
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

      {/* 🚀 CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border-t-8 border-amber-500 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full mx-auto flex items-center justify-center text-3xl font-black">
              ⚠️
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">
                Confirm Deletion
              </h3>
              <p className="text-xs text-gray-600 font-medium">
                Are you sure you want to delete this salary configuration?
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 py-3 rounded-2xl text-xs font-black text-gray-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteConfig}
                className="flex-1 py-3 rounded-2xl text-xs font-black text-white bg-red-600 hover:bg-red-700 transition shadow-md"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* 1. MASTER SALARY CONFIG FORM */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
          <div className="border-b pb-2">
            <h2 className="text-sm font-extrabold text-blue-900">
              Master Salary Settings
            </h2>
            <p className="text-[11px] text-gray-500">
              Set fixed basic salary, allowed paid leaves & initial arrears
            </p>
          </div>

          <form onSubmit={handleSaveSalaryConfig} className="space-y-3 text-xs">
            {/* Select Staff Dropdown */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Select Staff Member</label>
              <select
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none text-blue-900 focus:border-blue-900"
                value={selectedStaffId}
                onChange={(e) => handleStaffSelect(e.target.value)}
              >
                <option value="">-- Select Active Staff --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.registration_no || 'No Reg'}) - {s.role || 'Staff'}
                  </option>
                ))}
              </select>
            </div>

            {/* Basic Salary Input */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Fixed Basic Salary (PKR)</label>
              <input
                type="number"
                placeholder="e.g. 35000"
                className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 outline-none text-emerald-800 focus:border-blue-900"
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value)}
              />
            </div>

            {/* Allowed Paid Leaves & Arrears Inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Allowed Paid Leaves</label>
                <input
                  type="number"
                  placeholder="2"
                  className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 outline-none text-blue-900 focus:border-blue-900"
                  value={allowedLeaves}
                  onChange={(e) => setAllowedLeaves(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Initial Arrears (PKR)</label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 outline-none text-rose-800 focus:border-blue-900"
                  value={initialArrears}
                  onChange={(e) => setInitialArrears(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white p-3.5 rounded-2xl font-black transition shadow-md disabled:opacity-50 text-xs"
            >
              {loading ? 'Saving...' : 'Save Master Salary Config'}
            </button>
          </form>
        </div>

        {/* 2. CONFIGURES STAFF DIRECTORY */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
          <div className="border-b pb-2 flex justify-between items-center">
            <h2 className="text-sm font-extrabold text-blue-900">
              Configured Staff Directory
            </h2>
            <span className="bg-amber-50 text-amber-900 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-amber-200">
              Total: {salaryConfigs.length}
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {salaryConfigs.map((item) => (
              <div key={item.id} className="p-3 bg-slate-50 rounded-2xl border space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-xs text-blue-950 flex items-center gap-1.5">
                    <span>👨‍🏫</span> {item.full_name} <span className="text-gray-500 font-normal">({item.role})</span>
                  </h4>
                  <button
                    onClick={() => setDeleteTargetId(item.id)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-lg transition font-mono"
                  >
                    Delete
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[10px] font-bold font-mono">
                  <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-200">
                    Basic: Rs. {item.basic_salary}
                  </span>
                  <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md border border-blue-200">
                    Allowed Leaves: {item.allowed_leaves} Days
                  </span>
                  <span className="bg-rose-100 text-rose-900 px-2 py-0.5 rounded-md border border-rose-200">
                    Arrears: Rs. {item.arrears || 0}
                  </span>
                </div>
              </div>
            ))}

            {salaryConfigs.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-12 font-medium">
                No staff salary configurations found in database yet.
              </p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}