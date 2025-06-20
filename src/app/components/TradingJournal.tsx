'use client';
import { useEffect, useState } from "react";
import { appId, auth, db } from "../lib/firebaseConfig";
import { signOut, User } from "firebase/auth";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp, writeBatch } from "firebase/firestore";
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
import { Modal } from "./PopupModal/Modal";
import { TradeForm } from "./TradeForm";
import { updateAchievements } from "../utils/Achievements";
import { TrophyRoom } from "./TrophyRoom";


interface TradingJournalProp {
    user: User,
    theme?: string,
    setTheme: (theme: string) => void,
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
    time?: import("firebase/firestore").Timestamp | Date | string;
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
    type: string;
    target: number;
    achieved: number;
    status: string;
    startDate: import("firebase/firestore").Timestamp | Date | null;
    endDate: import("firebase/firestore").Timestamp | Date | null;
    [key: string]: unknown;
}

export const TradingJournal = ({ user, theme, setTheme, showAlert }: TradingJournalProp) => {
    const [activeView, setActiveView] = useState('Dashboard');
    const [journals, setJournals] = useState<Journal[]>([]);
    const [activeJournalId, setActiveJournalId] = useState<string | null>(null);
    const [activeJournalData, setActiveJournalData] = useState<Journal | null>(null);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);

    const [isBalanceVisible, setIsBalanceVisible] = useState(
        localStorage.getItem('isBalanceVisible') === 'false' ? false : true
    );

    useEffect(() => {
        localStorage.setItem('isBalanceVisible', String(isBalanceVisible));
    }, [isBalanceVisible]);

    // State for Trade Log Modal (lifted up)
    const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
    const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
    const [isManualProfit, setIsManualProfit] = useState(false);
    const [newTrade, setNewTrade] = useState({
        asset: '', direction: 'Buy', date: '', time: '',
        totalTrades: '', losingTrades: '', investmentPerTrade: '', roi: '', sessionProfit: ''
    });

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
            showAlert("Error signing out.");
        }
    };

    // --- Trade Modal Logic (lifted from TradeLogs) ---
    const handleTradeInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (editingTrade) {
            setEditingTrade((prev) => {
                if (!prev) return null;
                return { ...prev, [name]: value } as Trade;
            });
        } else {
            setNewTrade((prev) => ({ ...prev, [name]: value }));
        }
    };

    const processAndSaveTrade = async (tradeData: Trade) => {
        const { id, ...data } = tradeData;
        let sessionProfit;
        const tradeDate = new Date(`${data.date}T${data.time}`);
        // let finalTradeData = { ...data, date: Timestamp.fromDate(tradeDate) };

        let finalTradeData = {
            ...data,
            date: Timestamp.fromDate(tradeDate),
            totalTrades: 0,
            losingTrades: 0,
            winningTrades: 0,
            investmentPerTrade: 0,
            roi: 0,
        };

        if (isManualProfit) {
            const parsedProfit = parseFloat(String(data.sessionProfit));
            if (isNaN(parsedProfit)) { showAlert('Please enter a valid session profit amount.'); return; }
            sessionProfit = parseFloat(parsedProfit.toFixed(2));
            finalTradeData = { ...finalTradeData, sessionProfit, sessionOutcome: sessionProfit >= 0 ? 'Win' : 'Loss' };
        } else {
            const totalTrades = parseInt(String(data.totalTrades), 10);
            const losingTrades = parseInt(String(data.losingTrades), 10);
            const investmentPerTrade = parseFloat(String(data.investmentPerTrade));
            const roi = parseFloat(String(data.roi));
            if (isNaN(totalTrades) || isNaN(losingTrades) || isNaN(investmentPerTrade) || isNaN(roi) || losingTrades > totalTrades) {
                showAlert('Please check your inputs for calculating profit. Losing trades cannot exceed total trades.');
                return;
            }
            const winningTrades = totalTrades - losingTrades;
            const calculatedProfit = (winningTrades * investmentPerTrade * (roi / 100)) - (losingTrades * investmentPerTrade);
            sessionProfit = parseFloat(calculatedProfit.toFixed(2));
            finalTradeData = { ...finalTradeData, totalTrades, losingTrades, investmentPerTrade, roi, winningTrades, sessionProfit, sessionOutcome: sessionProfit >= 0 ? 'Win' : 'Loss' };
        }

        if (!appId || !activeJournalId) return;
        const journalRef = doc(db, 'artifacts', appId, 'users', user.uid, 'journals', activeJournalId);
        const batch = writeBatch(db);

        if (id) {
            const oldTrade = trades.find(t => t.id === id);
            const oldSessionProfit = oldTrade && typeof oldTrade.sessionProfit === "number" ? oldTrade.sessionProfit : 0;
            const profitDifference = sessionProfit - oldSessionProfit;
            const tradeRef = doc(journalRef, 'trades', id);
            batch.update(tradeRef, finalTradeData);
            if (activeJournalData) {
                batch.update(journalRef, { balance: activeJournalData.balance + profitDifference });
            } else {
                showAlert("Active journal data is not available.");
                return;
            }
        } else {
            const newTradeRef = doc(collection(journalRef, 'trades'));
            batch.set(newTradeRef, finalTradeData);
            if (activeJournalData) {
                batch.update(journalRef, { balance: activeJournalData.balance + sessionProfit });
            } else {
                showAlert("Active journal data is not available.");
                return;
            }
        }
        await batch.commit();
        await updateAchievements({ tradeDate, journalRef, user });

        setIsTradeModalOpen(false);
        setEditingTrade(null);
    };

    const handleOpenNewTradeModal = () => {
        const now = new Date();
        setNewTrade({ asset: '', direction: 'Buy', date: now.toLocaleDateString('en-CA'), time: now.toTimeString().slice(0, 5), totalTrades: '', losingTrades: '', investmentPerTrade: '', roi: '', sessionProfit: '' });
        setEditingTrade(null);
        setIsManualProfit(false);
        setIsTradeModalOpen(true);
    };

    const handleOpenEditTradeModal = (trade: Trade) => {
        let tradeDate: Date;
        if (
            trade.date &&
            typeof (trade.date as Timestamp).toDate === "function"
        ) {
            tradeDate = (trade.date as Timestamp).toDate();
        } else if (typeof trade.date === "string" || trade.date instanceof Date) {
            tradeDate = new Date(trade.date as string | Date);
        } else {
            tradeDate = new Date();
        }
        setIsManualProfit(trade.sessionProfit !== undefined && trade.totalTrades === undefined);
        setEditingTrade({ ...trade, date: tradeDate.toLocaleDateString('en-CA'), time: tradeDate.toTimeString().slice(0, 5) });
        setIsTradeModalOpen(true);
    };

    const handleDeleteTrade = async (tradeToDelete: Trade) => {
        if (!tradeToDelete || !appId || !activeJournalId || !activeJournalData) return;
        const journalRef = doc(db, 'artifacts', appId, 'users', user.uid, 'journals', activeJournalId);
        const tradeRef = doc(journalRef, 'trades', tradeToDelete.id);
        const profitToReverse = tradeToDelete.sessionProfit || 0;

        const batch = writeBatch(db);
        batch.delete(tradeRef);
        batch.update(journalRef, {
            balance: activeJournalData.balance - profitToReverse
        });

        try {
            await batch.commit();
            showAlert('Trade session deleted successfully.');
            // After deletion, re-evaluate achievements for that period
            if (tradeToDelete.date) {
                let tradeDate: Date;
                if (typeof (tradeToDelete.date as Timestamp).toDate === "function") {
                    tradeDate = (tradeToDelete.date as Timestamp).toDate();
                } else if (typeof tradeToDelete.date === "string" || tradeToDelete.date instanceof Date) {
                    tradeDate = new Date(tradeToDelete.date as string | Date);
                } else {
                    tradeDate = new Date();
                }
                await updateAchievements({ tradeDate, journalRef, user });
            }
        } catch (error) {
            console.error("Error deleting trade: ", error);
            showAlert('Failed to delete trade session.');
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
                setActiveGoal(docSnap.exists() ? (() => {
                    const data = docSnap.data();
                    return {
                        id: docSnap.id,
                        type: typeof data.type === "string" ? data.type : "",
                        target: typeof data.target === "number" ? data.target : 0,
                        achieved: typeof data.achieved === "number" ? data.achieved : 0,
                        status: typeof data.status === "string" ? data.status : "",
                        startDate: data.startDate ?? null,
                        endDate: data.endDate ?? null,
                        ...data
                    } as Goal;
                })() : null);
            })
        ];
        setTimeout(() => setLoading(false), 500); // Give a moment for all listeners to attach
        return () => unsubs.forEach(unsub => unsub());
    }, [user, activeJournalId, journals]);

    const renderView = () => {
        if (loading || !activeJournalData) {
            return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
        }

        const props = { user, activeJournalData, db, activeJournalId, showAlert, trades, activeGoal, setActiveView, onLogSessionClick: handleOpenNewTradeModal, handleOpenEditTradeModal, handleDeleteTrade, isBalanceVisible, setIsBalanceVisible };

        switch (activeView) {
            case 'Dashboard': return <Dashboard {...props} />;
            case 'Trade Logs': return <TradeLogs {...props} />;
            case 'Trophy Room': return <TrophyRoom {...props} />;
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
        <div className="relative flex h-screen bg-gray-100 dark:bg-gray-950">
            <Sidebar
                activeView={activeView}
                setActiveView={setActiveView}
                user={user}
                handleLogout={handleLogout}
                theme={theme}
                setTheme={setTheme}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
            />
            <main className="flex-1 flex flex-col overflow-y-auto">
                <header className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-md text-gray-500 dark:text-gray-400">
                        <Menu className="h-6 w-6" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200">{activeView}</h1>
                    <div className="w-8"></div>
                </header>

                <div className="flex-1 p-4 md:p-8">
                    <div className="relative z-10">{renderView()}</div>
                </div>
            </main>

            <Modal isOpen={isTradeModalOpen} onClose={() => setIsTradeModalOpen(false)} title={editingTrade ? "Edit Trading Session" : "Log New Trading Session"}>
                <TradeForm
                    tradeData={{
                        id: (editingTrade?.id ?? ''),
                        ...(editingTrade
                            ? {
                                ...editingTrade,
                                totalTrades: editingTrade.totalTrades !== undefined && String(editingTrade.totalTrades) !== '' ? Number(editingTrade.totalTrades) : undefined,
                                losingTrades: editingTrade.losingTrades !== undefined && String(editingTrade.losingTrades) !== '' ? Number(editingTrade.losingTrades) : undefined,
                                investmentPerTrade: editingTrade.investmentPerTrade !== undefined && !isNaN(Number(editingTrade.investmentPerTrade)) ? Number(editingTrade.investmentPerTrade) : undefined,
                                roi: editingTrade.roi !== undefined && !isNaN(Number(editingTrade.roi)) ? Number(editingTrade.roi) : undefined,
                                sessionProfit: editingTrade.sessionProfit !== undefined ? Number(editingTrade.sessionProfit) : undefined,
                            }
                            : {
                                ...newTrade,
                                totalTrades: newTrade.totalTrades === '' ? undefined : Number(newTrade.totalTrades),
                                losingTrades: newTrade.losingTrades === '' ? undefined : Number(newTrade.losingTrades),
                                investmentPerTrade: newTrade.investmentPerTrade === '' ? undefined : Number(newTrade.investmentPerTrade),
                                roi: newTrade.roi === '' ? undefined : Number(newTrade.roi),
                                sessionProfit: newTrade.sessionProfit === '' ? undefined : Number(newTrade.sessionProfit),
                            }
                        ),
                        time: (editingTrade?.time ?? newTrade.time ?? new Date().toTimeString().slice(0, 5)),
                    }}
                    onInputChange={handleTradeInputChange}
                    onSubmit={(e) => {
                        e.preventDefault();
                        const tradeToSave = editingTrade || {
                            ...newTrade,
                            id: '',
                            totalTrades: newTrade.totalTrades === '' ? undefined : Number(newTrade.totalTrades),
                            losingTrades: newTrade.losingTrades === '' ? undefined : Number(newTrade.losingTrades),
                            investmentPerTrade: newTrade.investmentPerTrade === '' ? undefined : Number(newTrade.investmentPerTrade),
                            roi: newTrade.roi === '' ? undefined : Number(newTrade.roi),
                            sessionProfit: newTrade.sessionProfit === '' ? undefined : Number(newTrade.sessionProfit)
                        };
                        processAndSaveTrade(tradeToSave as Trade);
                    }}
                    isManualProfit={isManualProfit}
                    setIsManualProfit={setIsManualProfit}
                />
            </Modal>
        </div>
    );
};