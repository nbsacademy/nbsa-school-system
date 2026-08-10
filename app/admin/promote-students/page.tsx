'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function PromoteStudentsPage() {
  const [loading, setLoading] = useState(false);

  // Live Database Data
  const [classesList, setClassesList] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Class Selectors
  const [fromClassId, setFromClassId] = useState('');
  const [toClassId, setToClassId] = useState('');

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
    fetchClasses();
  }, []);

  // Fetch Live Classes from Supabase
  const fetchClasses = async () => {
    const { data, error } = await supabase.from('classes').select('*').order('created_at', { ascending: true });
    if (!error && data) {
      setClassesList(data);
      if (data.length > 0) {
        setFromClassId(data[0].id);
        if (data.length > 1) setToClassId(data[1].id);
      }
    }
  };

  // Fetch Students of Selected 'From Class'
  useEffect(() => {
    if (fromClassId) {
      fetchStudentsByClass(fromClassId);
    } else {
      setStudentsList([]);
    }
  }, [fromClassId]);

  const fetchStudentsByClass = async (cId: string) => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', cId)
      .eq('is_active', true)
      .order('roll_no', { ascending: true });

    if (!error && data) {
      setStudentsList(data);
      setSelectedStudentIds([]); // Reset selected checkboxes
    }
  };

  // Checkbox Selection
  const handleSelectAll = () => {
    if (selectedStudentIds.length === studentsList.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(studentsList.map((s) => s.id));
    }
  };

  const handleToggleStudent = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter((item) => item !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  // Handle Promote Action
  const handlePromoteStudents = async () => {
    if (!fromClassId || !toClassId) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Class Selection Required',
        message: 'Please select both current and target promote class!',
      });
      return;
    }

    if (fromClassId === toClassId) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Invalid Selection',
        message: 'Promote To class must be different from Promote From class!',
      });
      return;
    }

    if (selectedStudentIds.length === 0) {
      setPopup({
        show: true,
        type: 'error',
        title: 'No Students Selected',
        message: 'Please select at least one student to promote!',
      });
      return;
    }

    setLoading(true);

    // Update class_id for selected students in students table
    const { error } = await supabase
      .from('students')
      .update({ class_id: toClassId })
      .in('id', selectedStudentIds);

    setLoading(false);

    if (error) {
      setPopup({
        show: true,
        type: 'error',
        title: 'Promotion Failed',
        message: error.message,
      });
      return;
    }

    const targetClassObj = classesList.find((c) => c.id === toClassId);
    const targetClassName = targetClassObj ? `${targetClassObj.class_name} (${targetClassObj.section_name || 'A'})` : 'Next Class';

    setPopup({
      show: true,
      type: 'success',
      title: 'Students Promoted Successfully!',
      message: `${selectedStudentIds.length} student(s) promoted to ${targetClassName}. Database class records updated.`,
    });

    // Refresh list for current class
    fetchStudentsByClass(fromClassId);
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

      {/* Main Container */}
      <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border space-y-5">
        
        {/* Title */}
        <div className="border-b pb-2">
          <h2 className="text-lg md:text-xl font-black text-blue-900">
            Promote Students Module
          </h2>
          <p className="text-[11px] text-gray-500">
            Promote students from current academic class to next class in database
          </p>
        </div>

        {/* Class Selection Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border">
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Promote From Class
            </label>
            <select
              className="w-full p-2.5 border rounded-xl font-bold bg-white outline-none text-blue-900 focus:border-blue-900"
              value={fromClassId}
              onChange={(e) => setFromClassId(e.target.value)}
            >
              <option value="">-- Select Current Class --</option>
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_name} ({c.section_name || 'A'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Promote To Class
            </label>
            <select
              className="w-full p-2.5 border rounded-xl font-bold bg-white outline-none text-emerald-800 focus:border-blue-900"
              value={toClassId}
              onChange={(e) => setToClassId(e.target.value)}
            >
              <option value="">-- Select Target Class --</option>
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_name} ({c.section_name || 'A'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Students List Directory */}
        <div className="space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">
              Students List ({studentsList.length})
            </h3>

            {studentsList.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl hover:bg-blue-100 transition"
              >
                {selectedStudentIds.length === studentsList.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {studentsList.map((student) => {
              const isSelected = selectedStudentIds.includes(student.id);
              return (
                <div
                  key={student.id}
                  onClick={() => handleToggleStudent(student.id)}
                  className={`p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                    isSelected ? 'bg-blue-50/80 border-blue-400 shadow-sm' : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Handled by parent div
                      className="w-4 h-4 accent-blue-900 rounded cursor-pointer"
                    />
                    <div>
                      <h4 className="font-extrabold text-xs text-gray-900">
                        {student.full_name} <span className="text-emerald-700 font-bold">(Roll No: {student.roll_no || '-'})</span>
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Reg No: <b className="font-mono text-blue-900">{student.registration_no || student.admission_no}</b> | Father: <b>{student.father_name || '-'}</b>
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold bg-slate-100 text-gray-600 px-2.5 py-1 rounded-lg border font-mono">
                    Class ID: {student.class_id ? 'Assigned' : 'None'}
                  </span>
                </div>
              );
            })}

            {studentsList.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-10 font-medium">
                No active students found in this selected class.
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        {studentsList.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={handlePromoteStudents}
              disabled={loading}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white p-3.5 rounded-2xl font-black text-xs transition shadow-md disabled:opacity-50"
            >
              {loading
                ? 'Promoting Students in Database...'
                : `Promote Selected (${selectedStudentIds.length}) Students`}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}