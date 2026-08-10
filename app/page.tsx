'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPWAInstall, setShowPWAInstall] = useState(false);
  const [lang, setLang] = useState<'en' | 'ur'>('en');
  const [currentSlide, setCurrentSlide] = useState(0);

  // Slider Images Array
  const slides = [
    '/slide1.jpg',
    '/slide2.jpg',
    '/slide3.jpg',
    '/slide4.jpg',
    '/slide5.jpg',
  ];

  // Auto Slider Logic (3.5 Seconds interval)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [slides.length]);

  // PWA Install Logic
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPWAInstall(true);
    });
  }, []);

  const handleInstallPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setShowPWAInstall(false);
      });
    }
  };

  return (
    <div className={`min-h-screen bg-slate-50 text-gray-800 ${lang === 'ur' ? 'font-urdu text-right' : 'text-left'}`}>
      {/* Top Navigation Bar */}
      <header className="bg-blue-900 text-white p-4 flex justify-between items-center shadow-xl sticky top-0 z-40">
        <div className="flex items-center space-x-3 space-x-reverse">
          <img
            src="/logo.png"
            alt="New Bright Scholars Science Academy Logo"
            className="w-12 h-12 rounded-full object-cover bg-white p-0.5 shadow"
          />
          <div>
            <h1 className="text-base md:text-xl font-extrabold tracking-wide">
              {lang === 'en' ? 'NEW BRIGHT SCHOLARS SCIENCE ACADEMY' : 'نیو برائٹ اسکالرز سائنس اکیڈمی'}
            </h1>
            <p className="text-xs text-blue-200">
              {lang === 'en' ? 'Karor Lal Esan, District Layyah' : 'کروڑ لعل عیسن، ضلع لیہ'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 space-x-reverse">
          {/* Switch to Urdu / English Option */}
          <button
            onClick={() => setLang(lang === 'en' ? 'ur' : 'en')}
            className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition"
          >
            {lang === 'en' ? 'اردو ' : 'English'}
          </button>
          
          <Link
            href="/login"
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold shadow-md transition"
          >
            {lang === 'en' ? 'Login' : 'لاگ ان'}
          </Link>
        </div>
      </header>

      {/* Image Slider Section - Perfectly Fitted Without Cropping */}
      <section className="relative w-full h-[400px] md:h-[550px] bg-slate-950 overflow-hidden border-b-4 border-red-600 flex items-center justify-center">
        {slides.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Background Blur Effect for side spaces */}
            <img
              src={img}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-md opacity-30"
            />

            {/* Main Picture - Perfectly Fitted */}
            <img
              src={img}
              alt={`Slide ${index + 1}`}
              className="relative max-w-full max-h-full object-contain z-10 drop-shadow-2xl"
            />

            {/* Bottom Overlay Banner */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-12 pb-6 px-4 z-20 text-center">
              <span className="bg-red-600 text-white text-xs md:text-sm px-4 py-1 rounded-full font-bold uppercase tracking-wider shadow">
                {lang === 'en' ? 'Admissions Open 2026' : 'داخلہ شیڈول 2026 جاری ہے'}
              </span>
              <h2 className="text-lg md:text-3xl font-extrabold text-white mt-2 drop-shadow-md">
                {lang === 'en'
                  ? 'Excellence in Education & Outstanding Positions'
                  : 'اعلیٰ تعلیمی معیار اور شاندار پوزیشنز'}
              </h2>
            </div>
          </div>
        ))}

        {/* Slider Indicator Dots */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2 z-30">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2.5 rounded-full transition-all ${
                idx === currentSlide ? 'bg-red-600 w-8' : 'bg-white/60 w-2.5'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto py-12 px-6 space-y-10">
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-md border-t-4 border-blue-900 space-y-3">
            <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-900 rounded-full inline-block"></span>
              {lang === 'en' ? 'Admission Schedule' : 'داخلہ شیڈول'}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {lang === 'en'
                ? 'Admissions are open for the session 2026. Limited seats available for science and high-school modules. Enroll your child today!'
                : 'سیشن 2026ء کے لیے تمام کلاسز کے جدید داخلے جاری ہیں۔ محدود نشستیں دستیاب ہیں۔ جلد از جلد رجسٹریشن مکمل کروائیں۔'}
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md border-t-4 border-red-600 space-y-3">
            <h3 className="text-xl font-bold text-red-600 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-600 rounded-full inline-block"></span>
              {lang === 'en' ? 'Academy Highlights' : 'اہم معلومات'}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {lang === 'en'
                ? 'Highly qualified faculty, automated online student tracking, digital testing systems, and regular progress reports for parents.'
                : 'تجربہ کار اساتذہ، باقاعدہ ہفتہ وار ٹیسٹ سسٹمز، آن لائن پورٹل کے ذریعے حاضری اور نتائج کی لائیو ٹریکنگ۔'}
            </p>
          </div>
        </div>

        {/* About Us Paragraph */}
        <div className="bg-white p-8 rounded-2xl shadow-lg border-l-8 md:border-l-8 md:border-r-0 border-blue-900 space-y-4">
          <h3 className="text-2xl font-bold text-blue-900 border-b pb-2">
            {lang === 'en' ? 'About Us' : 'ہمارے بارے میں'}
          </h3>
          <p className="text-gray-700 text-lg leading-relaxed text-justify">
            {lang === 'en' ? (
              `"New Bright Scholars Science Academy Karor" is not just an educational institution, but a trusted name that turns dreams into reality. Starting in 2012, this journey has reached the pinnacle of success today, where our students have made history by securing top positions at Tehsil, District, Board, and Punjab levels. Countless stars of ours are serving the nation in Pakistan's top medical and engineering colleges today. In our underprivileged area, where resources are limited, New Bright Scholars Academy is dedicated to quenching the thirst for knowledge by providing the highest quality education at an extremely affordable fee. We do not just teach; we shape the architects of the future. Come! Be a part of this great journey for your children's bright tomorrow.`
            ) : (
              `"نیو برائٹ اسکالرز سائنس اکیڈمی کروڑ" صرف ایک تعلیمی ادارہ نہیں، بلکہ خوابوں کو حقیقت کا روپ دینے والا ایک معتبر نام ہے۔ سن 2012ء سے شروع ہونے والا یہ سفر آج کامیابیوں کی اس معراج پر ہے جہاں ہمارے نونہالوں نے تحصیل، ڈسٹرکٹ، بورڈ اور پنجاب لیول پر پوزیشنز حاصل کر کے تاریخ رقم کی ہے۔ ہمارے وہ ان گنت ستارے جن کا شمار ممکن نہیں، آج پاکستان کے صفِ اول کے میڈیکل اور انجینئرنگ کالجز میں ملک و قوم کی خدمت میں مصروفِ عمل ہیں۔ ہمارے اس پسماندہ علاقے میں، جہاں وسائل کی کمی ہے، وہاں نیو برائٹ اسکالرز اکیڈمی انتہائی کم فیس کے اندر اعلیٰ ترین اور معیاری تعلیم فراہم کر کے علم کی پیاس بجھانے میں مصروفِ عمل ہے۔ ہم صرف پڑھاتے نہیں، بلکہ مستقبل کے معمار تیار کرتے ہیں۔ آئیے! اپنے بچوں کے روشن کل کے لیے ہمارے اس عظیم سفر کا حصہ بنیں۔`
            )}
          </p>
        </div>

        {/* Contact Info */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-8 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h4 className="text-2xl font-bold mb-1">
              {lang === 'en' ? 'Contact Us' : 'ہم سے رابطہ کریں'}
            </h4>
            <p className="text-blue-200">
              {lang === 'en'
                ? 'Feel free to reach out for admissions and inquiries:'
                : 'کسی بھی معلومات یا ایڈمیشن سے متعلق رہنمائی کے لیے کال کریں:'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 font-mono text-lg font-bold">
            <a href="tel:03064952693" className="bg-white text-blue-900 px-6 py-3 rounded-xl shadow hover:bg-gray-100 transition">
              0306-4952693
            </a>
            <a href="tel:03136766476" className="bg-red-600 text-white px-6 py-3 rounded-xl shadow hover:bg-red-700 transition">
              0313-6766476
            </a>
          </div>
        </div>
      </main>

      {/* PWA Install Modal */}
      {showPWAInstall && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl max-w-lg w-full text-center space-y-6 shadow-2xl border-4 border-blue-900">
            <img src="/logo.jpg" alt="Logo" className="w-20 h-20 rounded-full mx-auto shadow-md object-cover" />
            <h3 className="text-2xl font-extrabold text-blue-900">
              {lang === 'en' ? 'Install Official App!' : 'اکیڈمی کی آفیشل ایپ انسٹال کریں!'}
            </h3>
            <p className="text-gray-600">
              {lang === 'en'
                ? 'Install the app on your device for offline sync, fast performance, and instant portal access.'
                : 'آف لائن ڈیٹا، فاسٹ سپیڈ اور پورٹل تک آسان رسائی کے لیے ایپلی کیشن کو اپنے ڈیوائس پر انسٹال کریں۔'}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleInstallPWA}
                className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold text-lg hover:bg-red-700 shadow transition"
              >
                {lang === 'en' ? 'Install Now' : 'ایپ انسٹال کریں'}
              </button>
              <button
                onClick={() => setShowPWAInstall(false)}
                className="bg-gray-200 text-gray-800 px-6 py-3 rounded-xl font-bold hover:bg-gray-300 transition"
              >
                {lang === 'en' ? 'Later' : 'بعد میں'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}