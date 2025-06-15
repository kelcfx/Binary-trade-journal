'use client';

import { addDoc, collection, deleteDoc, doc, Firestore, getDocs, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { Dispatch, SetStateAction, useState } from "react";
import { appId, db } from "../lib/firebaseConfig";
import { Edit, PlusCircle, RefreshCw, Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import { ConfirmationModal } from "./AlertModals";
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

interface AccpountManagerProps {
    user: User,
    activeJournalData: Journal,
    db: Firestore,
    activeJournalId: string | null,
    showAlert: (message: string) => void;
    journals: Journal[],
    setActiveJournalId: Dispatch<SetStateAction<string | null>>,
    theme?: string,
    isSystemDark: boolean
}

export const AccountManager = ({ journals, activeJournalId, setActiveJournalId, user, showAlert, theme, isSystemDark }: AccpountManagerProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingJournal, setEditingJournal] = useState<Journal | null>(null);
    const [journalName, setJournalName] = useState('');
    const [initialBalance, setInitialBalance] = useState('');
    const [confirmation, setConfirmation] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const handleOpenModal = (journal: Journal | null = null) => {
        setEditingJournal(journal);
        setJournalName(journal ? journal.name : '');
        setInitialBalance(journal ? journal.balance.toString() : '');
        setIsModalOpen(true);
    };

    const handleSaveJournal = async () => {
        if (!journalName) { showAlert("Journal name cannot be empty."); return; }
        const balance = parseFloat(initialBalance) || 0;

        if (editingJournal) {
            if (!db || !appId) return;
            const journalRef = doc(db, 'artifacts', appId, 'users', user.uid, 'journals', editingJournal.id);
            await updateDoc(journalRef, { name: journalName });
        } else {
            if (!db || !appId) { showAlert("App ID is not defined."); return; }
            await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'journals'), {
                name: journalName,
                createdAt: serverTimestamp(),
                balance: balance,
                dailyProfitTarget: 0,
                weeklyProfitGoal: 0,
                riskPercentage: 0,
            });
        }
        setIsModalOpen(false);
    };

    const deleteSubcollections = async (journalRef: import("firebase/firestore").DocumentReference) => {
        const subcollections = ['trades', 'transactions', 'goalHistory', 'plan'];
        const batch = writeBatch(db);
        for (const sc of subcollections) {
            const scRef = collection(journalRef, sc);
            const scSnap = await getDocs(scRef);
            scSnap.docs.forEach(doc => batch.delete(doc.ref));
        }
        await batch.commit();
    };

    const confirmResetJournal = (journalToReset: Journal) => {
        setConfirmation({
            isOpen: true,
            title: 'Reset Journal?',
            message: `Are you sure you want to reset "${journalToReset.name}"? All trades, transactions, and history will be deleted, and the balance will be reset to $0. This action cannot be undone.`,
            onConfirm: () => handleResetJournal(journalToReset),
        });
    };

    const handleResetJournal = async (journalToReset: Journal) => {
        if (!db || !appId) return;
        const journalRef = doc(db, 'artifacts', appId, 'users', user.uid, 'journals', journalToReset.id);
        await deleteSubcollections(journalRef);
        await updateDoc(journalRef, {
            balance: 0,
            dailyProfitTarget: 0,
            weeklyProfitGoal: 0,
            riskPercentage: 0,
        });
        showAlert("Journal has been reset.");
    };

    const confirmDeleteJournal = (journalIdToDelete: string, journalName: string) => {
        if (journals.length <= 1) {
            showAlert("You cannot delete your only journal.");
            return;
        }
        setConfirmation({
            isOpen: true,
            title: 'Delete Journal?',
            message: `Are you sure you want to permanently delete "${journalName}" and all its data? This action cannot be undone.`,
            onConfirm: () => handleDeleteJournal(journalIdToDelete),
        });
    }

    const handleDeleteJournal = async (journalIdToDelete: string) => {
        if (!db || !appId) return;
        const journalRef = doc(db, 'artifacts', appId, 'users', user.uid, 'journals', journalIdToDelete);
        await deleteSubcollections(journalRef);
        await deleteDoc(journalRef);
        showAlert("Journal deleted successfully.");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className={`text-4xl font-bold ${theme === "dark" || isSystemDark ? "dark:text-gray-100" : "text-gray-800"}`}>Journal Manager</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                >
                    <PlusCircle className="mr-2 h-5 w-5" /> Add Journal
                </button>
            </div>
            <div className={`p-6 rounded-xl shadow-lg border space-y-4 ${theme === "dark" || isSystemDark ? "dark:bg-gray-800 dark:border-gray-700" : "bg-white border-gray-200"}`}>
                {journals.map(journal => (
                    <div key={journal.id} className={`flex items-center justify-between p-4 rounded-lg ${activeJournalId === journal.id ? 'bg-blue-100 dark:bg-blue-500/20 border-blue-500 border-2' : `${theme === "dark" || isSystemDark ? "dark:bg-gray-700/50 dark:hover:bg-gray-700" : "bg-gray-50 hover:bg-gray-100"}`}`}>
                        <button onClick={() => setActiveJournalId(journal.id)} className="flex-1 text-left">
                            <h3 className={`font-semibold text-lg ${theme === "dark" || isSystemDark ? "dark:text-gray-100" : "text-gray-800"}`}>{journal.name}</h3>
                            <p className={`text-sm ${theme === "dark" || isSystemDark ? "dark:text-gray-400" : "text-gray-600"}`}>Balance: ${journal.balance?.toFixed(2)}</p>
                        </button>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => confirmResetJournal(journal)}
                                className={`p-2 rounded-full ${theme === "dark" || isSystemDark ? "dark:text-gray-400" : "text-gray-500"} hover:text-yellow-500`}
                                title="Reset Journal"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => handleOpenModal(journal)}
                                className={`p-2 rounded-full ${theme === "dark" || isSystemDark ? "dark:text-gray-400" : "text-gray-500"} hover:text-blue-600`}
                                title="Edit Journal"
                            >
                                <Edit className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => confirmDeleteJournal(journal.id, journal.name)}
                                className={`p-2 rounded-full ${theme === "dark" || isSystemDark ? "dark:text-gray-400" : "text-gray-500"} hover:text-red-600`}
                                title="Delete Journal"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingJournal ? "Edit Journal" : "Create New Journal"}>
                <div className="space-y-4">
                    <label className="block">
                        <span className={`${theme === "dark" || isSystemDark ? "dark:text-gray-300" : "text-gray-600"}`}>Journal Name</span>
                        <input
                            type="text"
                            value={journalName}
                            onChange={(e) => setJournalName(e.target.value)}
                            className={`w-full p-3 rounded-lg mt-1 ${theme === "dark" || isSystemDark ? "dark:bg-gray-700" : "bg-gray-100"}`}
                        />
                    </label>
                    {!editingJournal && (
                        <label className="block">
                            <span className={`${theme === "dark" || isSystemDark ? "dark:text-gray-300" : "text-gray-600"}`}>Initial Balance ($)</span>
                            <input
                                type="number"
                                value={initialBalance}
                                onChange={(e) => setInitialBalance(e.target.value)}
                                className={`w-full p-3 rounded-lg mt-1 ${theme === "dark" || isSystemDark ? "dark:bg-gray-700" : "bg-gray-100"}`}
                            />
                        </label>
                    )}
                    <button
                        onClick={handleSaveJournal}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg"
                    >
                        {editingJournal ? 'Save Changes' : 'Create Journal'}
                    </button>
                </div>
            </Modal>
            <ConfirmationModal
                isOpen={confirmation.isOpen}
                onClose={() => setConfirmation({ ...confirmation, isOpen: false })}
                title={confirmation.title}
                message={confirmation.message}
                onConfirm={confirmation.onConfirm}
            />
        </div>
    );
};