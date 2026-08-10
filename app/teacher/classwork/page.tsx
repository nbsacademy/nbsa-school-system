'use client';
import Link from 'next/link';

export default function ClassworkPage() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-[70vh] flex flex-col items-center justify-center text-center font-sans">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border-t-8 border-indigo-600 space-y-5 max-w-md w-full">
        <div className="text-5xl animate-bounce">📖</div>
        
        <h1 className="text-xl md:text-2xl font-black text-indigo-900">
          Classwork Module
        </h1>

        <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold px-3 py-1.5 rounded-full inline-block">
          🚀 Coming Soon
        </div>

        <p className="text-xs text-gray-500 font-medium">
          Daily classroom activities, topic logs, and lecture notes tracker will be available here.
        </p>

        <div className="pt-4 border-t">
          <Link
            href="/teacher/dashboard"
            className="inline-block bg-indigo-900 hover:bg-indigo-800 text-white px-6 py-2.5 rounded-2xl text-xs font-bold transition shadow-md"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}