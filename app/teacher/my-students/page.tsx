'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function MyClassStudentsPage() {
  const [loading, setLoading] = useState(false);

  // Live Database States
  const [classesList, setClassesList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchClassesAndStudents();
  }, []);

  // Initial Fetching Classes and All Students from Supabase
  const fetchClassesAndStudents = async () => {
    setLoading(true);

    // 1. Fetch Classes List
    const { data: cData } = await supabase
      .from('classes')
      .select('*')
      .order('class_name', { ascending: true });

    let defaultClassId = '';
    if (cData && cData.length > 0) {
      setClassesList(cData);
      defaultClassId = cData[0].id;
      setSelectedClassId(defaultClassId);
    }

    // 2. Fetch All Students List
    const { data: stData } = await supabase
      .from('students')
      .select('*')
      .order('full_name', { ascending: true });

    const rawStudents = stData || [];
    setAllStudents(rawStudents);

    // Apply initial filter
    if (defaultClassId) {
      filterStudentsList(defaultClassId, '', cData || [], rawStudents);
    } else {
      setFilteredStudents(rawStudents);
    }

    setLoading(false);
  };

  // Smart Filter Logic for Selected Class & Search Query
  const filterStudentsList = (
    classId: string,
    queryStr: string,
    classesArr: any[] = classesList,
    studentsArr: any[] = allStudents
  ) => {
    const selectedClassObj = classesArr.find((c) => c.id === classId);

    let result = studentsArr.filter((st) => {
      // Class/Section Matching Logic
      let matchesClass = false;
      if (selectedClassObj) {
        const selSection = (selectedClassObj.section_name || selectedClassObj.class_name || '').trim().toLowerCase();
        const stSection = (st.section_name || '').trim().toLowerCase();

        if (stSection && selSection) {
          matchesClass = stSection === selSection;
        } else {
          matchesClass = st.class_id === classId;
        }
      } else {
        matchesClass = true;
      }

      return matchesClass;
    });

    // Search Query Matching Logic (Name or Reg/Admission No)
    if (queryStr.trim()) {
      const q = queryStr.trim().toLowerCase();
      result = result.filter(
        (st) =>
          (st.full_name && st.full_name.toLowerCase().includes(q)) ||
          (st.registration_no && st.registration_no.toLowerCase().includes(q)) ||
          (st.admission_no && st.admission_no.toLowerCase().includes(q)) ||
          (st.father_name && st.father_name.toLowerCase().includes(q))
      );
    }

    setFilteredStudents(result);
  };

  // Handle Class Selection Change
  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    filterStudentsList(newClassId, searchQuery);
  };

  // Handle Search Input Change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    filterStudentsList(selectedClassId, query);
  };

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-6">
      
      {/* 1. TOP HEADER & FILTER CONTROLS */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        
        <div className="flex justify-between items-center flex-wrap gap-2 border-b pb-3">
          <div>
            <h2 className="text-xl font-black text-blue-950">My Class Students</h2>
            <p className="text-xs text-gray-500">
              Select class & section to view enrolled student directory
            </p>
          </div>

          <span className="bg-blue-50 text-blue-900 border border-blue-200 text-xs font-black px-4 py-1.5 rounded-full shadow-sm">
            Total Students: <b className="text-sm font-mono">{filteredStudents.length}</b>
          </span>
        </div>

        {/* Controls Row: Class Select & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          
          <div>
            <label className="block font-bold text-gray-700 mb-1">Select Class & Section</label>
            <select
              className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-blue-900 outline-none transition focus:border-blue-700"
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
            >
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_name} ({c.section_name || 'Section A'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Search Student</label>
            <input
              type="text"
              placeholder="Search by name, father name or reg no..."
              className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none transition focus:border-blue-700"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

        </div>

      </div>

      {/* 2. ENROLLED STUDENTS GRID LIST */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest border-b pb-2">
          ENROLLED STUDENTS LIST ({filteredStudents.length})
        </h3>

        {filteredStudents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredStudents.map((st, idx) => {
              const phoneNum = st.whatsapp || st.phone || '';
              const cleanPhone = phoneNum.replace(/[^0-9]/g, '');

              return (
                <div
                  key={st.id || idx}
                  className="p-4 bg-slate-50 hover:bg-slate-100/90 rounded-2xl border flex items-center justify-between flex-wrap gap-3 transition shadow-sm"
                >
                  {/* Left Student Info */}
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 bg-blue-900 text-white rounded-xl flex items-center justify-center font-black text-xs font-mono shrink-0">
                      {st.roll_no || idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-blue-950 text-sm">{st.full_name}</h4>
                        <span className="bg-slate-200 text-slate-800 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md">
                          {st.registration_no || st.admission_no || 'Reg-N/A'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        S/O: <b className="text-gray-700">{st.father_name || '-'}</b>
                      </p>
                      {phoneNum && (
                        <p className="text-[11px] text-gray-400 font-medium">
                          Parent: {phoneNum}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex items-center gap-2">
                    {phoneNum ? (
                      <>
                        <a
                          href={`https://wa.me/92${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-extrabold rounded-xl transition flex items-center gap-1"
                        >
                          <span>💬</span> WhatsApp
                        </a>

                        <a
                          href={`tel:${phoneNum}`}
                          className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-extrabold rounded-xl transition flex items-center gap-1"
                        >
                          <span>📞</span> Call
                        </a>
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-bold bg-slate-200 px-2 py-1 rounded-lg">
                        No Phone
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed">
            {loading ? 'Loading live students...' : 'No enrolled students found matching selected class or search query.'}
          </div>
        )}

      </div>

    </div>
  );
}