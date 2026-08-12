'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ConfigureFeeManagementPage() {
  const [loading, setLoading] = useState(false);

  // Live Database States
  const [classList, setClassList] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [concessionsList, setConcessionsList] = useState<any[]>([]);

  // Fee Structure Form Inputs
  const [selectedClassId, setSelectedClassId] = useState('');
  const [tuitionFee, setTuitionFee] = useState('');
  const [admissionFee, setAdmissionFee] = useState('');
  const [examFee, setExamFee] = useState('');

  // Student Discount / Concession Form Inputs & Filters
  const [concessClassId, setConcessClassId] = useState('');
  const [concessSearchQuery, setConcessSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountReason, setDiscountReason] = useState('');

  // Delete Target Modal State
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

    // 2. Fetch Active Students
    const { data: stData } = await supabase.from('students').select('*, classes(class_name, section_name)').eq('is_active', true).order('roll_no', { ascending: true });
    if (stData) setStudentsList(stData);

    // 3. Fetch Fee Structures
    fetchFeeStructures(cData || []);

    // 4. Fetch Concessions
    fetchConcessions();
  };

  const fetchFeeStructures = async (currentClasses?: any[]) => {
    const classesToMap = currentClasses && currentClasses.length > 0 ? currentClasses : classList;
    const { data: feesData, error } = await supabase.from('class_fee_structure').select('*').order('created_at', { ascending: false });

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

  const fetchConcessions = async () => {
    const { data } = await supabase.from('student_fee_concessions').select('*, students(full_name, father_name, roll_no, classes(class_name, section_name))');
    if (data) setConcessionsList(data);
  };

  // Filter Students for Concession Module based on Class & Search Query
  const filteredConcessStudents = studentsList.filter((st) => {
    const matchesClass = !concessClassId || st.class_id === concessClassId;
    const q = concessSearchQuery.toLowerCase().trim();
    const name = (st.full_name || '').toLowerCase();
    const father = (st.father_name || '').toLowerCase();
    const roll = String(st.roll_no || '');
    const matchesQuery = !q || name.includes(q) || father.includes(q) || roll.includes(q);

    return matchesClass && matchesQuery;
  });

  // 1. Save or Update Fee Structure Handler
  const handleSaveFeeStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) {
      setPopup({ show: true, type: 'error', title: 'Select Class', message: 'Please select a class first!' });
      return;
    }

    setLoading(true);

    const feePayload = {
      class_id: selectedClassId,
      tuition_fee: parseFloat(tuitionFee) || 0,
      admission_fee: parseFloat(admissionFee) || 0,
      exam_fee: parseFloat(examFee) || 0,
    };

    const { error } = await supabase.from('class_fee_structure').upsert(feePayload, { onConflict: 'class_id' });

    setLoading(false);

    if (error) {
      setPopup({ show: true, type: 'error', title: 'Save Failed', message: error.message });
      return;
    }

    setPopup({
      show: true,
      type: 'success',
      title: 'Fee Structure Configured!',
      message: 'Monthly tuition and temporary funds set for selected class.',
    });

    setSelectedClassId('');
    setTuitionFee('');
    setAdmissionFee('');
    setExamFee('');
    fetchFeeStructures();
  };

  // 2. Save Student Fee Concession / Discount Handler
  const handleSaveConcession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setPopup({ show: true, type: 'error', title: 'Select Student', message: 'Please select a student for fee concession!' });
      return;
    }

    setLoading(true);

    const payload = {
      student_id: selectedStudentId,
      discount_amount: parseFloat(discountAmount) || 0,
      reason: discountReason.trim() || 'Scholarship / Special Concession',
    };

    const { error } = await supabase.from('student_fee_concessions').upsert(payload, { onConflict: 'student_id' });

    setLoading(false);

    if (error) {
      setPopup({ show: true, type: 'error', title: 'Concession Failed', message: error.message });
    } else {
      setPopup({
        show: true,
        type: 'success',
        title: 'Discount Saved!',
        message: 'Student fee concession successfully assigned and saved.',
      });
      setSelectedStudentId('');
      setDiscountAmount('');
      setDiscountReason('');
      fetchConcessions();
    }
  };

  // Delete Fee Configuration Handler
  const confirmDeleteFeeStructure = async () => {
    if (!deleteTargetId) return;

    const { error } = await supabase.from('class_fee_structure').delete().eq('id', deleteTargetId);
    setDeleteTargetId(null);

    if (!error) {
      setPopup({ show: true, type: 'success', title: 'Deleted', message: 'Fee configuration removed.' });
      fetchFeeStructures();
    }
  };

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-6 text-left font-sans text-slate-900 pb-16">
      
      {/* BEAUTIFUL POPUP MODAL */}
      {popup.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className={`bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border-t-8 text-center space-y-4 ${popup.type === 'success' ? 'border-emerald-600' : 'border-red-600'}`}>
            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center text-3xl font-black ${popup.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              {popup.type === 'success' ? '✓' : '✕'}
            </div>

            <div className="space-y-1">
              <h3 className={`text-lg font-black ${popup.type === 'success' ? 'text-emerald-900' : 'text-red-900'}`}>{popup.title}</h3>
              <p className="text-xs text-gray-600 font-medium">{popup.message}</p>
            </div>

            <button onClick={() => setPopup({ ...popup, show: false })} className={`w-full py-3 rounded-2xl text-xs font-black text-white shadow-md ${popup.type === 'success' ? 'bg-emerald-700' : 'bg-red-700'}`}>
              Continue
            </button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border-t-8 border-amber-500 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full mx-auto flex items-center justify-center text-3xl font-black">⚠️</div>
            <h3 className="text-lg font-black text-slate-900">Confirm Deletion</h3>
            <p className="text-xs text-gray-600 font-medium">Are you sure you want to delete this fee configuration?</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTargetId(null)} className="flex-1 py-3 rounded-2xl text-xs font-black bg-slate-100 text-gray-700">Cancel</button>
              <button onClick={confirmDeleteFeeStructure} className="flex-1 py-3 rounded-2xl text-xs font-black bg-red-600 text-white">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: CLASS FEE & TEMPORARY FUNDS CONFIGURATION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* FORM */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
          <div className="border-b pb-2">
            <h2 className="text-sm font-extrabold text-blue-950">1. Configure Class Fee & Temporary Funds</h2>
            <p className="text-[11px] text-gray-500">Monthly tuition fee auto-generates on 1st of every month. Funds are temporary for current month.</p>
          </div>

          <form onSubmit={handleSaveFeeStructure} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Select Class Section</label>
              <select className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none text-blue-950" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
                <option value="">-- Select Class --</option>
                {classList.map((c) => (
                  <option key={c.id} value={c.id}>{c.class_name} ({c.section_name || 'Section'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Monthly Tuition Fee (Auto-renews 1st of Month)</label>
              <input type="number" placeholder="e.g. 2000" className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 outline-none text-emerald-800" value={tuitionFee} onChange={(e) => setTuitionFee(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Temp. Admission Fee</label>
                <input type="number" placeholder="Optional" className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 outline-none text-blue-900" value={admissionFee} onChange={(e) => setAdmissionFee(e.target.value)} />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Temp. Exam/Lab Fund</label>
                <input type="number" placeholder="Optional" className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 outline-none text-amber-800" value={examFee} onChange={(e) => setExamFee(e.target.value)} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white p-3.5 rounded-2xl font-black transition shadow-md text-xs">
              {loading ? 'Saving...' : 'Save Class Fee Structure'}
            </button>
          </form>
        </div>

        {/* DIRECTORY LIST */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
          <div className="border-b pb-2 flex justify-between items-center">
            <h2 className="text-sm font-extrabold text-blue-950">Active Class Fee Directory</h2>
            <span className="bg-emerald-50 text-emerald-800 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-200">Total: {feeStructures.length}</span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {feeStructures.map((item) => (
              <div key={item.id} className="p-3 bg-slate-50 rounded-2xl border space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-xs text-blue-950 flex items-center gap-1.5">
                    <span>🏫</span> {item.class_name} <span className="text-gray-500 font-normal">({item.section_name})</span>
                  </h4>
                  <button onClick={() => setDeleteTargetId(item.id)} className="bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-lg">Delete</button>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[10px] font-bold font-mono">
                  <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-200">Monthly Tuition: Rs. {item.tuition_fee}</span>
                  <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md border border-blue-200">Temp Admission: Rs. {item.admission_fee || 0}</span>
                  <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200">Temp Exam: Rs. {item.exam_fee || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* SECTION 2: STUDENT FEE CONCESSION / DISCOUNT MODULE */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-sm font-extrabold text-blue-950">2. Student Fee Concession / Discount Control</h2>
          <p className="text-[11px] text-gray-500">Filter by Class, Search Student, and assign special monthly fee discount</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* CONCESSION FORM WITH CLASS FILTER & SEARCH */}
          <form onSubmit={handleSaveConcession} className="space-y-3 text-xs">
            
            {/* 1. SELECT CLASS FIRST */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">1. Select Class Section</label>
              <select
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none text-blue-950"
                value={concessClassId}
                onChange={(e) => {
                  setConcessClassId(e.target.value);
                  setSelectedStudentId(''); // Reset selected student when class changes
                }}
              >
                <option value="">All Classes ({studentsList.length} Students)</option>
                {classList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_name} ({c.section_name || 'Section'})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. SEARCH STUDENT INPUT */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">2. Search Student / Father Name</label>
              <input
                type="text"
                placeholder="Type Student Name, Father Name, or Roll No..."
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 text-slate-800 outline-none focus:border-blue-950"
                value={concessSearchQuery}
                onChange={(e) => setConcessSearchQuery(e.target.value)}
              />
            </div>

            {/* 3. SELECT FILTERED STUDENT */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                3. Choose Student ({filteredConcessStudents.length} Found)
              </label>
              <select
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none text-blue-950"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                required
              >
                <option value="">-- Choose Student --</option>
                {filteredConcessStudents.map((st) => (
                  <option key={st.id} value={st.id}>
                    Roll #{st.roll_no || '-'} - {st.full_name} S/O {st.father_name || 'N/A'} ({st.classes?.class_name})
                  </option>
                ))}
              </select>
            </div>

            {/* 4. DISCOUNT AMOUNT */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Monthly Concession / Discount Amount (PKR)</label>
              <input
                type="number"
                placeholder="e.g. 500"
                className="w-full p-2.5 border rounded-xl font-mono font-bold bg-slate-50 text-rose-800 outline-none"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                required
              />
            </div>

            {/* 5. REASON */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Reason / Notes</label>
              <input
                type="text"
                placeholder="e.g. Orphan Discount / Teacher Child / Need-based"
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 text-slate-800 outline-none"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-950 hover:bg-blue-900 text-white p-3.5 rounded-2xl font-black transition shadow-md text-xs">
              Save Student Concession
            </button>
          </form>

          {/* ACTIVE DISCOUNTS LIST */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h3 className="text-xs font-black text-slate-700">Assigned Concessions Roster ({concessionsList.length})</h3>
            {concessionsList.map((conc) => (
              <div key={conc.id} className="p-3 bg-slate-50 rounded-2xl border flex justify-between items-center text-xs">
                <div>
                  <b className="text-blue-950 font-extrabold block">
                    Roll #{conc.students?.roll_no || '-'} - {conc.students?.full_name}
                  </b>
                  <span className="text-[10px] text-gray-500 font-medium">
                    S/O: {conc.students?.father_name || 'N/A'} | Class: {conc.students?.classes?.class_name}
                  </span>
                  <p className="text-[10px] text-slate-600 font-bold italic mt-0.5">Note: {conc.reason}</p>
                </div>
                <div className="text-right">
                  <span className="bg-rose-100 text-rose-900 font-mono font-black text-xs px-2.5 py-1 rounded-xl border border-rose-200 block">
                    - Rs. {conc.discount_amount}
                  </span>
                  <button onClick={async () => { await supabase.from('student_fee_concessions').delete().eq('id', conc.id); fetchConcessions(); }} className="text-[10px] text-rose-600 font-bold underline mt-1 block">Remove</button>
                </div>
              </div>
            ))}
            {concessionsList.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-12">No concessions assigned yet.</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}