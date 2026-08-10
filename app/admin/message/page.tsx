'use client';
import Link from 'next/link';

export default function MessagePage() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[70vh] text-left font-sans">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border-t-8 border-blue-900 text-center space-y-6 w-full">
        
        <div className="w-24 h-24 bg-blue-50 text-blue-900 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner">
          💬
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl md:text-4xl font-extrabold text-blue-900">
            Messaging System
          </h2>
          <span className="inline-block bg-red-100 text-red-600 px-4 py-1.5 rounded-full text-xs md:text-sm font-extrabold uppercase tracking-wider">
            🚧 Coming Soon 🚧
          </span>
        </div>

        <p className="text-gray-500 text-xs md:text-sm max-w-md mx-auto leading-relaxed">
          Broadcast and Direct Messaging modules are under development and will be available soon.
        </p>

        <div className="pt-4">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition duration-200"
          >
            <span>🏠</span>
            <span>Back to Dashboard</span>
          </Link>
        </div>

      </div>
    </div>
  );
}