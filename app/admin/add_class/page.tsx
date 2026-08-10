'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AddClassAndSubjectPage() {
  const [loadingClass, setLoadingClass] = useState(false);
  const [loadingSubject, setLoadingSubject] = useState(false);

  // Real Database Lists
  const [classesList, setClassesList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);

  // Input States
  const [classNameInput, setClassNameInput] = useState('');
  const [sectionNameInput, setSectionNameInput] = useState('');
  const [subjectNameInput, setSubjectNameInput] = useState('');

  // Fetch Live Data on Page Load
  useEffect(() => {
    fetchClassesAndSubjects();
  }, []);

  const fetchClassesAndSubjects = async () => {
    // 1. Fetch Classes
    const { data: cData, error: cErr } = await supabase
      .from('classes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!cErr && cData) {
      setClassesList(cData);
    }

    // 2. Fetch Subjects
    const { data: sData, error: sErr } = await supabase
      .from('subjects')
      .select('*')
      .order('created_at', { ascending: false });

    if (!sErr && sData) {
      setSubjectsList(sData);
    }
  };

  // Add Class & Section to Supabase Database
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classNameInput.trim()) {
      alert('Please enter class name!');
      return;
    }

    setLoadingClass(true);

    const { error } = await supabase.from('classes').insert([
      {
        class_name: classNameInput.trim(),
        section_name: sectionNameInput.trim() || 'A',
      },
    ]);

    setLoadingClass(false);

    if (error) {
      alert('Error saving class: ' + error.message);
      return;
    }

    setClassNameInput('');
    setSectionNameInput('');
    alert('Class & Section Saved to Database!');
    fetchClassesAndSubjects(); // Refresh list from live DB
  };

  // Add Master Subject to Supabase Database
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectNameInput.trim()) {
      alert('Please enter subject name!');
      return;
    }

    setLoadingSubject(true);

    const { error } = await supabase.from('subjects').insert([
      {
        subject_name: subjectNameInput.trim(),
      },
    ]);

    setLoadingSubject(false);

    if (error) {
      alert('Error saving subject: ' + error.message);
      return;
    }

    setSubjectNameInput('');
    alert('Subject Saved to Database!');
    fetchClassesAndSubjects(); // Refresh list from live DB
  };

  // Delete Class
  const handleDeleteClass = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    await supabase.from('classes').delete().eq('id', id);
    fetchClassesAndSubjects();
  };

  // Delete Subject
  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    await supabase.from('subjects').delete().eq('id', id);
    fetchClassesAndSubjects();
  };

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-5 text-left font-sans text-slate-900">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* 1. MANAGE CLASSES & SECTIONS */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
          <div className="border-b pb-2">
            <h2 className="text-sm font-extrabold text-blue-900">
              1. Manage Classes & Sections
            </h2>
            <p className="text-[11px] text-gray-500">
              Add Class Name and Section separately for database indexing
            </p>
          </div>

          <form onSubmit={handleAddClass} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Class Name</label>
              <input
                type="text"
                placeholder="e.g. 9th, 10th"
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none focus:border-blue-900"
                value={classNameInput}
                onChange={(e) => setClassNameInput(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Section Name</label>
              <input
                type="text"
                placeholder="e.g. Science A, Commerce"
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none focus:border-blue-900"
                value={sectionNameInput}
                onChange={(e) => setSectionNameInput(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loadingClass}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white p-2.5 rounded-xl font-black transition shadow-sm disabled:opacity-50"
            >
              {loadingClass ? 'Saving...' : '+ Save Class & Section'}
            </button>
          </form>

          {/* Saved Classes List */}
          <div className="pt-2 border-t">
            <h3 className="text-xs font-bold text-gray-600 mb-2">
              Saved Classes ({classesList.length})
            </h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {classesList.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-slate-50 border rounded-xl text-xs font-bold">
                  <span className="text-blue-900">
                    {item.class_name} <span className="text-gray-500 font-normal">({item.section_name || 'A'})</span>
                  </span>
                  <button
                    onClick={() => handleDeleteClass(item.id)}
                    className="text-red-600 hover:text-red-800 text-[10px] bg-red-50 px-2 py-0.5 rounded-lg border border-red-200 font-bold"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {classesList.length === 0 && (
                <p className="text-[11px] text-gray-400 text-center py-2">No classes added yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* 2. MASTER SUBJECTS DIRECTORY */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
          <div className="border-b pb-2">
            <h2 className="text-sm font-extrabold text-blue-900">
              2. Master Subjects Directory
            </h2>
            <p className="text-[11px] text-gray-500">
              Add subjects here to use across all classes and academic portals
            </p>
          </div>

          <form onSubmit={handleAddSubject} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Subject Name</label>
              <input
                type="text"
                placeholder="e.g. Physics, Chemistry, Math"
                className="w-full p-2.5 border rounded-xl font-bold bg-slate-50 outline-none focus:border-rose-700"
                value={subjectNameInput}
                onChange={(e) => setSubjectNameInput(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loadingSubject}
              className="w-full bg-rose-700 hover:bg-rose-800 text-white p-2.5 rounded-xl font-black transition shadow-sm disabled:opacity-50"
            >
              {loadingSubject ? 'Saving...' : '+ Save Subject to Master List'}
            </button>
          </form>

          {/* Saved Subjects List */}
          <div className="pt-2 border-t">
            <h3 className="text-xs font-bold text-gray-600 mb-2">
              Saved Master Subjects ({subjectsList.length})
            </h3>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {subjectsList.map((sub) => (
                <span
                  key={sub.id}
                  className="bg-slate-100 border text-gray-800 text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5"
                >
                  <span>{sub.subject_name}</span>
                  <button
                    onClick={() => handleDeleteSubject(sub.id)}
                    className="text-red-500 hover:text-red-700 font-black text-[11px]"
                  >
                    ✕
                  </button>
                </span>
              ))}
              {subjectsList.length === 0 && (
                <p className="text-[11px] text-gray-400 text-center py-2 w-full">No subjects added yet.</p>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}