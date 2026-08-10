'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AssignClassAndSubjectPage() {
  const [loading, setLoading] = useState(false);

  // Database Dropdown Lists
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [masterSubjectsList, setMasterSubjectsList] = useState<any[]>([]);
  const [assignmentsList, setAssignmentsList] = useState<any[]>([]);

  // Selection Inputs
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

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
    const { data: tData } = await supabase
      .from('staff')
      .select('id, full_name, registration_no')
      .eq('is_active', true);
    if (tData) setTeachersList(tData);

    const { data: cData } = await supabase.from('classes').select('*');
    if (cData) setClassesList(cData);

    const { data: sData } = await supabase.from('subjects').select('*');
    if (sData) setMasterSubjectsList(sData);

    fetchAssignments();
  };

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from('teacher_assignments')
      .select(`
        id,
        subject_name,
        staff:staff_id(full_name, registration_no),
        classes:class_id(class_name, section_name)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAssignmentsList(data);
    }
  };

  // Assign Subject Handler
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId || !selectedClassId || !selectedSubject) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Missing Information',
        message: 'Please select Teacher, Class, and Subject!',
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('teacher_assignments').insert([
      {
        staff_id: selectedTeacherId,
        class_id: selectedClassId,
        subject_name: selectedSubject,
      },
    ]);

    setLoading(false);

    if (error) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Assignment Failed',
        message: error.message,
      });
      return;
    }

    setPopup({
      show: true,
      type: 'success',
      title: 'Successfully Assigned!',
      message: 'Subject and class successfully assigned to the selected teacher.',
    });

    setSelectedSubject('');
    fetchAssignments();
  };

  // Remove Assignment Handler
  const handleRemoveAssignment = async (id: string) => {
    const { error } = await supabase.from('teacher_assignments').delete().eq('id', id);
    if (!error) {
      setPopup({
        show: true,
        type: 'success',
        title: 'Assignment Removed',
        message: 'Teacher assignment removed successfully.',
      });
      fetchAssignments();
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
              <h3 className={`text-lg font-black ${
                popup.type === 'success' ? 'text-emerald-900' : 'text-red-900'
              }`}>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* 1. ASSIGNMENT FORM */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
          <div className="border-b pb-2">
            <h2 className="text-sm font-extrabold text-blue-900">
              Assign Subjects to Teacher
            </h2>
            <p className="text-[11px] text-gray-500">
              Select registered teacher, class section and subject
            </p>
          </div>

          <form onSubmit={handleAssign} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Select Teacher</label>
              <select
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none text-blue-900 focus:border-blue-900"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
              >
                <option value="">-- Select Registered Teacher --</option>
                {teachersList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({t.registration_no})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Select Class & Section</label>
              <select
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none focus:border-blue-900"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                <option value="">-- Select Class --</option>
                {classesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_name} ({c.section_name || 'A'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Select Teaching Subject</label>
              <select
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none focus:border-blue-900"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="">-- Select Subject --</option>
                {masterSubjectsList.map((s) => (
                  <option key={s.id} value={s.subject_name}>
                    {s.subject_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white p-3 rounded-xl font-black transition shadow-md disabled:opacity-50 text-xs"
            >
              {loading ? 'Assigning...' : '+ Assign Subject to Teacher'}
            </button>
          </form>
        </div>

        {/* 2. LIVE ASSIGNED DIRECTORY */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
          <div className="border-b pb-2 flex justify-between items-center">
            <h2 className="text-sm font-extrabold text-blue-900">
              Assigned Classes Directory
            </h2>
            <span className="bg-blue-50 text-blue-900 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-blue-200">
              Total: {assignmentsList.length}
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {assignmentsList.map((item) => (
              <div key={item.id} className="p-3 bg-slate-50 rounded-2xl border flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-xs text-gray-900">
                    👨‍🏫 {item.staff?.full_name || 'Teacher'} <span className="text-gray-400 font-normal">({item.staff?.registration_no})</span>
                  </h4>
                  <p className="text-[11px] font-bold text-blue-900">
                    🏫 Class: {item.classes?.class_name} ({item.classes?.section_name || 'A'})
                  </p>
                  <span className="inline-block bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-black px-2 py-0.5 rounded-md">
                    📚 Subject: {item.subject_name}
                  </span>
                </div>

                <button
                  onClick={() => handleRemoveAssignment(item.id)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[10px] font-bold px-2.5 py-1 rounded-xl transition font-mono"
                >
                  Remove
                </button>
              </div>
            ))}

            {assignmentsList.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8 font-medium">
                No active teacher assignments in database yet.
              </p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}