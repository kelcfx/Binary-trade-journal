'use client';

import { addDoc, collection, deleteDoc, doc, DocumentReference, Firestore, getDocs, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { Dispatch, SetStateAction, useState } from "react";
import { appId } from "../lib/firebaseConfig";
import { Edit, PlusCircle, RefreshCw, Trash2 } from "lucide-react";
import { Modal } from "./PopupModal/Modal";
import { User } from "firebase/auth";
import { ConfirmationModal } from "./PopupModal/AlertModals";

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
}

export const AccountManager = ({ journals, activeJournalId, setActiveJournalId, user, showAlert, db }: AccpountManagerProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingJournal, setEditingJournal] = useState<Journal | null>(null);
    const [journalName, setJournalName] = useState('');
    const [initialBalance, setInitialBalance] = useState('');
    const [confirmation, setConfirmation] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });
    const [switchConfirmation, setSwitchConfirmation] = useState<{ isOpen: boolean; journalId: string | null; journalName: string }>({ isOpen: false, journalId: null, journalName: '' });

    const handleSwitchClick = (journal: Journal) => { if (journal.id === activeJournalId) return; setSwitchConfirmation({ isOpen: true, journalId: journal.id, journalName: journal.name }); };
    const handleConfirmSwitch = () => { if (switchConfirmation.journalId) { setActiveJournalId(switchConfirmation.journalId); } setSwitchConfirmation({ isOpen: false, journalId: null, journalName: '' }); };
    const handleOpenModal = (journal: Journal | null = null) => { setEditingJournal(journal); setJournalName(journal ? journal.name : ''); setInitialBalance(journal ? journal.balance.toString() : ''); setIsModalOpen(true); };

    const handleSaveJournal = async () => {
        if (!journalName.trim()) { showAlert("Journal name cannot be empty."); return; }
        if (!appId) { showAlert("App configuration error. Please try again."); return; }

        const isDuplicate = journals.some(j => j.name.toLowerCase() === journalName.trim().toLowerCase() && j.id !== editingJournal?.id);
        if (isDuplicate) { showAlert("A journal with this name already exists. Please choose a different name."); return; }

        const balance = parseFloat(initialBalance) || 0;

        if (editingJournal) {
            await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'journals', editingJournal.id), { name: journalName.trim() });
        } else {
            await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'journals'), { name: journalName.trim(), createdAt: serverTimestamp(), balance, dailyProfitTarget: 0, weeklyProfitGoal: 0, riskPercentage: 2 });
        }
        setIsModalOpen(false);
    };

    const deleteSubcollections = async (journalRef: DocumentReference) => {
        const subcollections = ['trades', 'transactions', 'goalHistory', 'goals', 'plan', 'achievements'];
        for (const sc of subcollections) {
            const scSnap = await getDocs(collection(journalRef, sc)); const batch = writeBatch(db); scSnap.docs.forEach(doc => batch.delete(doc.ref)); await batch.commit();
        }
    };

    const confirmResetJournal = (journalToReset: Journal) => setConfirmation({ isOpen: true, title: 'Reset Journal?', message: `Are you sure you want to reset "${journalToReset.name}"? All trades, transactions, and history will be deleted, and the balance will be reset to $0. This action cannot be undone.`, onConfirm: () => handleResetJournal(journalToReset) });
    const handleResetJournal = async (journalToReset: Journal) => {
        if (!appId) return;
        const journalRef = doc(db, 'artifacts', appId, 'users', user.uid, 'journals', journalToReset.id);
        await deleteSubcollections(journalRef); await updateDoc(journalRef, { balance: 0, dailyProfitTarget: 0, weeklyProfitGoal: 0, riskPercentage: 2, });
        showAlert("Journal has been reset.");
    };

    const confirmDeleteJournal = (journalIdToDelete: string, journalName: string) => {
        if (journals.length <= 1) { showAlert("You cannot delete your only journal."); return; }
        setConfirmation({ isOpen: true, title: 'Delete Journal?', message: `Are you sure you want to permanently delete "${journalName}" and all its data? This action cannot be undone.`, onConfirm: () => handleDeleteJournal(journalIdToDelete) });
    }
    const handleDeleteJournal = async (journalIdToDelete: string) => {
        if (!appId) return;
        const journalRef = doc(db, 'artifacts', appId, 'users', user.uid, 'journals', journalIdToDelete);
        await deleteSubcollections(journalRef); await deleteDoc(journalRef);
        showAlert("Journal deleted successfully.");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center"><h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">Journal Manager</h1><button onClick={() => handleOpenModal()} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"><PlusCircle className="mr-2 h-5 w-5" /> <span className="hidden sm:inline">Add Journal</span></button></div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 space-y-4">
                {journals.map(journal => (
                    <div key={journal.id} className={`flex items-center justify-between p-4 rounded-lg ${activeJournalId === journal.id ? 'bg-blue-100 dark:bg-blue-500/20 border-blue-500 border-2' : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        <button onClick={() => handleSwitchClick(journal)} className="flex-1 text-left">
                            <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-lg">{journal.name}</h3>
                                {activeJournalId === journal.id && <span className="text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 px-2 py-0.5 rounded-full">Active</span>}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Balance: ${journal.balance?.toFixed(2)}</p>
                        </button>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => confirmResetJournal(journal)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-yellow-500 rounded-full" title="Reset Journal"><RefreshCw className="w-5 h-5" /></button>
                            <button onClick={() => handleOpenModal(journal)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 rounded-full" title="Edit Journal"><Edit className="w-5 h-5" /></button>
                            <button onClick={() => confirmDeleteJournal(journal.id, journal.name)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 rounded-full" title="Delete Journal"><Trash2 className="w-5 h-5" /></button>
                        </div>
                    </div>
                ))}
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingJournal ? "Edit Journal" : "Create New Journal"}>
                <div className="space-y-4">
                    <label className="block"><span className="text-gray-600 dark:text-gray-300">Journal Name</span><input type="text" value={journalName} onChange={(e) => setJournalName(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mt-1" /></label>
                    {!editingJournal && (<label className="block"><span className="text-gray-600 dark:text-gray-300">Initial Balance ($)</span><input type="number" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mt-1" /></label>)}
                    <button onClick={handleSaveJournal} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg">{editingJournal ? 'Save Changes' : 'Create Journal'}</button>
                </div>
            </Modal>
            <ConfirmationModal isOpen={confirmation.isOpen} onClose={() => setConfirmation({ ...confirmation, isOpen: false })} title={confirmation.title} message={confirmation.message} onConfirm={confirmation.onConfirm} />
            <ConfirmationModal isOpen={switchConfirmation.isOpen} onClose={() => setSwitchConfirmation({ isOpen: false, journalId: null, journalName: '' })} title="Switch Journal?" message={`Are you sure you want to switch to the "${switchConfirmation.journalName}" journal?`} onConfirm={handleConfirmSwitch} />
        </div>
    );
};