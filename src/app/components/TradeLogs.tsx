'use client';

import { doc, collection, writeBatch, Firestore } from 'firebase/firestore';
import { PlusCircle, Edit, Download, Sparkles } from 'lucide-react';
import { useState } from "react";
import { downloadCSV } from "../utils/downloadCSV";
import { Modal } from "./Modal";
import { appId } from '../lib/firebaseConfig';
import { User } from 'firebase/auth';
import { TradeForm } from './TradeForm';
import { chat } from '../lib/grokConfig';
import { HumanMessage } from '@langchain/core/messages';

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

interface TradeLogsProps {
    user: User,
    activeJournalData: Journal,
    db: Firestore,
    activeJournalId: string | null,
    showAlert: (message: string) => void;
    theme?: string,
    isSystemDark: boolean,
    trades: Trade[],
}

interface Trade {
    id: string;
    asset?: string;
    direction?: string;
    date?: import("firebase/firestore").Timestamp | Date | string;
    time?: import("firebase/firestore").Timestamp | Date | string;
    totalTrades?: number;
    losingTrades?: number;
    investmentPerTrade?: number;
    roi?: number;
    sessionProfit?: number;
    winningTrades?: number;
    sessionOutcome?: string;
    notes?: string;
    [key: string]: unknown;
}

