'use client';
import { collection, doc, Firestore, onSnapshot, orderBy, query, writeBatch, setDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { appId } from "../lib/firebaseConfig";
import { Target, PlusCircle, Trophy, Flag, History } from "lucide-react";
import { User } from "firebase/auth";
import { ConfirmationModal } from "./PopupModal/AlertModals";
import { Modal } from "./PopupModal/Modal";

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
    date?: import("firebase/firestore").Timestamp | Date | string | null;
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
    type?: string;
    target: number;
    achieved: number;
    status: string;
    duration?: number;
    startDate: import("firebase/firestore").Timestamp | Date | null;
    endDate: import("firebase/firestore").Timestamp | Date | null;
    [key: string]: unknown;
}

interface GoalsProps {
    user: User,
    activeJournalData: Journal,
    db: Firestore,
    activeJournalId: string | null,
    showAlert: (message: string) => void,
    trades: Trade[],
    activeGoal: Goal | null,
}


// Helper function to convert Timestamp or Date to Date
const toDate = (dateValue: import("firebase/firestore").Timestamp | Date | string | null | undefined): Date | null => {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue === 'string') return new Date(dateValue);
    if ('toDate' in dateValue) return dateValue.toDate();
    return null;
};

export const Goals = ({ user, db, activeJournalId, activeJournalData, showAlert, trades, activeGoal }: GoalsProps) => {
    const [goalView, setGoalView] = useState('Active');
    const [goalHistory, setGoalHistory] = useState<Goal[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newGoal, setNewGoal] = useState({ target: '', duration: '' });
    const [confirmation, setConfirmation] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const activeGoalRef = useMemo(() => {
        if (!activeJournalId || !appId) return null;
        return doc(db, 'artifacts', appId, 'users', user.uid, 'journals', activeJournalId as string, 'goals', 'activeGoal');
    }, [db, user.uid, activeJournalId]);

    const goalHistoryRef = useMemo(() => {
        if (!activeJournalId || !appId) return null;
        return collection(db, 'artifacts', appId, 'users', user.uid, 'journals', activeJournalId as string, 'goalHistory');
    }, [db, user.uid, activeJournalId]);

    useEffect(() => {
        if (goalView === 'History' && goalHistoryRef) {
            setIsLoadingHistory(true);
            const historyQuery = query(goalHistoryRef, orderBy("archivedAt", "desc"));
            const unsubHistory = onSnapshot(historyQuery, (snapshot) => {
                setGoalHistory(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Goal)));
                setIsLoadingHistory(false);
            }, (error) => { console.error("Error fetching goal history:", error); showAlert("Could not fetch goal history."); setIsLoadingHistory(false); });
            return () => unsubHistory();
        }
    }, [goalView, goalHistoryRef, showAlert]);

    const handleCreateGoal = async () => {
        if (!activeGoalRef) {
            showAlert("No active journal selected.");
            return;
        }
        const target = parseFloat(newGoal.target);
        const duration = parseInt(newGoal.duration, 10);
        if (isNaN(target) || isNaN(duration) || target <= 0 || duration <= 0) { showAlert("Please enter a valid target amount and duration."); return; }
        const startDate = new Date();
        const endDate = new Date(); endDate.setDate(startDate.getDate() + duration);
        await setDoc(activeGoalRef, { target, duration, startDate, endDate, status: 'In Progress', startBalance: activeJournalData.balance });
        setIsModalOpen(false); setNewGoal({ target: '', duration: '' });
    };

    const progress = useMemo(() => {
        if (!activeGoal) return null;
        const now = new Date();
        const startDate = toDate(activeGoal.startDate);
        const endDate = toDate(activeGoal.endDate);
        if (!startDate || !endDate) return null;

        const relevantTrades = trades.filter(t => {
            const tradeDate = toDate(t.date);
            return tradeDate && tradeDate >= startDate && tradeDate <= (now > endDate ? endDate : now);
        });
        const achieved = relevantTrades.reduce((sum, t) => sum + (t.sessionProfit || 0), 0);
        const isEnded = now > endDate;
        return { achieved, percentage: Math.max(0, (achieved / activeGoal.target) * 100), daysLeft: isEnded ? 0 : Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)), isEnded, status: isEnded ? (achieved >= activeGoal.target ? 'Completed' : 'Failed') : 'In Progress' };
    }, [activeGoal, trades]);

    const handleArchiveGoal = async () => {
        if (!activeGoal || !progress || !goalHistoryRef || !activeGoalRef) return;
        const finalGoalData = { ...activeGoal, achieved: progress.achieved, status: progress.status, archivedAt: serverTimestamp() };
        const batch = writeBatch(db);
        batch.set(doc(goalHistoryRef), finalGoalData);
        batch.delete(activeGoalRef);
        await batch.commit();
        showAlert(`Goal archived as ${progress.status}. You can now set a new goal.`);
    };

    const confirmCancelGoal = () => setConfirmation({ isOpen: true, title: 'Cancel Goal?', message: 'Are you sure you want to cancel this goal? It will be permanently deleted and not saved to your history.', onConfirm: handleCancelGoal });
    const handleCancelGoal = async () => {
        if (!activeGoalRef) return;
        await deleteDoc(activeGoalRef);
        showAlert("Active goal has been cancelled.");
    }

    const ActiveGoalView = () => {
        if (!activeGoal) return (<div className="text-center bg-white dark:bg-gray-800 p-12 rounded-xl shadow-lg border-dashed border-2 border-gray-300 dark:border-gray-700"><Target className="mx-auto h-12 w-12 text-gray-400" /><h3 className="mt-2 text-xl font-medium text-gray-900 dark:text-white">No active goal</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Set a new goal to start tracking your progress.</p><button onClick={() => setIsModalOpen(true)} className="mt-6 flex items-center mx-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"><PlusCircle className="mr-2 h-5 w-5" /> Set New Goal</button></div>);
        if (progress) return (<div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 space-y-6">{progress.isEnded ? (<div className="text-center space-y-4 p-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><h2 className="text-2xl font-bold">Goal Ended!</h2><div className={`inline-flex items-center justify-center py-2 px-4 rounded-full text-lg font-semibold ${progress.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'}`}>{progress.status === 'Completed' ? <Trophy className="mr-2" /> : <Flag className="mr-2" />} {progress.status}</div><p className="text-gray-600 dark:text-gray-300">You achieved <span className="font-bold">${progress.achieved.toFixed(2)}</span> of your <span className="font-bold">${activeGoal.target.toFixed(2)}</span> goal.</p><button onClick={handleArchiveGoal} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md">Archive & Set New Goal</button></div>) : (<><div><div className="flex justify-between items-center mb-1"><h2 className="text-2xl font-bold">Goal Progress</h2><button onClick={confirmCancelGoal} className="text-sm text-red-500 hover:text-red-700 font-medium">Cancel Goal</button></div><p className="text-gray-600 dark:text-gray-300">Target: <span className="font-semibold text-green-500">${activeGoal.target.toFixed(2)}</span> profit in {activeGoal.duration} days.</p><p className="text-sm text-gray-500 dark:text-gray-400">{progress.daysLeft} days left</p></div><div className="space-y-2"><div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4"><div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-4 rounded-full" style={{ width: `${Math.min(100, progress.percentage)}%` }}></div></div><div className="flex justify-between text-sm font-medium"><span className={`font-bold ${progress.achieved >= 0 ? 'text-gray-800 dark:text-gray-200' : 'text-red-500'}`}>${progress.achieved.toFixed(2)}</span><span>{progress.percentage.toFixed(2)}%</span></div></div></>)}</div>);
        return null;
    };

    const GoalHistoryList = () => {
        if (isLoadingHistory) return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;
        if (goalHistory.length === 0) return (<div className="text-center bg-white dark:bg-gray-800 p-12 rounded-xl shadow-lg border-dashed border-2 border-gray-300 dark:border-gray-700"><History className="mx-auto h-12 w-12 text-gray-400" /><h3 className="mt-2 text-xl font-medium text-gray-900 dark:text-white">No Goal History</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your archived goals will appear here.</p></div>);
        return (<div className="space-y-4">{goalHistory.map(goal => {
            const startDate = toDate(goal.startDate);
            const endDate = toDate(goal.endDate);
            return (<div key={goal.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div className="flex-grow"><p className="text-sm text-gray-500 dark:text-gray-400">{startDate?.toLocaleDateString() || 'N/A'} - {endDate?.toLocaleDateString() || 'N/A'}</p><p className="font-bold text-lg text-gray-800 dark:text-gray-200">Goal: <span className="text-blue-500">${goal.target.toFixed(2)}</span> in {goal.duration || 'N/A'} days</p></div><div className="flex items-center gap-4 w-full sm:w-auto"><div className="flex-1 text-center"><p className="text-sm text-gray-500 dark:text-gray-400">Achieved</p><p className={`font-bold text-lg ${goal.achieved >= 0 ? 'text-green-500' : 'text-red-500'}`}>${goal.achieved.toFixed(2)}</p></div><div className={`py-2 px-4 rounded-full text-sm font-semibold flex items-center gap-2 ${goal.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'}`}>{goal.status === 'Completed' ? <Trophy size={16} /> : <Flag size={16} />}{goal.status}</div></div></div>);
        })}</div>)
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">My Goals</h1>
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button onClick={() => setGoalView('Active')} className={`py-2 px-4 font-medium transition-colors ${goalView === 'Active' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Active Goal</button>
                <button onClick={() => setGoalView('History')} className={`py-2 px-4 font-medium transition-colors ${goalView === 'History' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>History</button>
            </div>
            {goalView === 'Active' ? <ActiveGoalView /> : <GoalHistoryList />}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Set a New Trading Goal"><div className="space-y-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Profit Target ($)</label><input type="number" placeholder="e.g., 500" value={newGoal.target} onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })} className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mt-1" /></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Duration (in days)</label><input type="number" placeholder="e.g., 30" value={newGoal.duration} onChange={(e) => setNewGoal({ ...newGoal, duration: e.target.value })} className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mt-1" /></div><button onClick={handleCreateGoal} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg">Start Goal</button></div></Modal>
            <ConfirmationModal isOpen={confirmation.isOpen} onClose={() => setConfirmation({ ...confirmation, isOpen: false })} title={confirmation.title} message={confirmation.message} onConfirm={confirmation.onConfirm} />
        </div>
    );
};