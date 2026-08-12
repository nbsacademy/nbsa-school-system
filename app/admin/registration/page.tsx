'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function AdminStaffRegistrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id'); // URL سے سٹاف کی ID حاصل کرنا

  const [loading, setLoading] = useState(false);
  const [staffType, setStaffType] = useState<'Teaching Staff' | 'Admin Staff'>('Teaching Staff');

  // Dynamic Classes List from Database
  const [classesList, setClassesList] = useState<any[]>([]);

  // 1. Basic Personal Details
  const [registrationNo, setRegistrationNo] = useState('');
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [cnic, setCnic] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [relativePhone, setRelativePhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // 2. Specific Staff Fields
  const [education, setEducation] = useState('');
  const [designation, setDesignation] = useState('Administrator');
  const [subject, setSubject] = useState('Computer Sci');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedClassName, setSelectedClassName] = useState('');
  const [sectionName, setSectionName] = useState('A Boys');
  const [salary, setSalary] = useState('');

  // 3. Photo & Compression States (< 100 KB)
  const [staffPhoto, setStaffPhoto] = useState<string>('');
  const [photoSizeKb, setPhotoSizeKb] = useState<number | null>(null);
  const [compressing, setCompressing] = useState(false);

  // Alert State
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    initForm();
  }, [editId]);

  const initForm = async () => {
    setLoading(true);

    // Fetch Classes
    const { data: cData } = await supabase
      .from('classes')
      .select('*')
      .order('class_name', { ascending: true });

    if (cData && cData.length > 0) {
      setClassesList(cData);
    }

    if (editId) {
      // EDIT MODE: Fetch existing staff record
      const { data: sf, error } = await supabase.from('staff').select('*').eq('id', editId).single();
      if (sf && !error) {
        setRegistrationNo(sf.registration_no || '');
        setFullName(sf.full_name || '');
        setFatherName(sf.father_name || '');
        setCnic(sf.cnic || '');
        setDob(sf.dob || '');
        setPhone(sf.phone || '');
        setWhatsapp(sf.whatsapp || sf.phone || '');
        setRelativePhone(sf.relative_phone || '');
        setEmail(sf.email || '');
        setAddress(sf.address || '');
        setEducation(sf.education || '');
        setSalary(sf.basic_salary ? String(sf.basic_salary) : '');
        setStaffPhoto(sf.photo_url || '');

        const roleLower = (sf.role || '').toLowerCase();
        if (roleLower.includes('teacher') || roleLower.includes('faculty') || roleLower.includes('lecturer')) {
          setStaffType('Teaching Staff');
          setSelectedClassName(sf.assigned_class || '');
          setSectionName(sf.section_name || '');
        } else {
          setStaffType('Admin Staff');
          setDesignation(sf.role || 'Administrator');
        }
      }
    } else {
      // NEW REGISTRATION MODE: Set defaults & auto reg no
      if (cData && cData.length > 0) {
        setSelectedClassId(cData[0].id);
        setSelectedClassName(`${cData[0].class_name} (${cData[0].section_name || 'Section A'})`);
        setSectionName(cData[0].section_name || 'Section A');
      }
      await calculateNextStaffRegNo();
    }

    setLoading(false);
  };

  // 🚀 SMART AUTO REGISTRATION NUMBER (For New Entries Only)
  const calculateNextStaffRegNo = async () => {
    if (editId) return;

    const { data: staffList } = await supabase.from('staff').select('registration_no');

    let maxNum = 0;
    if (staffList && staffList.length > 0) {
      staffList.forEach((s) => {
        const str = s.registration_no || '';
        const digits = str.replace(/[^0-9]/g, '');
        if (digits) {
          const num = parseInt(digits.slice(-3), 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
    }

    const nextSeq = maxNum + 1;
    const nextRegStr = `R-2026-${String(nextSeq).padStart(3, '0')}`;
    setRegistrationNo(nextRegStr);
  };

  // 🚀 PHOTO AUTO COMPRESSION (< 100 KB)
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

        let quality = 0.75;
        let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

        while (compressedDataUrl.length > 130000 && quality > 0.1) {
          quality -= 0.08;
          compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        const finalSizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
        setStaffPhoto(compressedDataUrl);
        setPhotoSizeKb(finalSizeKb);
        setCompressing(false);
      };
    };
  };

  // Handle Class Dropdown Change
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    const selectedObj = classesList.find((c) => c.id === classId);
    if (selectedObj) {
      setSelectedClassName(`${selectedObj.class_name} (${selectedObj.section_name || 'Section A'})`);
      setSectionName(selectedObj.section_name || 'Section A');
    }
  };

  // Submit Staff Registration Form (Handles INSERT & UPDATE)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    if (!fullName.trim() || !phone.trim()) {
      setAlert({ type: 'error', msg: 'Please enter staff full name and phone number.' });
      return;
    }

    setLoading(true);

    const payload = {
      registration_no: registrationNo,
      full_name: fullName.trim(),
      father_name: fatherName.trim() || null,
      cnic: cnic.trim() || null,
      dob: dob || null,
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || phone.trim() || null,
      relative_phone: relativePhone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      role: staffType === 'Teaching Staff' ? 'Teacher' : designation.trim() || 'Admin Staff',
      education: education.trim() || null,
      basic_salary: salary ? parseFloat(salary) : 0,
      assigned_class: staffType === 'Teaching Staff' ? selectedClassName : null,
      section_name: staffType === 'Teaching Staff' ? sectionName : null,
      photo_url: staffPhoto || null,
      is_active: true,
    };

    let error;
    if (editId) {
      // UPDATE Existing Staff Record
      const res = await supabase.from('staff').update(payload).eq('id', editId);
      error = res.error;
    } else {
      // INSERT New Staff Record
      const res = await supabase.from('staff').insert([payload]);
      error = res.error;
    }

    setLoading(false);

    if (error) {
      setAlert({ type: 'error', msg: error.message });
    } else {
      setAlert({
        type: 'success',
        msg: editId
          ? `Staff ${fullName} record updated successfully!`
          : `Staff ${fullName} registered successfully with Reg No ${registrationNo}!`,
      });

      if (!editId) {
        // Reset Form Fields
        setFullName('');
        setFatherName('');
        setCnic('');
        setDob('');
        setPhone('');
        setWhatsapp('');
        setRelativePhone('');
        setEmail('');
        setAddress('');
        setEducation('');
        setDesignation('Administrator');
        setSubject('Computer Sci');
        setSalary('');
        setStaffPhoto('');
        setPhotoSizeKb(null);

        await calculateNextStaffRegNo();
      } else {
        // Redirect to Status Center after 1.5s
        setTimeout(() => {
          router.push('/admin/status-center');
        }, 1500);
      }
    }
  };

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-6 font-sans pb-16">
      
      <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-6">
        
        {/* Header Title & Switcher */}
        <div className="flex justify-between items-center flex-wrap gap-3 border-b pb-4">
          <div>
            <h2 className="text-xl font-black text-blue-950">
              {editId ? '✏️ Edit Staff Record' : 'Staff Registration Form'}
            </h2>
            <p className="text-xs text-gray-500">
              {editId ? 'Modify existing staff details in system database' : 'Register Teaching or Admin Staff into system database'}
            </p>
          </div>

          <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 border">
            <button
              type="button"
              onClick={() => setStaffType('Teaching Staff')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                staffType === 'Teaching Staff' ? 'bg-blue-950 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              👨‍🏫 Teaching Staff
            </button>
            <button
              type="button"
              onClick={() => setStaffType('Admin Staff')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                staffType === 'Admin Staff' ? 'bg-blue-950 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              👨‍💼 Admin Staff
            </button>
          </div>
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

        {/* PHOTO UPLOAD & AUTO COMPRESS SECTION */}
        <div className="p-4 bg-slate-50 border rounded-2xl flex items-center gap-4 flex-wrap">
          <div className="w-20 h-24 bg-white border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
            {staffPhoto ? (
              <img src={staffPhoto} alt="Staff Preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl text-slate-400">📷</span>
            )}
          </div>

          <div className="space-y-1">
            <label className="block font-extrabold text-blue-950 text-xs">
              Upload Staff Photo (Auto Compressed &lt; 100KB)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-950 file:text-white hover:file:bg-blue-900 cursor-pointer"
            />
            {compressing && <p className="text-[11px] font-bold text-amber-600">Compressing image under 100 KB...</p>}
            {photoSizeKb !== null && !compressing && (
              <p className="text-[11px] font-black text-emerald-700">
                ✓ Staff photo compressed: <b>{photoSizeKb} KB</b> (&lt; 100 KB)
              </p>
            )}
          </div>
        </div>

        {/* FORM FIELDS */}
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          
          {/* SECTION 1: BASIC PERSONAL DETAILS */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-blue-900 uppercase tracking-wider border-b pb-1">
              1. BASIC PERSONAL DETAILS
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              
              <div>
                <label className="block font-bold text-gray-700 mb-1">Registration Serial No</label>
                <input
                  type="text"
                  readOnly={!editId}
                  className={`w-full p-3 border rounded-2xl font-bold font-mono outline-none ${
                    editId ? 'bg-slate-50 text-blue-950' : 'bg-slate-100 text-blue-950 cursor-not-allowed'
                  }`}
                  value={registrationNo || 'Loading...'}
                  onChange={(e) => setRegistrationNo(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sir Ali Raza"
                  className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Father Name</label>
                <input
                  type="text"
                  placeholder="Father Name"
                  className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">CNIC Number</label>
                <input
                  type="text"
                  placeholder="32203-XXXXXXX-X"
                  className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition"
                  value={cnic}
                  onChange={(e) => setCnic(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="03001234567"
                  className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">WhatsApp Number</label>
                <input
                  type="text"
                  placeholder="03001234567"
                  className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Relative Contact Phone</label>
                <input
                  type="text"
                  placeholder="03001234567"
                  className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition"
                  value={relativePhone}
                  onChange={(e) => setRelativePhone(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="staff@gmail.com"
                  className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

            </div>

            <div className="pt-1">
              <label className="block font-bold text-gray-700 mb-1">Residential Address</label>
              <input
                type="text"
                placeholder="Complete address"
                className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          {/* SECTION 2: DYNAMIC TYPE DETAILS */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-black text-blue-900 uppercase tracking-wider border-b pb-1">
              2. {staffType.toUpperCase()} DETAILS
            </h3>

            {/* ADMIN STAFF */}
            {staffType === 'Admin Staff' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Education / Qualification</label>
                  <input
                    type="text"
                    placeholder="e.g. Master, BA, BS CS"
                    className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Designation / Role</label>
                  <input
                    type="text"
                    placeholder="e.g. Administrator, Accountant, Clerk"
                    className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Basic Salary</label>
                  <input
                    type="number"
                    placeholder="e.g. 35000"
                    className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition font-mono"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* TEACHING STAFF */}
            {staffType === 'Teaching Staff' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Education</label>
                  <input
                    type="text"
                    placeholder="e.g. MSc, M.Phil, BS"
                    className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Assigned Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. Physics, Chemistry, Math"
                    className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Select Class (Live)</label>
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

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Section (Auto)</label>
                  <input
                    type="text"
                    readOnly
                    className="w-full p-3 border rounded-2xl font-bold bg-slate-100 text-slate-800 outline-none cursor-not-allowed"
                    value={sectionName}
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Basic Salary</label>
                  <input
                    type="number"
                    placeholder="e.g. 45000"
                    className="w-full p-3 border rounded-2xl font-bold bg-slate-50 text-slate-900 outline-none focus:border-blue-700 transition font-mono"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                  />
                </div>

              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || compressing}
            className="w-full p-4 bg-blue-950 hover:bg-blue-900 text-white rounded-2xl font-black text-xs transition shadow-md mt-4"
          >
            {loading ? 'Processing...' : editId ? 'Update Staff Record' : `Submit ${staffType} Registration`}
          </button>

        </form>

      </div>

    </div>
  );
}

export default function AdminStaffRegistrationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-gray-500">Loading Staff Registration Form...</div>}>
      <AdminStaffRegistrationContent />
    </Suspense>
  );
}