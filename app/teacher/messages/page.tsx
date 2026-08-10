'use client';
import Link from 'next/link';

export default function MessagesPage() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-[70vh] flex flex-col items-center justify-center text-center font-sans">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border-t-8 border-red-600 space-y-5 max-w-md w-full">
        <div className="text-5xl animate-bounce">💬</div>
        
        <h1 className="text-xl md:text-2xl font-black text-red-900">
          Academy Messages & Notices
        </h1>

        <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-bold px-3 py-1.5 rounded-full inline-block">
          🚀 Coming Soon
        </div>

        <p className="text-xs text-gray-500 font-medium">
          Direct communication portal between teachers, admin, and parents.
        </p>

        <div className="pt-4 border-t">
          <Link
            href="/teacher/dashboard"
            className="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-2xl text-xs font-bold transition shadow-md"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}