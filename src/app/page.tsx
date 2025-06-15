'use client';
import { useEffect, useState } from "react";

import { onAuthStateChanged } from 'firebase/auth'
import { useTheme } from "next-themes";
import { auth } from "./lib/firebaseConfig";
import { AlertModal } from "./components/AlertModals";
import { TradingJournal } from "./components/TradingJournal";
import { LoginScreen } from "./components/Login";

export default function Home() {
  const [user, setUser] = useState<import('firebase/auth').User | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useTheme();
  const [alertInfo, setAlertInfo] = useState({ show: false, message: '' });

  const showAlert = (message : string) => setAlertInfo({ show: true, message });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-950"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div></div>;
  }

  return (
    <div className={`font-inter bg-gray-50 min-h-screen ${theme === "light" ? "bg-gray-50 text-gray-900" : "dark:bg-gray-950  dark:text-gray-100"}`}>
      <style>
        {`
              @import url('https://rsms.me/inter/inter.css');
              html { font-family: 'Inter', sans-serif; }
              @supports (font-variation-settings: normal) {
                html { font-family: 'Inter var', sans-serif; }
              }
            `}
      </style>
      <AlertModal isOpen={alertInfo.show} onClose={() => setAlertInfo({ show: false, message: '' })} message={alertInfo.message} />
      {user ? <TradingJournal user={user} theme={theme} setTheme={setTheme} /> : <LoginScreen showAlert={showAlert} />}
    </div>
  );
}
