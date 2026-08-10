'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TeacherTimetablePage() {
  const [loading, setLoading] = useState(false);
  const [activeDay, setActiveDay] = useState('Monday');

  // Live Database States
  const [classesList, setClassesList] = useState<any[]>([]);
  const [allTimetables, setAllTimetables] = useState<any[]>([]);
  const [filterClassId, setFilterClassId] = useState('');

  // Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formClassId, setFormClassId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('08:45');
  const [roomNo, setRoomNo] = useState('Room 1');

  // Alert / Message State
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch Classes & All Timetable Entries
  const fetchInitialData = async () => {
    setLoading(true);

    // 1. Fetch Classes
    const { data: cData } = await supabase.from('classes').select('*').order('class_name', { ascending: true });
    if (cData && cData.length > 0) {
      setClassesList(cData);
      setFilterClassId(cData[0].id);
      setFormClassId(cData[0].id);
    }

    // 2. Fetch All Timetables
    await fetchTimetables();

    setLoading(false);
  };

  const fetchTimetables = async () => {
    const { data } = await supabase
      .from('timetables')
      .select('*, classes(class_name, section_name), staff(full_name)')
      .order('start_time', { ascending: true });

    if (data) setAllTimetables(data);
  };

  // Check Time Conflict Overlap
  const checkTimeConflict = (newClassId: string, day: string, newStart: string, newEnd: string, currentEditId: string | null) => {
    const startVal = newStart.replace(':', '');
    const endVal = newEnd.replace(':', '');

    if (parseInt(endVal) <= parseInt(startVal)) {
      return 'End time must be after Start time!';
    }

    // Find any existing period for the SAME CLASS on the SAME DAY that overlaps
    for (const item of allTimetables) {
      if (currentEditId && item.id === currentEditId) continue; // Skip self if editing

      if (item.class_id === newClassId && item.day_of_week === day) {
        const itemStart = item.start_time.substring(0, 5).replace(':', '');
        const itemEnd = item.end_time.substring(0, 5).replace(':', '');

        // Overlap Condition: (StartA < EndB) AND (EndA > StartB)
        if (parseInt(startVal) < parseInt(itemEnd) && parseInt(endVal) > parseInt(itemStart)) {
          const teacherName = item.staff?.full_name || 'Another Teacher';
          return `Time Slot Clash! This class is already assigned to ${teacherName} (${item.subject_name}) from ${item.start_time.substring(0, 5)} to ${item.end_time.substring(0, 5)}.`;
        }
      }
    }

    return null; // No Conflict
  };

  // Add / Update Schedule
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    if (!formClassId || !subjectName.trim()) {
      setAlert({ type: 'error', msg: 'Please select class and enter subject name.' });
      return;
    }

    // 1. Check for Conflicts
    const conflictError = checkTimeConflict(formClassId, activeDay, startTime, endTime, editingId);
    if (conflictError) {
      setAlert({ type: 'error', msg: conflictError });
      return;
    }

    setLoading(true);

    const storedTeacherId = localStorage.getItem('user_id');

    const payload = {
      class_id: formClassId,
      teacher_id: storedTeacherId || null,
      subject_name: subjectName.trim(),
      day_of_week: activeDay,
      start_time: startTime,
      end_time: endTime,
      room_no: roomNo.trim() || 'Room 1',
    };

    if (editingId) {
      // Update
      const { error } = await supabase.from('timetables').update(payload).eq('id', editingId);
      if (error) {
        setAlert({ type: 'error', msg: error.message });
      } else {
        setAlert({ type: 'success', msg: 'Timetable period updated successfully!' });
        resetForm();
      }
    } else {
      // Insert
      const { error } = await supabase.from('timetables').insert([payload]);
      if (error) {
        setAlert({ type: 'error', msg: error.message });
      } else {
        setAlert({ type: 'success', msg: 'New period added to timetable!' });
        resetForm();
      }
    }

    await fetchTimetables();
    setLoading(false);
  };

  // Edit Trigger
  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setFormClassId(item.class_id);
    setSubjectName(item.subject_name);
    setStartTime(item.start_time.substring(0, 5));
    setEndTime(item.end_time.substring(0, 5));
    setRoomNo(item.room_no || 'Room 1');
    setActiveDay(item.day_of_week);
    window.scrollTo({ top: 500, behavior: 'smooth' });
  };

  // Delete Period
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this period?')) return;

    setLoading(true);
    const { error } = await supabase.from('timetables').delete().eq('id', id);
    if (error) {
      setAlert({ type: 'error', msg: error.message });
    } else {
      setAlert({ type: 'success', msg: 'Period deleted successfully.' });
      if (editingId === id) resetForm();
      await fetchTimetables();
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setSubjectName('');
    setStartTime('08:00');
    setEndTime('08:45');
    setRoomNo('Room 1');
  };

  // Filter Active Periods for Selected Day and Selected Class
  const currentPeriods = allTimetables.filter(
    (t) => t.day_of_week === activeDay && (filterClassId ? t.class_id === filterClassId : true)
  );

  return (
    <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-6">
      
      {/* 1. TOP SECTION: FILTER & TIMETABLE LIST */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-5">
        
        <div className="flex justify-between items-center flex-wrap gap-3 border-b pb-4">
          <div>
            <h2 className="text-xl font-black text-blue-950">Class Timetable Schedule</h2>
            <p className="text-xs text-gray-500">Manage daily period slots and subject allocations</p>
          </div>

          {/* Select Filter Class */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-600">Select Class:</span>
            <select
              className="p-2 border rounded-xl font-bold text-xs bg-slate-50 text-blue-900 outline-none"
              value={filterClassId}
              onChange={(e) => {
                setFilterClassId(e.target.value);
                setFormClassId(e.target.value);
              }}
            >
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_name} ({c.section_name || 'Section A'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Day Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition whitespace-nowrap ${
                activeDay === day
                  ? 'bg-blue-900 text-white shadow-md'
                  : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Live Periods List */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">
              {activeDay.toUpperCase()} PERIODS ({currentPeriods.length})
            </h3>
          </div>

          {currentPeriods.length > 0 ? (
            <div className="space-y-2.5">
              {currentPeriods.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border flex items-center justify-between flex-wrap gap-3 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 bg-blue-900 text-white rounded-xl flex items-center justify-center font-black text-xs">
                      P-{idx + 1}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-blue-950 text-sm">{item.subject_name}</h4>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        ⏱ {item.start_time.substring(0, 5)} - {item.end_time.substring(0, 5)} | 📍 {item.room_no || 'Room 1'} | 👨‍🏫 {item.staff?.full_name || 'Teacher'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed">
              No periods scheduled for {activeDay} yet. Use the form below to add one.
            </div>
          )}
        </div>

      </div>

      {/* 2. ADD / EDIT PERIOD FORM SECTION */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4">
        
        <div className="border-b pb-3 flex justify-between items-center">
          <div>
            <h3 className="text-base font-black text-blue-950">
              {editingId ? '✏️ Edit Period Slot' : '➕ Add New Period Slot'}
            </h3>
            <p className="text-[11px] text-gray-500">
              Selected Day: <b className="text-blue-900">{activeDay}</b>
            </p>
          </div>

          {editingId && (
            <button
              onClick={resetForm}
              className="text-xs font-bold text-gray-500 hover:text-gray-800 underline"
            >
              Cancel Edit
            </button>
          )}
        </div>

        {alert && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold border ${
              alert.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {alert.type === 'error' ? '⚠️ ' : '✓ '} {alert.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          
          {/* Class Select */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Class & Section</label>
            <select
              className="w-full p-3 border rounded-xl font-bold bg-slate-50 outline-none text-blue-900"
              value={formClassId}
              onChange={(e) => setFormClassId(e.target.value)}
            >
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_name} ({c.section_name || 'Section A'})
                </option>
              ))}
            </select>
          </div>

          {/* Subject Name */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Subject Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Physics, Chemistry, Math"
              className="w-full p-3 border rounded-xl font-bold bg-slate-50 outline-none text-slate-900"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
            />
          </div>

          {/* Room No */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Room / Lab No</label>
            <input
              type="text"
              placeholder="e.g. Room 9 or Lab 1"
              className="w-full p-3 border rounded-xl font-bold bg-slate-50 outline-none text-slate-900"
              value={roomNo}
              onChange={(e) => setRoomNo(e.target.value)}
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Start Time</label>
            <input
              type="time"
              required
              className="w-full p-3 border rounded-xl font-bold bg-slate-50 outline-none text-slate-900"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">End Time</label>
            <input
              type="time"
              required
              className="w-full p-3 border rounded-xl font-bold bg-slate-50 outline-none text-slate-900"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className={`w-full p-3.5 rounded-xl font-black text-xs text-white transition shadow-md ${
                editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-900 hover:bg-blue-800'
              }`}
            >
              {loading ? 'Saving...' : editingId ? 'Update Period Slot' : 'Add Period to Timetable'}
            </button>
          </div>

        </form>

      </div>

    </div>
  );
}