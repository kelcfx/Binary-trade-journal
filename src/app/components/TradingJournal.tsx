'use client';
import { useEffect, useState } from "react";
import { appId, auth, db } from "../lib/firebaseConfig";
import { signOut, User } from "firebase/auth";
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc } from "firebase/firestore";
import { AlertModal } from "./AlertModals";
import { Sidebar } from "./Sidebar";
import { Dashboard } from "./Dashboard";
import { TradeLogs } from "./TradeLogs";
import { Performance } from "./Performance";
import { Plan } from "./Plan";
import { Goals } from "./Goals";
import { Transactions } from "./Transactions";
import { CalendarView } from "./CalendarView";
import { AccountManager } from "./AccountManager";


interface TradingJournalProp {
    user: User,
    theme?: string,
    setTheme: (theme: string) => void,
    isSystemDark: boolean
}

export const TradingJournal = ({ user, theme, setTheme, isSystemDark }: TradingJournalProp) => {
    const [activeView, setActiveView] = useState('Dashboard');
    interface Journal {
        id: string;
        name: string;
        createdAt: import("firebase/firestore").Timestamp | null; // Use Firebase Timestamp or null if not set
        balance: number;
        dailyProfitTarget: number;
        weeklyProfitGoal: number;
        riskPercentage: number;
        [key: string]: unknown; // For any additional fields
    }
    const [journals, setJournals] = useState<Journal[]>([]);
    const [activeJournalId, setActiveJournalId] = useState<string | null>(null);
    const [activeJournalData, setActiveJournalData] = useState<Journal | null>(null);
    const [loadingJournals, setLoadingJournals] = useState(true);
    const [alertInfo, setAlertInfo] = useState({ show: false, message: '' });

    const showAlert = (message: string) => setAlertInfo({ show: true, message });

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
            showAlert("Error signing out.");
        }
    };

    useEffect(() => {
        if (!user) return;
        if (!appId || !user?.uid) return;
        const journalsQuery = query(collection(db, 'artifacts', appId, 'users', user.uid, 'journals'));
        const unsubscribeJournals = onSnapshot(journalsQuery, async (snapshot) => {
            setLoadingJournals(true);
            if (snapshot.empty) {
                if (!appId) throw new Error("appId is undefined");
                const newJournalRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'journals'));
                const defaultJournal = {
                    name: user.isAnonymous ? 'Guest Journal' : 'My First Journal',
                    createdAt: serverTimestamp(),
                    balance: 0,
                    dailyProfitTarget: 0,
                    weeklyProfitGoal: 0,
                    riskPercentage: 0,
                };
                await setDoc(newJournalRef, defaultJournal);
                setActiveJournalId(newJournalRef.id);
            } else {
                const journalsList = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        name: typeof data.name === "string" ? data.name : "",
                        createdAt: data.createdAt ?? null,
                        balance: typeof data.balance === "number" ? data.balance : 0,
                        dailyProfitTarget: typeof data.dailyProfitTarget === "number" ? data.dailyProfitTarget : 0,
                        weeklyProfitGoal: typeof data.weeklyProfitGoal === "number" ? data.weeklyProfitGoal : 0,
                        riskPercentage: typeof data.riskPercentage === "number" ? data.riskPercentage : 0,
                        ...data
                    };
                });
                setJournals(journalsList);
                if (!activeJournalId || !journalsList.some(j => j.id === activeJournalId)) {
                    setActiveJournalId(journalsList[0]?.id || null);
                }
            }
            setLoadingJournals(false);
        }, (error) => {
            console.error("Error fetching journals: ", error);
            showAlert("Could not fetch trading journals.");
            setLoadingJournals(false);
        });
        return () => unsubscribeJournals();
    }, [user, activeJournalId]);

    useEffect(() => {
        if (!user || !activeJournalId || !appId) {
            setActiveJournalData(null);
            return;
        }
        const journalDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'journals', activeJournalId);
        const unsubscribeJournalData = onSnapshot(journalDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setActiveJournalData({
                    id: docSnap.id,
                    name: typeof data.name === "string" ? data.name : "",
                    createdAt: data.createdAt ?? null,
                    balance: typeof data.balance === "number" ? data.balance : 0,
                    dailyProfitTarget: typeof data.dailyProfitTarget === "number" ? data.dailyProfitTarget : 0,
                    weeklyProfitGoal: typeof data.weeklyProfitGoal === "number" ? data.weeklyProfitGoal : 0,
                    riskPercentage: typeof data.riskPercentage === "number" ? data.riskPercentage : 0,
                    ...data
                });
            } else {
                setActiveJournalId(journals[0]?.id || null);
                setActiveJournalData(null);
            }
        }, (error) => {
            console.error("Error fetching active journal data: ", error);
            showAlert("Could not fetch active journal data.");
        });
        return () => unsubscribeJournalData();
    }, [user, activeJournalId, journals]);

    const renderView = () => {
        if (loadingJournals || !activeJournalData) {
            return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
        }

        const props = { user, activeJournalData, db, activeJournalId, showAlert, theme, isSystemDark };

        switch (activeView) {
            case 'Dashboard': return <Dashboard {...props} />;
            case 'Trade Logs': return <TradeLogs {...props} />;
            case 'Performance': return <Performance {...props} />;
            case 'Plan': return <Plan {...props} />;
            case 'Goals': return <Goals {...props} />
            case 'Transactions': return <Transactions {...props} />;
            case 'Calendar': return <CalendarView {...props} />;
            case 'Journal Manager': return <AccountManager {...props} journals={journals} setActiveJournalId={setActiveJournalId} />;
            default: return <Dashboard {...props} />;
        }
    };

    return (
        <div className="flex h-screen">
            <Sidebar activeView={activeView} setActiveView={setActiveView} user={user} handleLogout={handleLogout} theme={theme} setTheme={setTheme} isSystemDark={isSystemDark} />
            <main className={`flex-1 p-4 md:p-8 overflow-y-auto ${theme === "dark" ? "dark:bg-gray-950" : "bg-gray-100"}`}>
                <div className="relative z-10">{renderView()}</div>
            </main>
            <AlertModal isOpen={alertInfo.show} onClose={() => setAlertInfo({ show: false, message: '' })} message={alertInfo.message} />
        </div>
    );
};