export const TradeLogs = ({ user, db, activeJournalId, activeJournalData, showAlert, theme, isSystemDark, trades }: TradeLogsProps) => {
    // const [trades, setTrades] = useState<Trade[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
    const [isManualProfit, setIsManualProfit] = useState(false);
    const [newTrade, setNewTrade] = useState({
        id: '',
        asset: '', direction: 'Buy', date: '', time: '',
        totalTrades: undefined, losingTrades: undefined, investmentPerTrade: undefined, roi: undefined, sessionProfit: undefined
    });
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (editingTrade) {
            setEditingTrade(prev => prev ? { ...prev, [name]: value } : prev);
        } else {
            setNewTrade(prev => ({ ...prev, [name]: value }));
        }
    };

    const processAndSaveTrade = async (tradeData: Trade) => {
        const { id, ...data } = tradeData;
        let sessionProfit;
        let finalTradeData = {
            ...data,
            date: new Date(`${data.date}T${data.time}`),
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

        const batch = writeBatch(db);
        if (!appId || !activeJournalId) return;
        const journalRef = doc(db, 'artifacts', appId, 'users', user.uid, 'journals', activeJournalId);

        if (id) {
            const oldTrade = trades.find(t => t.id === id);
            const previousSessionProfit = oldTrade && typeof oldTrade.sessionProfit === 'number' ? oldTrade.sessionProfit : 0;
            const profitDifference = sessionProfit - previousSessionProfit;
            const tradeRef = doc(journalRef, 'trades', id);
            batch.update(tradeRef, finalTradeData);
            batch.update(journalRef, { balance: activeJournalData.balance + profitDifference });
        } else {
            const newTradeRef = doc(collection(journalRef, 'trades'));
            batch.set(newTradeRef, finalTradeData);
            batch.update(journalRef, { balance: activeJournalData.balance + sessionProfit });
        }
        await batch.commit();
        setIsModalOpen(false);
        setEditingTrade(null);
    };

    const handleOpenEditModal = (trade: Trade) => {
        const tradeDate = trade.date
            ? (trade.date instanceof Date
                ? trade.date
                : (typeof trade.date === 'object' && trade.date !== null && 'toDate' in trade.date && typeof (trade.date as import("firebase/firestore").Timestamp).toDate === 'function'
                    ? (trade.date as import("firebase/firestore").Timestamp).toDate()
                    : new Date(typeof trade.date === 'string' ? trade.date : '')))
            : new Date();
        setIsManualProfit(trade.sessionProfit !== undefined && trade.totalTrades === undefined);
        setEditingTrade({ ...trade, date: tradeDate.toLocaleDateString('en-CA'), time: tradeDate.toTimeString().slice(0, 5) });
        setIsModalOpen(true);
    };
    const handleOpenNewModal = () => {
        const now = new Date();
        setNewTrade({ id: '', asset: '', direction: 'Buy', date: now.toLocaleDateString('en-CA'), time: now.toTimeString().slice(0, 5), totalTrades: undefined, losingTrades: undefined, investmentPerTrade: undefined, roi: undefined, sessionProfit: undefined });
        setEditingTrade(null);
        setIsManualProfit(false);
        setIsModalOpen(true);
    }

    const constructPrompt = (trade: Trade): string => {
        return `Analyze this binary options trade session and provide insights. The session outcome was a ${trade.sessionOutcome} with a profit/loss of $${(trade.sessionProfit ?? 0).toFixed(2)}. The asset was ${trade.asset}. The direction was ${trade.direction}. Number of trades: ${trade.totalTrades || 'N/A'}, Losing trades: ${trade.losingTrades || 'N/A'}. My notes: "${trade.notes || 'None'}". What could I have done better, what did I do well, and what should I look out for next time? Provide the response in clear, concise sections with bullet points.`;
    };

    const getAiAnalysis = async (trade: Trade) => {
        setIsAiLoading(true);
        setIsAiModalOpen(true);
        setAiAnalysis('');

        const prompt = constructPrompt(trade);

        try {
            const response = await chat.invoke([new HumanMessage(prompt)]);
            if (!response) {
                console.log("No trade found to analyse");
                return;
            }
            const text = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
            setAiAnalysis(text);
        } catch (error) {
            console.error("Error fetching AI analysis:", error);
            setAiAnalysis(`Failed to fetch AI analysis. ${error instanceof Error ? error.message : 'Please check the console for errors.'}`);
        } finally {
            setIsAiLoading(false);
        }
    };
    

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className={`text-4xl font-bold ${theme === "dark" || isSystemDark ? "text-gray-100" : "text-gray-800"}`}>
                    Trade Logs
                </h1>
                <div className="flex space-x-2">
                    <button
                        onClick={handleOpenNewModal}
                        className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                    >
                        <PlusCircle className="mr-2 h-5 w-5" />
                        <span className="hidden sm:inline">Add Session</span>
                    </button>
                    <button
                        onClick={() =>
                            downloadCSV(
                                trades.map(t => ({
                                    ...t,
                                    date:
                                        t.date && typeof t.date === 'object' && 'toDate' in t.date && typeof (t.date as import("firebase/firestore").Timestamp).toDate === 'function'
                                            ? (t.date as import("firebase/firestore").Timestamp).toDate()
                                            : t.date
                                })),
                                'trade-history.csv'
                            )
                        }
                        className="flex items-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                    >
                        <Download className="mr-2 h-5 w-5" />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                </div>
            </div>
            <div className={`p-4 rounded-xl shadow-lg border overflow-x-auto ${theme === "dark" || isSystemDark ? "dark:bg-gray-800 dark:border-gray-700" : "border-gray-200 bg-white"}`}>
                <table className="w-full text-left min-w-[1000px]">
                    <thead className={`text-xs uppercase ${theme === "dark" || isSystemDark ? "text-gray-400 dark:bg-gray-700" : "text-gray-500 bg-gray-50"}`}>
                        <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Asset</th>
                            <th className="p-3">Direction</th>
                            <th className="p-3">Trades (W/L)</th>
                            <th className="p-3">Session P/L</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === "dark" || isSystemDark ? "dark:divide-gray-600" : "divide-gray-200"}`}>
                        {trades.map(trade => (
                            <tr key={trade.id} className={`hover:bg-gray-50 ${theme === "dark" || isSystemDark ? "dark:hover:bg-gray-700" : ""}`}>
                                <td className="p-3">
                                    {trade.date
                                        ? (
                                            typeof trade.date === 'object' && trade.date !== null && 'seconds' in trade.date
                                                ? new Date((trade.date as { seconds: number }).seconds * 1000).toLocaleString()
                                                : typeof trade.date === 'string'
                                                    ? new Date(trade.date).toLocaleString()
                                                    : trade.date instanceof Date
                                                        ? trade.date.toLocaleString()
                                                        : 'N/A'
                                        )
                                        : 'N/A'}
                                </td>
                                <td className="p-3 font-medium">{trade.asset}</td>
                                <td className={`p-3 font-semibold ${trade.direction === 'Buy' ? 'text-green-500' : 'text-red-500'}`}>{trade.direction}</td>
                                <td className="p-3">{trade.totalTrades !== undefined ? `${trade.totalTrades} (${trade.winningTrades}/${trade.losingTrades})` : 'N/A'}</td>
                                <td className={`p-3 font-semibold ${(trade.sessionProfit ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>${(trade.sessionProfit ?? 0).toFixed(2)}</td>
                                <td className="p-3 flex items-center space-x-2">
                                    <button onClick={() => handleOpenEditModal(trade)} className={`p-2 rounded-full ${theme === "dark" || isSystemDark ? "text-gray-400 hover:text-blue-600" : "text-gray-500 hover:text-blue-600"}`}>
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => getAiAnalysis(trade)} className={`p-2 rounded-full ${theme === "dark" || isSystemDark ? "text-gray-400 hover:text-purple-500" : "text-gray-500 hover:text-purple-500"}`} title="Get AI Analysis">
                                        <Sparkles className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {trades.length === 0 && <p className={`text-center p-4 ${theme === "dark" || isSystemDark ? "text-gray-400" : "text-gray-500"}`}>No trading sessions logged yet.</p>}
            </div>
            <Modal theme={theme} isSystemDark={isSystemDark} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTrade ? "Edit Trading Session" : "Log New Trading Session"}>
                <TradeForm
                    tradeData={
                        editingTrade
                            ? { ...editingTrade, time: editingTrade.time ?? '' }
                            : newTrade
                    } 
                    onInputChange={handleInputChange}
                    onSubmit={(e: React.FormEvent) => {
                        e.preventDefault();
                        processAndSaveTrade(
                            editingTrade ||
                            {
                                ...newTrade,
                                id: '',
                                totalTrades: typeof newTrade.totalTrades === 'string' ? (newTrade.totalTrades === '' ? undefined : Number(newTrade.totalTrades)) : newTrade.totalTrades,
                                losingTrades: typeof newTrade.losingTrades === 'string' ? (newTrade.losingTrades === '' ? undefined : Number(newTrade.losingTrades)) : newTrade.losingTrades,
                                investmentPerTrade: typeof newTrade.investmentPerTrade === 'string' ? (newTrade.investmentPerTrade === '' ? undefined : Number(newTrade.investmentPerTrade)) : newTrade.investmentPerTrade,
                                roi: typeof newTrade.roi === 'string' ? (newTrade.roi === '' ? undefined : Number(newTrade.roi)) : newTrade.roi,
                                sessionProfit: typeof newTrade.sessionProfit === 'string' ? (newTrade.sessionProfit === '' ? undefined : Number(newTrade.sessionProfit)) : newTrade.sessionProfit,
                            }
                        );
                    }}
                    isManualProfit={isManualProfit}
                    setIsManualProfit={setIsManualProfit}
                    theme={theme}
                    isSystemDark={isSystemDark}
                />
            </Modal>
            <Modal theme={theme} isSystemDark={isSystemDark} isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} title="AI Trade Analysis">
                {isAiLoading ? (
                    <div className="flex flex-col items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
                        <p className={`mt-4 ${theme === "dark" || isSystemDark ? "text-gray-400" : "text-gray-500"}`}>Analyzing your trade...</p>
                    </div>
                ) : (
                        <div className={`prose-sm max-h-96 overflow-y-auto  ${theme === "dark" || isSystemDark ? "dark:prose-invert" : "prose"}`} dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br />') }}></div>
                )}
            </Modal>
        </div>
    );
};