'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ConfigureFeeManagementPage() {
  const [loading, setLoading] = useState(false);

  // Live Database States
  const [classList, setClassList] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);

  // Form Inputs
  const [selectedClassId, setSelectedClassId] = useState('');
  const [tuitionFee, setTuitionFee] = useState('');
  const [admissionFee, setAdmissionFee] = useState('');
  const [examFee, setExamFee] = useState('');

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
    // 1. Fetch Classes
    const { data: cData } = await supabase.from('classes').select('*').order('created_at', { ascending: true });
    if (cData) setClassList(cData);

    // 2. Fetch Live Fee Structures safely
    fetchFeeStructures(cData || []);
  };

  const fetchFeeStructures = async (currentClasses?: any[]) => {
    const classesToMap = currentClasses && currentClasses.length > 0 ? currentClasses : classList;

    const { data: feesData, error } = await supabase
      .from('class_fee_structure')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && feesData) {
      const mergedData = feesData.map((fee) => {
        const foundClass = classesToMap.find((c) => c.id === fee.class_id);
        return {
          ...fee,
          class_name: foundClass ? foundClass.class_name : 'Class',
          section_name: foundClass ? foundClass.section_name || 'A' : '',
        };
      });
      setFeeStructures(mergedData);
    }
  };

  // Save or Update Fee Structure Handler
  const handleSaveFeeStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Select Class Required',
        message: 'Please select a class to configure fee structure!',
      });
      return;
    }

    setLoading(true);

    const feePayload = {
      class_id: selectedClassId,
      tuition_fee: parseFloat(tuitionFee) || 0,
      admission_fee: parseFloat(admissionFee) || 0,
      exam_fee: parseFloat(examFee) || 0,
    };

    // Upsert (Insert or Update)
    const { error } = await supabase.from('class_fee_structure').upsert(feePayload, { onConflict: 'class_id' });

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
      title: 'Fee Structure Saved!',
      message: 'Class fee configuration successfully saved in database.',
    });

    // Reset Form
    setSelectedClassId('');
    setTuitionFee('');
    setAdmissionFee('');
    setExamFee('');
    
    // Refresh Data
    const { data: cData } = await supabase.from('classes').select('*');
    fetchFeeStructures(cData || []);
  };

  // Delete Fee Configuration Handler
  const confirmDeleteFeeStructure = async () => {
    if (!deleteTargetId) return;

    const { error } = await supabase.from('class_fee_structure').delete().eq('id', deleteTargetId);
    setDeleteTargetId(null);

    if (!error) {
      setPopup({
        show: true,
        type: 'success',
        title: 'Deleted Successfully',
        message: 'Class fee structure removed from database.',
      });
      const { data: cData } = await supabase.from('classes').select('*');
      fetchFeeStructures(cData || []);
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
      
      {/* 🚀 BEAUTIFUL CUSTOM POPUP MODAL (REPLACES BROWSER ALERT) */}
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

      {/* 🚀 CUSTOM DELETE CONFIRMATION MODAL (REPLACES BROWSER CONFIRM) */}
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
                Are you sure you want to delete this fee configuration?
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
                onClick={confirmDeleteFeeStructure}
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
        
        {/* 1. FEE CONFIGURATION FORM */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
          <div className="border-b pb-2">
            <h2 className="text-sm font-extrabold text-blue-900">
              1. Configure Class Fee
            </h2>
            <p className="text-[11px] text-gray-500">
              Set monthly tuition fee, admission fee and exam charges for each class
            </p>
          </div>

          <form onSubmit={handleSaveFeeStructure} className="space-y-3 text-xs">
            {/* Class Dropdown */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Select Class</label>
              <select
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none text-blue-900 focus:border-blue-900"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                <option value="">-- Select Class --</option>
                {classList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_name} ({c.section_name || 'A'})
                  </option>
                ))}
              </select>
            </div>

            {/* Tuition Fee */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Monthly Tuition Fee (PKR)</label>
              <input
                type="number"
                placeholder="e.g. 2000"
                className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 outline-none text-emerald-800 focus:border-blue-900"
                value={tuitionFee}
                onChange={(e) => setTuitionFee(e.target.value)}
              />
            </div>

            {/* Admission Fee */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Admission Fee (PKR)</label>
              <input
                type="number"
                placeholder="e.g. 2500"
                className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 outline-none text-blue-900 focus:border-blue-900"
                value={admissionFee}
                onChange={(e) => setAdmissionFee(e.target.value)}
              />
            </div>

            {/* Exam / Lab Fee */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Exam / Lab Fee (PKR)</label>
              <input
                type="number"
                placeholder="e.g. 500"
                className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 outline-none text-amber-800 focus:border-blue-900"
                value={examFee}
                onChange={(e) => setExamFee(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white p-3.5 rounded-2xl font-black transition shadow-md disabled:opacity-50 text-xs"
            >
              {loading ? 'Saving...' : 'Save Fee Structure'}
            </button>
          </form>
        </div>

        {/* 2. LIVE FEE DIRECTORY */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
          <div className="border-b pb-2 flex justify-between items-center">
            <h2 className="text-sm font-extrabold text-blue-900">
              Classes Fee Directory
            </h2>
            <span className="bg-emerald-50 text-emerald-800 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-200">
              Total: {feeStructures.length}
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {feeStructures.map((item) => (
              <div key={item.id} className="p-3 bg-slate-50 rounded-2xl border space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-xs text-blue-950 flex items-center gap-1.5">
                    <span>🏫</span> {item.class_name} <span className="text-gray-500 font-normal">({item.section_name})</span>
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
                    Tuition: Rs. {item.tuition_fee}
                  </span>
                  <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md border border-blue-200">
                    Admission: Rs. {item.admission_fee}
                  </span>
                  <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200">
                    Exam/Lab: Rs. {item.exam_fee}
                  </span>
                </div>
              </div>
            ))}

            {feeStructures.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-12 font-medium">
                No fee structures configured in database yet.
              </p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}