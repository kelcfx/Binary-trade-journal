'use client';
import { useEffect, useState } from "react";
import { appId, auth, db } from "../lib/firebaseConfig";
import { signOut, User } from "firebase/auth";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { Sidebar } from "./Sidebar";
import { Dashboard } from "./Dashboard";
import { TradeLogs } from "./TradeLogs";
import { Performance } from "./Performance";
import { Plan } from "./Plan";
import { Goals } from "./Goals";
import { Transactions } from "./Transactions";
import { CalendarView } from "./CalendarView";
import { AccountManager } from "./AccountManager";
import { Menu } from "lucide-react";


interface TradingJournalProp {
    user: User,
    theme?: string,
    setTheme: (theme: string) => void,
    isSystemDark: boolean,
    showAlert: (message: string) => void
}

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

interface Trade {
    id: string;
    asset?: string;
    direction?: string;
    date?: import("firebase/firestore").Timestamp | Date | string;
    sessionProfit?: number;
    sessionOutcome?: string;
    totalTrades?: number;
    investmentPerTrade?: number;
    roi?: number;
    winningTrades?: number;
    losingTrades?: number;
    [key: string]: unknown;
}

interface Goal {
    id: string;
    [key: string]: unknown;
}

export const TradingJournal = ({ user, theme, setTheme, isSystemDark, showAlert }: TradingJournalProp) => {
    const [activeView, setActiveView] = useState('Dashboard');
    const [journals, setJournals] = useState<Journal[]>([]);
    const [activeJournalId, setActiveJournalId] = useState<string | null>(null);
    const [activeJournalData, setActiveJournalData] = useState<Journal | null>(null);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
            showAlert("Error signing out.");
        }
    };

    // Effect to load initial journal from localStorage or default
    useEffect(() => {
        if (journals.length > 0 && initialLoad) {
            const lastJournalId = localStorage.getItem('lastActiveJournalId');
            const lastJournalExists = journals.some(j => j.id === lastJournalId);
            setActiveJournalId(lastJournalExists ? lastJournalId : journals[0].id);
            setInitialLoad(false);
        }
    }, [journals, initialLoad]);

    // Effect to save the active journal ID to localStorage
    useEffect(() => {
        if (activeJournalId && !initialLoad) {
            localStorage.setItem('lastActiveJournalId', activeJournalId);
        }
    }, [activeJournalId, initialLoad]);

    useEffect(() => {
        if (!user) return;
        if (!appId || !user?.uid) return;
        const journalsQuery = query(collection(db, 'artifacts', appId, 'users', user.uid, 'journals'));
        const unsubscribeJournals = onSnapshot(journalsQuery, async (snapshot) => {
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
                } as Journal;
            });
            if (snapshot.empty) {
                if (!appId) return;
                const newJournalRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'journals'));
                await setDoc(newJournalRef, {
                    name: user.isAnonymous ? 'Guest Journal' : 'My First Journal',
                    createdAt: serverTimestamp(),
                    balance: 0, dailyProfitTarget: 0, weeklyProfitGoal: 0, riskPercentage: 2,
                });
            } else {
                setJournals(journalsList);
            }
        }, (error) => {
            console.error("Error fetching journals: ", error);
            showAlert("Could not fetch trading journals.");
        });
        return () => unsubscribeJournals();
    }, [user, showAlert]);

    useEffect(() => {
        if (!user || !activeJournalId || !appId) {
            setActiveJournalData(null);
            setTrades([]);
            setActiveGoal(null);
            return;
        };
        setLoading(true);
        const journalRef = doc(db, 'artifacts', appId, 'users', user.uid, 'journals', activeJournalId);

        const unsubs = [
            onSnapshot(journalRef, (docSnap) => {
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
                    // This can happen if a journal is deleted, the logic above will handle resetting it.
                    localStorage.removeItem('lastActiveJournalId');
                    setInitialLoad(true); // Re-trigger initial load logic
                }
            }),
            onSnapshot(query(collection(journalRef, 'trades'), orderBy("date", "asc")), (snapshot) => {
                const tradeData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        date: data.date // Ensure date is explicitly included
                    };
                });
                tradeData.sort((a, b) => ((b.date?.seconds || 0) - (a.date?.seconds || 0)));
                setTrades(tradeData);
            }),
            onSnapshot(doc(journalRef, 'goals', 'activeGoal'), (docSnap) => {
                setActiveGoal(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null);
            })
        ];
        setTimeout(() => setLoading(false), 500); // Give a moment for all listeners to attach
        return () => unsubs.forEach(unsub => unsub());
    }, [user, activeJournalId, journals]);

    const renderView = () => {
        if (loading || !activeJournalData) {
            return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
        }

        const props = { user, activeJournalData, db, activeJournalId, showAlert, theme, isSystemDark, trades, activeGoal, setActiveView };

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
        <div className={`relative flex h-screen ${theme === 'dark' || isSystemDark ? "dark:bg-gray-950" : "bg-gray-100"}`}>
            <Sidebar activeView={activeView} setActiveView={setActiveView} user={user} handleLogout={handleLogout} theme={theme} setTheme={setTheme} isSystemDark={isSystemDark} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

            <main className="flex-1 flex flex-col overflow-y-auto">
                <header className={`lg:hidden flex items-center justify-between p-4 border-b sticky top-0 z-30 ${theme === "dark" || isSystemDark ? "dark:bg-gray-900 dark:border-gray-800" : "border-gray-200 bg-white"}`}>
                    <button onClick={() => setIsSidebarOpen(true)} className={`p-2 rounded-md ${theme === "dark" || isSystemDark ? "dark:text-gray-400" : "text-gray-500"}`}>
                        <Menu className="h-6 w-6" />
                    </button>
                    <h1 className={`text-lg font-bold ${theme === "dark" || isSystemDark ? "dark:text-gray-200" : "text-gray-800"}`}>{activeView}</h1>
                    <div className="w-8"></div> {/* Spacer to balance the header */}
                </header>
                <div className="flex-1 p-4 md:p-8">
                    <div className="relative z-10">{renderView()}</div>
                </div>
            </main>
        </div>
    );
};