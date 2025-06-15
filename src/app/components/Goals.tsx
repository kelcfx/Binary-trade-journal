'use client';
import { collection, doc, Firestore, getDoc, onSnapshot, orderBy, query, writeBatch } from "firebase/firestore";
import { useEffect, useState } from "react";
import { appId } from "../lib/firebaseConfig";
import { Download, RefreshCw } from "lucide-react";
import { downloadCSV } from "../utils/downloadCSV";
import { User } from "firebase/auth";

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

interface GoalsProps {
    user: User,
    activeJournalData: Journal,
    db: Firestore,
    activeJournalId: string | null,
    showAlert: (message: string) => void;
}

interface GoalHistory {
    id: string;
    type: string;
    target: number;
    achieved: number;
    status: string;
    startDate: import("firebase/firestore").Timestamp | Date | null;
    endDate: import("firebase/firestore").Timestamp | Date | null;
    [key: string]: unknown;
}

export const Goals = ({ user, activeJournalData, db, activeJournalId, showAlert }: GoalsProps) => {
    const [goalHistory, setGoalHistory] = useState<GoalHistory[]>([]);
    const [trades, setTrades] = useState<{ date: import("firebase/firestore").Timestamp, sessionProfit?: number }[]>([]);

    useEffect(() => {
        if (!activeJournalId || !appId) return;
        const historyQuery = query(collection(db, 'artifacts', appId, 'users', user.uid, 'journals', activeJournalId, 'goalHistory'), orderBy("endDate", "desc"));
        const tradesQuery = query(collection(db, 'artifacts', appId, 'users', user.uid, 'journals', activeJournalId, 'trades'));

        const unsubHistory = onSnapshot(historyQuery, (snapshot) =>
            setGoalHistory(
                snapshot.docs.map(d => {
                    const data = d.data();
                    return {
                        id: d.id,
                        type: typeof data.type === "string" ? data.type : "",
                        target: typeof data.target === "number" ? data.target : 0,
                        achieved: typeof data.achieved === "number" ? data.achieved : 0,
                        status: typeof data.status === "string" ? data.status : "",
                        startDate: data.startDate ?? null,
                        endDate: data.endDate ?? null,
                        ...data
                    } as GoalHistory;
                })
            )
        );
        const unsubTrades = onSnapshot(tradesQuery, (snapshot) =>
            setTrades(
                snapshot.docs
                    .map(d => {
                        const data = d.data();
                        // Only include trades with a valid date
                        if (!data.date) return null;
                        return {
                            date: data.date as import("firebase/firestore").Timestamp,
                            sessionProfit: typeof data.sessionProfit === "number" ? data.sessionProfit : undefined,
                        } as { date: import("firebase/firestore").Timestamp, sessionProfit?: number };
                    })
                    .filter((t): t is { date: import("firebase/firestore").Timestamp, sessionProfit?: number } => t !== null)
            )
        );

        return () => {
            unsubHistory();
            unsubTrades();
        };
    }, [user.uid, db, activeJournalId]);

    const updateGoalHistory = async () => {
        const today = new Date();
        const batch = writeBatch(db);
        if (!appId || !activeJournalId) return;
        const goalHistoryRef = collection(db, 'artifacts', appId, 'users', user.uid, 'journals', activeJournalId, 'goalHistory');

        // Check daily goals for past 30 days
        for (let i = 1; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const goalId = `daily-${dateStr}`;

            const existingGoalDoc = await getDoc(doc(goalHistoryRef, goalId));
            if (!existingGoalDoc.exists()) {
                const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
                const profit = trades.filter(t => t.date.toDate() >= dayStart && t.date.toDate() <= dayEnd)
                    .reduce((sum, t) => sum + (t.sessionProfit || 0), 0);

                let status = "Uncompleted";
                if (profit >= activeJournalData.dailyProfitTarget) status = "Completed";
                else if (profit < 0) status = "Failed";

                const newGoal = {
                    type: 'Daily',
                    target: activeJournalData.dailyProfitTarget,
                    achieved: profit,
                    status: status,
                    startDate: dayStart,
                    endDate: dayEnd
                };
                batch.set(doc(goalHistoryRef, goalId), newGoal);
            }
        }
        await batch.commit();
        showAlert("Goal history updated.");
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Completed": return "text-green-500 bg-green-500/10";
            case "Failed": return "text-red-500 bg-red-500/10";
            case "Uncompleted": return "text-yellow-500 bg-yellow-500/10";
            default: return "text-gray-500 bg-gray-500/10";
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100">Goal History</h1>
                <div className="flex space-x-2">
                    <button onClick={updateGoalHistory} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"><RefreshCw className="mr-2 h-5 w-5" /> Update History</button>
                    <button
                        onClick={() =>
                            downloadCSV(
                                goalHistory.map(g => ({
                                    ...g,
                                    startDate:
                                        g.startDate && typeof (g.startDate as import("firebase/firestore").Timestamp).toDate === "function"
                                            ? (g.startDate as import("firebase/firestore").Timestamp).toDate()
                                            : g.startDate ?? null,
                                    endDate:
                                        g.endDate && typeof (g.endDate as import("firebase/firestore").Timestamp).toDate === "function"
                                            ? (g.endDate as import("firebase/firestore").Timestamp).toDate()
                                            : g.endDate ?? null,
                                })),
                                'goal-history.csv'
                            )
                        }
                        className="flex items-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"
                    >
                        <Download className="mr-2 h-5 w-5" /> Export
                    </button>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
                        <tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Target</th><th className="p-3">Achieved</th><th className="p-3">Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {goalHistory.map(g => (
                            <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="p-3">
                                    {g.endDate
                                        ? (g.endDate instanceof Date
                                            ? g.endDate.toLocaleDateString()
                                            : (typeof g.endDate.toDate === 'function'
                                                ? g.endDate.toDate().toLocaleDateString()
                                                : 'N/A'))
                                        : 'N/A'}
                                </td>
                                <td className="p-3">{g.type}</td>
                                <td className="p-3">${g.target?.toFixed(2)}</td>
                                <td className={`p-3 font-semibold ${g.achieved >= 0 ? 'text-green-500' : 'text-red-500'}`}>${g.achieved?.toFixed(2)}</td>
                                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(g.status)}`}>{g.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {goalHistory.length === 0 && <p className="text-center p-4 text-gray-500 dark:text-gray-400">No goal history found. Click &quot;Update History&quot; to check for completed goals.</p>}
            </div>
        </div>
    );
};