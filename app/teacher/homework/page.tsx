'use client';
import Link from 'next/link';

export default function HomeworkPage() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-[70vh] flex flex-col items-center justify-center text-center font-sans">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border-t-8 border-amber-500 space-y-5 max-w-md w-full">
        <div className="text-5xl animate-bounce">📝</div>
        
        <h1 className="text-xl md:text-2xl font-black text-amber-900">
          Daily Homework Assignment
        </h1>

        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full inline-block">
          🚀 Coming Soon
        </div>

        <p className="text-xs text-gray-500 font-medium">
          Assign daily home tasks to students and sync directly with Parent WhatsApp.
        </p>

        <div className="pt-4 border-t">
          <Link
            href="/teacher/dashboard"
            className="inline-block bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-2xl text-xs font-bold transition shadow-md"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}