'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminAdmissionFormPage() {
  const [loading, setLoading] = useState(false);
  const [classesList, setClassesList] = useState<any[]>([]);

  // Form Field States
  const [admissionNo, setAdmissionNo] = useState('');
  const [rollNo, setRollNo] = useState<number>(1);
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [sectionName, setSectionName] = useState('A Girls');
  const [dob, setDob] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [bFormNumber, setBFormNumber] = useState('');
  const [address, setAddress] = useState('');

  // Image & Compression States
  const [studentPhoto, setStudentPhoto] = useState<string>('');
  const [photoSizeKb, setPhotoSizeKb] = useState<number | null>(null);
  const [compressing, setCompressing] = useState(false);

  // Alert State
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    fetchClassesAndAutoNumbers();
  }, []);

  // Fetch Classes and Calculate Max Auto Numbers
  const fetchClassesAndAutoNumbers = async () => {
    setLoading(true);

    const { data: cData } = await supabase.from('classes').select('*').order('class_name', { ascending: true });
    
    let defaultClassId = '';
    if (cData && cData.length > 0) {
      setClassesList(cData);
      defaultClassId = cData[0].id;
      setSelectedClassId(defaultClassId);
      setSectionName(cData[0].section_name || 'Section A');
    }

    await calculateNextAutoNumbers(defaultClassId, cData || []);

    setLoading(false);
  };

  // 🚀 SMART MAX NUMBER CALCULATION
  const calculateNextAutoNumbers = async (classId: string, currentClasses: any[] = classesList) => {
    const { data: allStudents } = await supabase
      .from('students')
      .select('admission_no, registration_no');

    let maxAddNum = 0;
    if (allStudents && allStudents.length > 0) {
      allStudents.forEach((st) => {
        const str = st.admission_no || st.registration_no || '';
        const digits = str.replace(/[^0-9]/g, '');
        if (digits) {
          const num = parseInt(digits.slice(-4), 10);
          if (!isNaN(num) && num > maxAddNum) {
            maxAddNum = num;
          }
        }
      });
    }

    const nextAddSeq = maxAddNum + 1;
    const nextAddNoStr = `A-2026-${String(nextAddSeq).padStart(4, '0')}`;
    setAdmissionNo(nextAddNoStr);

    if (classId) {
      const selectedClassObj = currentClasses.find((c) => c.id === classId);
      const { data: classStudents } = await supabase.from('students').select('roll_no, section_name, class_id');

      let maxRoll = 0;
      let matchedCount = 0;

      if (classStudents && classStudents.length > 0) {
        classStudents.forEach((st) => {
          let matches = false;
          if (selectedClassObj) {
            const selSec = (selectedClassObj.section_name || '').trim().toLowerCase();
            const stSec = (st.section_name || '').trim().toLowerCase();
            if (stSec && selSec) matches = stSec === selSec;
            else matches = st.class_id === classId;
          }

          if (matches) {
            matchedCount++;
            if (st.roll_no && st.roll_no > maxRoll) {
              maxRoll = st.roll_no;
            }
          }
        });
      }

      const nextRoll = maxRoll > 0 ? maxRoll + 1 : matchedCount + 1;
      setRollNo(nextRoll);
    }
  };

  // 🚀 IMAGE COMPRESSION FUNCTION (< 100 KB)
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Max Dimension Constraint (e.g., 500px)
        const MAX_DIM = 500;
        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Compress image using quality loop to strictly keep under 100 KB
        let quality = 0.75;
        let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

        // Base64 length to KB calculation: (length * 3 / 4) / 1024
        while (compressedDataUrl.length > 130000 && quality > 0.1) {
          quality -= 0.08;
          compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        const finalSizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
        setStudentPhoto(compressedDataUrl);
        setPhotoSizeKb(finalSizeKb);
        setCompressing(false);
      };
    };
  };

  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const selectedClassObj = classesList.find((c) => c.id === newClassId);
    if (selectedClassObj) {
      setSectionName(selectedClassObj.section_name || 'Section A');
    }
    calculateNextAutoNumbers(newClassId);
  };

  // Submit Form Data
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    if (!fullName.trim() || !fatherName.trim()) {
      setAlert({ type: 'error', msg: 'Please enter student full name and father name.' });
      return;
    }

    setLoading(true);

    const payload = {
      registration_no: admissionNo,
      admission_no: admissionNo,
      roll_no: rollNo,
      full_name: fullName.trim(),
      father_name: fatherName.trim(),
      class_id: selectedClassId,
      section_name: sectionName,
      whatsapp: whatsappNumber.trim() || parentPhone.trim(),
      address: address.trim(),
      photo_url: studentPhoto || null, // Saved base64 compressed photo
      is_active: true,
    };

    const { error } = await supabase.from('students').insert([payload]);

    setLoading(false);

    if (error) {
      setAlert({ type: 'error', msg: error.message });
    } else {
      setAlert({ type: 'success', msg: `Student ${fullName} admitted successfully with Reg No ${admissionNo}!` });
      
      // Reset Form Fields
      setFullName('');
      setFatherName('');
      setDob('');
      setParentPhone('');
      setWhatsappNumber('');
      setBFormNumber('');
      setAddress('');
      setStudentPhoto('');
      setPhotoSizeKb(null);

      await calculateNextAutoNumbers(selectedClassId);
    }
  };

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-6 font-sans">
      
      <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-5">
        
        {/* Header Title & Badge */}
        <div className="flex justify-between items-center flex-wrap gap-2 border-b pb-4">
          <div>
            <h2 className="text-xl font-black text-blue-950">Admission Form</h2>
            <p className="text-xs text-gray-500">Register new student into the academy database</p>
          </div>

          <span className="bg-slate-100 text-slate-800 border border-slate-300 text-xs font-mono font-extrabold px-3.5 py-1.5 rounded-full shadow-sm">
            Auto Admission No: <b className="text-blue-900">{admissionNo || 'Loading...'}</b>
          </span>
        </div>

        {alert && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold border ${
              alert.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {alert.type === 'error' ? '⚠️ ' : '✓ '} {alert.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          
          {/* 🚀 PHOTO UPLOAD & AUTO COMPRESS SECTION */}
          <div className="p-4 bg-slate-50 border rounded-2xl flex items-center gap-4 flex-wrap">
            <div className="w-20 h-24 bg-white border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              {studentPhoto ? (
                <img src={studentPhoto} alt="Student Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl text-slate-400">📷</span>
              )}
            </div>

            <div className="space-y-1">
              <label className="block font-extrabold text-blue-950">Student Passport Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-900 file:text-white hover:file:bg-blue-800 cursor-pointer"
              />
              {compressing && <p className="text-[11px] font-bold text-amber-600">Compressing image under 100 KB...</p>}
              {photoSizeKb !== null && !compressing && (
                <p className="text-[11px] font-black text-emerald-700">
                  ✓ Photo compressed successfully: <b>{photoSizeKb} KB</b> (&lt; 100 KB)
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Admission / Reg No */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Admission / Reg No</label>
              <input
                type="text"
                readOnly
                className="w-full p-3 border rounded-2xl font-bold font-mono bg-slate-100 text-blue-950 outline-none cursor-not-allowed"
                value={admissionNo}
              />
            </div>

            {/* Class Roll No (Auto) */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Class Roll No (Auto)</label>
              <input
                type="number"
                readOnly
                className="w-full p-3 border rounded-2xl font-bold font-mono bg-slate-100 text-blue-950 outline-none cursor-not-allowed"
                value={rollNo}
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="Student Full Name"
                className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            {/* Father Name */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Father Name *</label>
              <input
                type="text"
                required
                placeholder="Father Name"
                className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
              />
            </div>

            {/* Select Class */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Select Class *</label>
              <select
                className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-blue-900 outline-none focus:border-blue-700 transition"
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

            {/* Section (Auto) */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Section (Auto)</label>
              <input
                type="text"
                readOnly
                className="w-full p-3 border rounded-2xl font-bold bg-slate-100 text-slate-800 outline-none cursor-not-allowed"
                value={sectionName}
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>

            {/* Parent Phone */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">Parent Phone</label>
              <input
                type="text"
                placeholder="03001234567"
                className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
              />
            </div>

            {/* WhatsApp Number */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">WhatsApp Number</label>
              <input
                type="text"
                placeholder="WhatsApp Contact Number"
                className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
            </div>

            {/* B-Form Number */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">B-Form Number</label>
              <input
                type="text"
                placeholder="32102-XXXXXXX-X"
                className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition"
                value={bFormNumber}
                onChange={(e) => setBFormNumber(e.target.value)}
              />
            </div>

          </div>

          {/* Residential Address */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Residential Address</label>
            <input
              type="text"
              placeholder="Complete residential address"
              className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || compressing}
            className="w-full p-4 bg-blue-950 hover:bg-blue-900 text-white rounded-2xl font-black text-xs transition shadow-md mt-3"
          >
            {loading ? 'Processing Admission...' : 'Submit Student Admission'}
          </button>

        </form>

      </div>

    </div>
  );
}