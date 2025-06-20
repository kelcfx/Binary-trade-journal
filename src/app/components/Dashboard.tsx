'use client';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { appId } from "../lib/firebaseConfig";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { Modal } from "./PopupModal/Modal";
import React from "react";
import { User } from "firebase/auth";
import { Firestore } from "firebase/firestore";
import { AnalogClock } from "./AnalogClock";
import { Eye, EyeOff, PlusCircle } from "lucide-react";

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
    type: string;
    target: number;
    achieved: number;
    status: string;
    startDate: import("firebase/firestore").Timestamp | Date | null;
    endDate: import("firebase/firestore").Timestamp | Date | null;
    [key: string]: unknown;
}

interface ToDateLike {
    toDate: () => Date;
}

interface DashboardProps {
    user: User,
    activeJournalData: Journal,
    db: Firestore,
    activeJournalId: string | null,
    showAlert: (message: string) => void,
    trades: Trade[],
    activeGoal: Goal | null,
    setActiveView: Dispatch<SetStateAction<string>>,
    onLogSessionClick: () => void,
    isBalanceVisible: boolean,
    setIsBalanceVisible: Dispatch<SetStateAction<boolean>>,
}

export const Dashboard = ({ user, activeJournalData, db, activeJournalId, trades, activeGoal, setActiveView, onLogSessionClick, isBalanceVisible, setIsBalanceVisible }: DashboardProps) => {
    const [isManageBalanceModalOpen, setIsManageBalanceModalOpen] = useState(false);
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
    const [transactionAmount, setTransactionAmount] = useState('');
    const [newGoals, setNewGoals] = useState({ daily: activeJournalData.dailyProfitTarget, weekly: activeJournalData.weeklyProfitGoal });
    const [newRisk, setNewRisk] = useState(activeJournalData.riskPercentage);

    useEffect(() => {
        if (activeJournalData) {
            setNewGoals({ daily: activeJournalData.dailyProfitTarget, weekly: activeJournalData.weeklyProfitGoal });
            setNewRisk(activeJournalData.riskPercentage);
        }
    }, [activeJournalData]);

    const handleTransaction = async (type: 'deposit' | 'withdraw') => {
        const amount = parseFloat(transactionAmount);
        if (isNaN(amount) || amount <= 0) return;
        const newBalance = type === 'deposit' ? activeJournalData.balance + amount : activeJournalData.balance - amount;
        if (newBalance < 0) return;

        if (!appId || !activeJournalId) return;
        const journalDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'journals', activeJournalId);
        await updateDoc(journalDocRef, { balance: newBalance });
        await addDoc(collection(journalDocRef, 'transactions'), { type, amount, timestamp: serverTimestamp(), newBalance });
        setTransactionAmount('');
        setIsManageBalanceModalOpen(false);
    };

    const handleGoalUpdate = async () => {
        if (!activeJournalId || !appId) return;
        const journalDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'journals', activeJournalId);
        await updateDoc(journalDocRef, {
            dailyProfitTarget: parseFloat(String(newGoals.daily)) || 0.01,
            weeklyProfitGoal: parseFloat(String(newGoals.weekly)) || 0.01,
        });
        setIsGoalModalOpen(false);
    };

    const handleRiskUpdate = async () => {
        if (!activeJournalId || !appId) return;
        const journalDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'journals', activeJournalId);
        await updateDoc(journalDocRef, { riskPercentage: parseFloat(String(newRisk)) || 2 });
        setIsRiskModalOpen(false);
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);

    const getDateObj = useCallback((date: string | Date | ToDateLike | null | undefined) => {
        if (!date) return null;
        if (typeof date === 'string') return new Date(date);
        if (date instanceof Date) return date;
        if (typeof date === 'object' && date !== null && typeof (date as ToDateLike).toDate === 'function') {
            return (date as ToDateLike).toDate();
        }
        return null;
    }, []);

    const todaysTrades = trades.filter(t => {
        const tradeDate = getDateObj(t.date as string | Date | ToDateLike | null | undefined);
        return tradeDate && tradeDate >= today;
    });

    const todaysProfit = todaysTrades.reduce((s, t) => s + (t.sessionProfit || 0), 0);
    const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    const weeklyProfit = trades.filter(t => {
        const tradeDate = getDateObj(t.date as string | Date | ToDateLike | null | undefined);
        return tradeDate && tradeDate >= startOfWeek;
    }).reduce((s, t) => s + (t.sessionProfit || 0), 0);

    const balanceHistory = useMemo(() => {
        if (!activeJournalData) return [];
        if (trades.length === 0) return [{ name: 'Start', balance: parseFloat(activeJournalData.balance.toFixed(2)) }];

        // Helper type for objects with a 'seconds' property (like Firestore Timestamp)
        type TimestampLike = { seconds: number };

        const sortedTrades = [...trades].sort((a, b) => {
            const aSeconds = (a.date && typeof (a.date as TimestampLike).seconds === 'number') ? (a.date as TimestampLike).seconds : 0;
            const bSeconds = (b.date && typeof (b.date as TimestampLike).seconds === 'number') ? (b.date as TimestampLike).seconds : 0;
            return aSeconds - bSeconds;
        });
        const totalProfitFromTrades = sortedTrades.reduce((sum, t) => sum + (t.sessionProfit || 0), 0);
        const initialBalance = activeJournalData.balance - totalProfitFromTrades;

        let runningBalance = parseFloat(initialBalance.toFixed(2));
        const history = [{ name: 'Start', balance: runningBalance }];

        sortedTrades.forEach((trade, index) => {
            runningBalance += (trade.sessionProfit || 0);
            history.push({ name: `T${index + 1}`, balance: parseFloat(runningBalance.toFixed(2)) });
        });

        return history;
    }, [trades, activeJournalData]);

    const mainGoalProgress = useMemo(() => {
        if (!activeGoal || !trades || !activeGoal.startDate) return null;
        const startDate = typeof activeGoal.startDate === 'object' && typeof (activeGoal.startDate as ToDateLike).toDate === 'function'
            ? (activeGoal.startDate as ToDateLike).toDate()
            : activeGoal.startDate;
        const relevantTrades = trades.filter(t => {
            const tradeDate = getDateObj(t.date as string | Date | ToDateLike | null | undefined);
            return tradeDate && tradeDate >= startDate;
        });
        const achieved = relevantTrades.reduce((sum, t) => sum + (t.sessionProfit || 0), 0);
        return {
            achieved,
            target: activeGoal.target,
            percentage: Math.max(0, (achieved / activeGoal.target) * 100)
        };
    }, [activeGoal, trades, getDateObj]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap gap-4 justify-between items-start">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">{getGreeting()}, {user.displayName || 'Trader'}!</h1>
                    <p className="text-md md:text-lg text-gray-500 dark:text-gray-400">Welcome to your {activeJournalData.name}.</p>
                </div>
                <button onClick={onLogSessionClick} className="flex-shrink-0 flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    <span>Log Session</span>
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <AnalogClock label="London" timezone="Europe/London" />
                    <AnalogClock label="New York" timezone="America/New_York" />
                    <AnalogClock label="Tokyo" timezone="Asia/Tokyo" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div
                    className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col cursor-pointer transition-transform transform hover:scale-[1.02]"
                    onClick={() => isBalanceVisible && setIsManageBalanceModalOpen(true)}
                >
                    <div className="flex flex-col items-center justify-center flex-grow p-6">
                        <div className="flex items-center gap-2">
                            <h3 className="text-md font-semibold text-gray-500 dark:text-gray-400 mb-1">Trading Balance</h3>
                            <button onClick={(e) => { e.stopPropagation(); setIsBalanceVisible(!isBalanceVisible); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                {isBalanceVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <p className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-gray-100">{isBalanceVisible ? `$${activeJournalData.balance.toFixed(2)}` : '$******'}</p>
                    </div>
                    <div className={`h-32 -mx-1 -mb-1 transition-all ${!isBalanceVisible ? 'filter blur-md' : ''}`}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={balanceHistory} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', border: '1px solid #e5e7eb', borderRadius: '12px' }}
                                    formatter={(value) => [isBalanceVisible ? `$${typeof value === 'number' ? value.toFixed(2) : value}` : 'Hidden', 'Balance']}
                                />
                                <Area type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} fill="url(#balanceGradient)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer transition-transform transform hover:scale-105" onClick={() => setIsGoalModalOpen(true)}>
                        <h3 className="text-md font-semibold text-gray-500 dark:text-gray-400 mb-2">Profit Targets</h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between items-center text-sm mb-1">
                                    <span className="font-medium text-gray-600 dark:text-gray-300">Daily</span>
                                    <span className={`font-bold break-all ${todaysProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>${todaysProfit.toFixed(2)} / ${activeJournalData.dailyProfitTarget.toFixed(2)}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                    <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, (todaysProfit / (activeJournalData.dailyProfitTarget || 1)) * 100)}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center text-sm mb-1">
                                    <span className="font-medium text-gray-600 dark:text-gray-300">Weekly</span>
                                    <span className={`font-bold break-all ${weeklyProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>${weeklyProfit.toFixed(2)} / ${activeJournalData.weeklyProfitGoal.toFixed(2)}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                    <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, (weeklyProfit / (activeJournalData.weeklyProfitGoal || 1)) * 100)}%` }}></div>
                                </div>
                            </div>
                            {mainGoalProgress && (
                                <div onClick={(e) => { e.stopPropagation(); setActiveView('Goals') }}>
                                    <div className="flex justify-between items-center text-sm mb-1 mt-3">
                                        <span className="font-medium text-gray-600 dark:text-gray-300">Main Goal</span>
                                        <span className={`font-bold break-all ${mainGoalProgress.achieved >= 0 ? 'text-purple-500' : 'text-red-500'}`}>${mainGoalProgress.achieved.toFixed(2)} / ${mainGoalProgress.target.toFixed(2)}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                        <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, mainGoalProgress.percentage)}%` }}></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <button onClick={() => setIsRiskModalOpen(true)} className="w-full bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center cursor-pointer transition-transform transform hover:scale-105">
                        <h3 className="text-md font-semibold text-gray-500 dark:text-gray-400 mb-1">Risk Management</h3>
                        <div className="flex items-baseline space-x-2">
                            <span className="text-2xl font-bold text-red-500">{activeJournalData.riskPercentage}%</span>
                            {isBalanceVisible && <span className="text-lg font-medium text-gray-700 dark:text-gray-300">(${((activeJournalData.balance * activeJournalData.riskPercentage) / 100).toFixed(2)})</span>}
                        </div>
                    </button>
                </div>
            </div>

            <Modal isOpen={isManageBalanceModalOpen} onClose={() => setIsManageBalanceModalOpen(false)} title="Manage Balance"><div className="space-y-4"><p className="text-gray-600 dark:text-gray-300">Enter amount to deposit or withdraw.</p><input type="number" value={transactionAmount} onChange={(e) => setTransactionAmount(e.target.value)} placeholder="Amount" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /><div className="flex space-x-4"><button onClick={() => handleTransaction('deposit')} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg">Deposit</button><button onClick={() => handleTransaction('withdraw')} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg">Withdraw</button></div></div></Modal>
            <Modal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} title="Update Profit Targets"><div className="space-y-4"><label className="block"><span className="text-gray-600 dark:text-gray-300">Daily Profit Target ($)</span><input type="number" value={newGoals.daily} onChange={(e) => setNewGoals({ ...newGoals, daily: parseFloat(e.target.value) || 0 })} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-3 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" /></label><label className="block"><span className="text-gray-600 dark:text-gray-300">Weekly Profit Goal ($)</span><input type="number" value={newGoals.weekly} onChange={(e) => setNewGoals({ ...newGoals, weekly: parseFloat(e.target.value) || 0 })} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-3 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" /></label><button onClick={handleGoalUpdate} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg">Save Goals</button></div></Modal>
            <Modal isOpen={isRiskModalOpen} onClose={() => setIsRiskModalOpen(false)} title="Adjust Risk"><div className="space-y-4"><label className="block"><span className="text-gray-600 dark:text-gray-300">Risk Percentage per Trade (%)</span><input type="number" value={newRisk} onChange={(e) => setNewRisk(parseFloat(e.target.value) || 0)} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-3 rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500" /></label><p className="text-sm text-gray-500 dark:text-gray-400 text-center">This will risk <span className="font-bold">${((activeJournalData.balance * newRisk) / 100).toFixed(2)}</span> of your current balance per trade.</p><button onClick={handleRiskUpdate} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg">Set Risk</button></div></Modal>
        </div>
    );
};