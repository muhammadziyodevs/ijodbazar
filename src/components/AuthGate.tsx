import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { ArrowRight, FolderLock, Globe, ShieldCheck } from 'lucide-react';
import { auth, googleProvider } from '../firebase';

export function AuthGate() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Kirishda xatolik yuz berdi.';
      if (msg.includes('popup-closed-by-user')) {
        setErrorMessage('Kirish oynasi yopildi. Davom etish uchun qaytadan urinib ko‘ring.');
      } else if (msg.includes('unauthorized-domain')) {
        setErrorMessage('Ushbu domen Firebase Authentication sozlamalarida ruxsat etilmagan.');
      } else {
        setErrorMessage('Google orqali kirishda muammo yuz berdi. Qaytadan urinib ko‘ring.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            IjodBaza
          </span>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#imkoniyatlar" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Imkoniyatlar
            </a>
            <a href="#xavfsizlik" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Xavfsizlik
            </a>
          </nav>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {loading ? 'Kirilmoqda...' : 'Kirish'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center py-12 px-6">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-xs font-medium text-blue-600 tracking-wide mb-3">
              Firebase bulut ombori va hamjamiyat
            </p>
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-[1.12] [text-wrap:balance] mb-5">
              Fayllaringizni saqlang va ishlaringizni hamjamiyat bilan bo‘lishing
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-xl mb-8">
              Har bir foydalanuvchi uchun shaxsiy kabinet, ishlarni yuklash uchun qulay boshqaruv paneli va barcha mualliflarning ochiq postlari jamlangan hamjamiyat maydoni.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-8">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
                  />
                </svg>
                {loading ? 'Autentifikatsiya qilinmoqda...' : 'Google hisobi bilan kirish'}
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 max-w-xl"
              >
                {errorMessage}
              </div>
            )}

            <div id="imkoniyatlar" className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-200">
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1.5">
                  <FolderLock className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Shaxsiy kabinet</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Yuklangan fayllaringiz hajmi va holatini alohida boshqaring.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Admin panel</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Qilgan ishlaringizni to‘g‘ridan-to‘g‘ri Firebase’ga yuklang.
                </p>
              </div>
              <div id="xavfsizlik">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1.5">
                  <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Hamjamiyat</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  O‘zingiz va boshqa foydalanuvchilar postlarini ko‘ring va baholang.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 flex">
            <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-white relative min-h-[340px]">
              {!heroImgFailed ? (
                <img
                  src="/src/assets/images/auth_studio_hero_1795458102467.jpg"
                  alt="IjodBaza ishchi muhiti va fayl arxivi"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 flex flex-col items-center justify-center p-10 text-center">
                  <FolderLock className="w-12 h-12 text-blue-600 mb-3" />
                  <p className="text-base font-semibold text-slate-900">IjodBaza Bulut Ombori</p>
                  <p className="text-sm text-slate-500 mt-1">Xavfsiz fayl saqlash va hamjamiyat maydoni</p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent p-6">
                <p className="text-sm font-medium text-white">
                  Barcha fayllar va loyihalar Firebase Firestore qoidalariga muvofiq himoyalanadi
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>IjodBaza — Shaxsiy fayllar va hamjamiyat platformasi</span>
          <span>Google Autentifikatsiyasi orqali himoyalangan kirish</span>
        </div>
      </footer>
    </div>
  );
}
