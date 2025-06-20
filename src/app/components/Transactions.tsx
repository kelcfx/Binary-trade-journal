'use client';

import { collection, Firestore, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { appId } from "../lib/firebaseConfig";
import { downloadCSV } from "../utils/downloadCSV";
import { Download } from "lucide-react";
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

interface TxsProps {
    user: User,
    activeJournalData: Journal,
    db: Firestore,
    activeJournalId: string | null,
    showAlert: (message: string) => void,
}

interface Transaction {
    id: string;
    amount: number;
    type: string;
    timestamp?: { seconds: number; nanoseconds: number };
    newBalance: number;
    [key: string]: unknown;
}


export const Transactions = ({ user, db, activeJournalId }: TxsProps) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        if (!activeJournalId || !appId) return;
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'journals', activeJournalId, 'transactions'), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction))));
        return () => unsubscribe();
    }, [user.uid, db, activeJournalId]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center"><h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">Transaction History</h1><button onClick={() => downloadCSV(transactions.map(t => ({ ...t, timestamp: t.timestamp ? new Date(t.timestamp.seconds * 1000) : null })), 'transaction-history.csv')} className="flex items-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"><Download className="mr-2 h-5 w-5" /> <span className="hidden sm:inline">Export</span></button></div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-left"><thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700"><tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Amount</th><th className="p-3">New Balance</th></tr></thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {transactions.map(t => (<tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700"><td className="p-3">{t.timestamp ? new Date(t.timestamp.seconds * 1000).toLocaleString() : 'N/A'}</td><td className={`p-3 font-semibold capitalize ${t.type === 'deposit' ? 'text-green-500' : 'text-red-500'}`}>{t.type}</td><td className="p-3">${t.amount?.toFixed(2)}</td><td className="p-3 font-medium">${t.newBalance?.toFixed(2)}</td></tr>))}
                    </tbody>
                </table>
                {transactions.length === 0 && <p className="text-center p-4 text-gray-500 dark:text-gray-400">No transactions recorded yet.</p>}
            </div>
        </div>
    );
};