'use client';
import { useEffect, useState } from "react";

import { onAuthStateChanged } from 'firebase/auth'
import { useTheme } from "next-themes";
import { auth } from "./lib/firebaseConfig";
import { TradingJournal } from "./components/TradingJournal";
import { LoginScreen } from "./components/Login";
import { AlertModal } from "./components/PopupModal/AlertModals";

export default function Home() {
  const [user, setUser] = useState<import('firebase/auth').User | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useTheme();
  const [alertInfo, setAlertInfo] = useState({ show: false, message: '' });

  const showAlert = (message : string) => setAlertInfo({ show: true, message });

  useEffect(() => {
    // Load external script for image generation
    const scriptId = 'html-to-image-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js';
      script.async = true;
      document.head.appendChild(script);
    }

    // Auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-950"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div></div>;
  }

  return (
    <div className="font-inter min-h-screen text-gray-900 dark:text-gray-100">
      <style>
        {`
          @import url('https://rsms.me/inter/inter.css');
          html { font-family: 'Inter', sans-serif; }
          @supports (font-variation-settings: normal) {
            html { font-family: 'Inter var', sans-serif; }
          }
          .prose { max-width: 65ch; }
        `}
      </style>
      <AlertModal isOpen={alertInfo.show} onClose={() => setAlertInfo({ show: false, message: '' })} message={alertInfo.message} />
      {user ? <TradingJournal user={user} theme={theme} setTheme={setTheme} showAlert={showAlert} /> : <LoginScreen showAlert={showAlert} />}
    </div>
  );
}
