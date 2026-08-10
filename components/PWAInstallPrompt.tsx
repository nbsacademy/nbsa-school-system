'use client';
import { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('SW Registered:', reg.scope))
        .catch((err) => console.log('SW Registration failed:', err));
    }

    // 2. Listen for Auto-Install Event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true); // Show Auto Popup Banner
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted PWA installation');
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-slate-900 text-white p-4 rounded-3xl shadow-2xl border border-slate-700 z-[9999] flex items-center justify-between gap-3 animate-bounce">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-xl shrink-0">
          📲
        </div>
        <div>
          <h4 className="text-xs font-black text-white">Install Academy App</h4>
          <p className="text-[10px] text-slate-300 font-medium">Install for faster mobile access</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstallClick}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs shadow-md transition"
        >
          Install
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="text-slate-400 hover:text-white p-1 text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  );
}