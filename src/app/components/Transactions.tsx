'use client';

import { collection, doc, Firestore, getDocs, onSnapshot, orderBy, query, writeBatch } from "firebase/firestore";
import { useEffect, useState } from "react";
import { appId } from "../lib/firebaseConfig";
import { downloadCSV } from "../utils/downloadCSV";
import { Download, Edit } from "lucide-react";
import { Modal } from "./Modal";
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
    showAlert: (message: string) => void;
}

interface Transaction {
    id: string;
    amount: number;
    type: string;
    timestamp?: { seconds: number; nanoseconds: number };
    newBalance: number;
    [key: string]: unknown;
}

interface EditTransactionFormProps {
    transaction: Transaction;
    onSave: (data: { id: string; amount: number | string }) => void;
}

export const Transactions = ({ user, db, activeJournalId, activeJournalData, showAlert }: TxsProps) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (!activeJournalId || !appId) return;
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'journals', activeJournalId, 'transactions'), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) =>
            setTransactions(
                snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        amount: typeof data.amount === "number" ? data.amount : 0,
                        type: typeof data.type === "string" ? data.type : "",
                        newBalance: typeof data.newBalance === "number" ? data.newBalance : 0,
                        timestamp: data.timestamp ?? undefined,
                        ...data
                    } as Transaction;
                })
            )
        );
        return () => unsubscribe();
    }, [user.uid, db, activeJournalId]);

    const handleOpenEditModal = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setIsModalOpen(true);
    };

    const handleSaveEdit = async (editedData: { id: string; amount: number | string }) => {
        const { id, amount: newAmountStr } = editedData;
        const newAmount = parseFloat(String(newAmountStr));
        if (isNaN(newAmount) || newAmount <= 0) {
            showAlert("Invalid amount.");
            return;
        }

        if (!editingTransaction) {
            showAlert("No transaction selected for editing.");
            return;
        }
        const oldAmount = editingTransaction.amount;
        const amountChange = newAmount - oldAmount;

        const batch = writeBatch(db);
        if (!activeJournalId || !appId) {
            showAlert("No active journal selected.");
            return;
        }
        const journalRef = doc(db, 'artifacts', appId, 'users', user.uid, 'journals', activeJournalId);

        // Update the current transaction
        const editedTransactionRef = doc(journalRef, 'transactions', id);
        batch.update(editedTransactionRef, { amount: newAmount });

        // Update all subsequent transactions and the journal balance
        const allTransactionsQuery = query(collection(journalRef, 'transactions'), orderBy("timestamp", "asc"));
        const allTransactionsSnap = await getDocs(allTransactionsQuery);
        let foundEdited = false;

        allTransactionsSnap.docs.forEach(docSnap => {
            const trans = { id: docSnap.id, ...docSnap.data() } as Transaction;
            if (foundEdited) {
                batch.update(docSnap.ref, { newBalance: trans.newBalance + amountChange });
            }
            if (trans.id === id) {
                batch.update(docSnap.ref, { newBalance: trans.newBalance + amountChange });
                foundEdited = true;
            }
        });

        batch.update(journalRef, { balance: activeJournalData.balance + amountChange });

        await batch.commit();
        setIsModalOpen(false);
        setEditingTransaction(null);
        showAlert("Transaction updated successfully. All subsequent balances have been adjusted.");
    };

    const EditTransactionForm: React.FC<EditTransactionFormProps> = ({ transaction, onSave }) => {
        const [amount, setAmount] = useState(transaction.amount);
        return (
            <div className="space-y-4">
                <p>Editing a transaction will recalculate all subsequent balances.</p>
                <label className="block"><span className="text-gray-600 dark:text-gray-300">Amount ($)</span><input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mt-1" /></label>
                <button onClick={() => onSave({ ...transaction, amount })} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg">Save Changes</button>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100">Transaction History</h1>
                <button onClick={() => downloadCSV(transactions.map(t => ({ ...t, timestamp: t.timestamp ? new Date(t.timestamp.seconds * 1000) : undefined })), 'transaction-history.csv')} className="flex items-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"><Download className="mr-2 h-5 w-5" /> Export</button>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
                        <tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Amount</th><th className="p-3">New Balance</th><th className="p-3">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {transactions.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="p-3">{t.timestamp ? new Date(t.timestamp.seconds * 1000).toLocaleString() : 'N/A'}</td>
                                <td className={`p-3 font-semibold capitalize ${t.type === 'deposit' ? 'text-green-500' : 'text-red-500'}`}>{t.type}</td>
                                <td className="p-3">${t.amount?.toFixed(2)}</td>
                                <td className="p-3 font-medium">${t.newBalance?.toFixed(2)}</td>
                                <td className="p-3"><button onClick={() => handleOpenEditModal(t)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 rounded-full"><Edit className="w-4 h-4" /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {transactions.length === 0 && <p className="text-center p-4 text-gray-500 dark:text-gray-400">No transactions recorded yet.</p>}
            </div>
            {editingTransaction && <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Edit Transaction"><EditTransactionForm transaction={editingTransaction} onSave={handleSaveEdit} /></Modal>}
        </div>
    );
};