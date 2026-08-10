'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to set session cookies for Next.js Middleware
  const setAuthCookie = (role: string) => {
    document.cookie = `user_role=${role}; path=/; max-age=86400; SameSite=Lax`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setError('براہ کرم اپنا یوزر نیم یا رجسٹریشن نمبر درج کریں۔');
      return;
    }

    setLoading(true);

    try {
      // 1. ADMIN LOGIN
      if (
        (cleanUsername.toLowerCase() === 'admin' || cleanUsername === '03001234567') &&
        (cleanPassword === '12345' || cleanPassword === 'admin123' || cleanPassword === '')
      ) {
        localStorage.setItem('user_role', 'admin');
        localStorage.setItem('user_name', 'Administrator');
        setAuthCookie('admin');
        router.push('/admin/dashboard');
        return;
      }

      // 2. STUDENT LOGIN
      const { data: studentData } = await supabase
        .from('students')
        .select('*, classes(class_name, section_name)')
        .or(`registration_no.eq.${cleanUsername},admission_no.eq.${cleanUsername}`)
        .maybeSingle();

      if (studentData) {
        localStorage.setItem('user_role', 'student');
        localStorage.setItem('user_id', studentData.id);
        localStorage.setItem('user_name', studentData.full_name);
        localStorage.setItem('user_reg_no', studentData.registration_no || studentData.admission_no || '');
        setAuthCookie('student');
        router.push('/student/dashboard');
        return;
      }

      // 3. TEACHER / STAFF LOGIN
      const { data: teacherData } = await supabase
        .from('staff')
        .select('*')
        .or(`registration_no.eq.${cleanUsername},phone.eq.${cleanUsername}`)
        .maybeSingle();

      if (teacherData) {
        localStorage.setItem('user_role', 'teacher');
        localStorage.setItem('user_id', teacherData.id);
        localStorage.setItem('user_name', teacherData.full_name);
        localStorage.setItem('user_reg_no', teacherData.registration_no || '');
        setAuthCookie('teacher');
        router.push('/teacher/dashboard');
        return;
      }

      setError('کوئی ریکارڈ نہیں ملا۔ براہ کرم اپنا رجسٹریشن نمبر یا یوزر نیم چیک کریں۔');
    } catch (err: any) {
      setError(err.message || 'لاگ ان میں مسئلہ پیش آیا ہے۔');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 flex items-center justify-center p-4 font-sans">
      <div className="max-w-3xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-5 min-h-[440px]">
        
        {/* LEFT BRANDING */}
        <div className="md:col-span-2 bg-[#1e293b] p-8 flex flex-col items-center justify-center text-center text-white space-y-4 border-r border-slate-800">
          <div className="w-20 h-20 bg-white rounded-2xl p-2.5 flex items-center justify-center shadow-xl">
            <img
              src="/logo.png"
              alt="Academy Logo"
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.parentElement) {
                  e.currentTarget.parentElement.innerText = '🎓';
                  e.currentTarget.parentElement.className =
                    'w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-xl';
                }
              }}
            />
          </div>

          <div>
            <h1 className="text-base font-black text-white leading-snug tracking-wide">
              New Bright Scholars Science Academy
            </h1>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              Karor Lal Esan, District Layyah
            </p>
          </div>
        </div>

        {/* RIGHT FORM */}
        <div className="md:col-span-3 bg-[#eef2f3] p-7 md:p-10 flex flex-col justify-between space-y-5 text-slate-900">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Portal Sign In
              </h2>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Enter your Reg No / Username & password to continue
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">
                  USERNAME / REG NO
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Admin, Teacher Reg No, Student Reg No"
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white/90 text-slate-900 font-bold outline-none focus:border-slate-700 transition shadow-sm text-xs"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">
                  PASSWORD
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full p-3 rounded-xl border border-slate-300 bg-white/90 text-slate-900 font-bold outline-none focus:border-slate-700 transition shadow-sm text-xs pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
                  >
                    {showPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#2d5f5d] hover:bg-[#234b49] text-white rounded-xl text-xs font-extrabold transition shadow-md mt-2 flex items-center justify-center gap-2"
              >
                {loading ? 'Authenticating...' : 'Sign In to Portal'}
              </button>
            </form>
          </div>

          <div className="text-[10px] text-slate-400 text-center font-bold tracking-wide pt-2">
            Powered by Saqqa Software Service © 2026
          </div>
        </div>

      </div>
    </div>
  );
}