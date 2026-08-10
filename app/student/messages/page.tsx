'use client';
import { useRouter } from 'next/navigation';

export default function StudentMessagesPage() {
  const router = useRouter();

  return (
    <div className="p-4 md:p-10 max-w-4xl mx-auto font-sans text-slate-900">
      <div className="bg-white rounded-3xl p-8 sm:p-12 border shadow-sm text-center space-y-6">
        
        {/* Animated Badge & Icon */}
        <div className="w-20 h-20 bg-rose-50 text-rose-900 border border-rose-200 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-inner">
          💬
        </div>

        <div className="space-y-2">
          <span className="bg-rose-100 text-rose-900 text-[11px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider">
            FEATURE UNDER DEVELOPMENT
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-blue-950 pt-2">
            Academy Notices & Messages
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
            The official broadcast messaging system for announcements, holiday notices, and exam alerts is coming soon.
          </p>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-slate-50 border border-dashed border-slate-300 p-6 rounded-2xl max-w-sm mx-auto space-y-2">
          <span className="text-xl">📢</span>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
            COMING SOON
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Broadcast Announcements & Direct Notices
          </p>
        </div>

        {/* Back Button */}
        <div>
          <button
            onClick={() => router.push('/student/dashboard')}
            className="bg-blue-950 hover:bg-blue-900 text-white text-xs font-black px-6 py-3 rounded-xl transition shadow-md inline-flex items-center gap-2"
          >
            <span>⌂</span>
            <span>Back to Student Dashboard</span>
          </button>
        </div>

      </div>
    </div>
  );
}