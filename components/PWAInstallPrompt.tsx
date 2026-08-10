'use client';
import { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('SW Registered:', reg.scope))
        .catch((err) => console.log('SW Registration failed:', err));
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border text-center space-y-5 animate-in fade-in zoom-in duration-200">
        
        {/* LOGO CONTAINER WITH SAFE FALLBACK */}
        <div className="w-20 h-20 bg-slate-100 rounded-3xl border border-slate-200 flex items-center justify-center mx-auto overflow-hidden p-2 shadow-inner">
          <img
            src="/logo.png"
            alt="Academy Logo"
            className="w-full h-full object-contain"
            onError={(e) => {
              // Fallback to Icon if image file is not found
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.parentElement) {
                e.currentTarget.parentElement.innerText = '🎓';
                e.currentTarget.parentElement.className = 'w-20 h-20 bg-blue-950 rounded-3xl flex items-center justify-center text-4xl shadow-inner mx-auto';
              }
            }}
          />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-xl font-black text-blue-950">
            Install Official App!
          </h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Install the app on your device for offline sync, fast performance, and instant portal access.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-black text-xs rounded-xl transition shadow-md"
          >
            Install Now
          </button>
          
          <button
            onClick={() => setShowPrompt(false)}
            className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs rounded-xl transition"
          >
            Later
          </button>
        </div>

      </div>
    </div>
  );
}