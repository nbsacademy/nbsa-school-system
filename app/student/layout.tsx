'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const userRole = localStorage.getItem('user_role');
    if (userRole !== 'student') {
      document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      localStorage.clear();
      router.push('/login');
    } else {
      setAuthorized(true);
    }
  }, [router]);

  const handleLogout = () => {
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    localStorage.clear();
    router.push('/login');
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-xs text-white font-bold animate-pulse">
        Verifying Student Access...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col justify-between">
      
      {/* STUDENT HEADER */}
      <header className="bg-gradient-to-r from-blue-950 via-indigo-950 to-blue-900 text-white shadow-md border-b border-blue-800/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between flex-wrap gap-2">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl p-1 flex items-center justify-center shrink-0 shadow-inner">
              <img
                src="/logo.png"
                alt="Academy Logo"
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.innerText = '🎓';
                    e.currentTarget.parentElement.className = 'w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-inner shrink-0';
                  }
                }}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-xs sm:text-sm md:text-base tracking-wide uppercase text-white">
                  NEW BRIGHT SCHOLARS SCIENCE ACADEMY
                </h1>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black px-2 py-0.5 rounded-full hidden sm:inline-block">
                  STUDENT PORTAL
                </span>
              </div>
              <p className="text-[10px] text-blue-200 font-medium leading-none mt-0.5">
                Karor Lal Esan, District Layyah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push('/student/dashboard')}
              className="bg-blue-900/60 hover:bg-blue-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl border border-blue-700/60 transition shadow-sm flex items-center gap-1"
            >
              <span>⌂</span>
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-black px-3.5 py-1.5 rounded-xl transition shadow-md cursor-pointer"
            >
              Logout
            </button>
          </div>

        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-blue-950 text-white border-t border-blue-900 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-2 text-xs font-medium text-blue-200">
          <div>
            <p className="font-bold text-white">
              New Bright Scholars Science Academy Karor © 2026
            </p>
            <p className="text-[10px] text-blue-300">
              All Rights Reserved. Student & Parent Academic Portal.
            </p>
          </div>

          <div className="text-[11px] font-semibold bg-blue-900/50 px-3 py-1.5 rounded-xl border border-blue-800">
            Powered by <span className="text-white font-extrabold">Saqqa Software Service © 2026</span>
          </div>
        </div>
      </footer>

    </div>
  );
}