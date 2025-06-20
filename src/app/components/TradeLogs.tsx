'use client';

import { Firestore, Timestamp } from 'firebase/firestore';
import { PlusCircle, Edit, Download, Sparkles } from 'lucide-react';
import { useState } from "react";
import { downloadCSV } from "../utils/downloadCSV";
import { Modal } from "./PopupModal/Modal";
import { User } from 'firebase/auth';
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
    trades: Trade[],
    onLogSessionClick: () => void,
    handleOpenEditTradeModal: (trade: Trade) => void
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

export const TradeLogs = ({ trades, onLogSessionClick, handleOpenEditTradeModal }: TradeLogsProps) => {
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);

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
            <div className="flex justify-between items-center"><h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">Trade Logs</h1><div className="flex space-x-2"><button onClick={onLogSessionClick} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"><PlusCircle className="mr-2 h-5 w-5" /> <span className="hidden sm:inline">Add Session</span></button><button onClick={() => downloadCSV(trades.map(t => ({
                ...t,
                date: t.date
                    ? (typeof t.date === 'string'
                        ? t.date
                        : t.date instanceof Date
                            ? t.date
                            : new Date((t.date as Timestamp).seconds * 1000))
                    : undefined
            })), 'trade-history.csv')} className="flex items-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"><Download className="mr-2 h-5 w-5" /> <span className="hidden sm:inline">Export</span></button></div></div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-left min-w-[1000px]"><thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700"><tr><th className="p-3">Date</th><th className="p-3">Asset</th><th className="p-3">Direction</th><th className="p-3">Trades (W/L)</th><th className="p-3">Session P/L</th><th className="p-3">Actions</th></tr></thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {trades.map(trade => (<tr key={trade.id} className="hover:bg-gray-50 dark:hover:bg-gray-700"><td className="p-3">{trade.date ? (typeof trade.date === 'string' ? new Date(trade.date).toLocaleString() : trade.date instanceof Date ? trade.date.toLocaleString() : new Date((trade.date as Timestamp).seconds * 1000).toLocaleString()) : 'N/A'}</td><td className="p-3 font-medium">{trade.asset}</td><td className={`p-3 font-semibold ${trade.direction === 'Buy' ? 'text-green-500' : 'text-red-500'}`}>{trade.direction}</td><td className="p-3">{trade.totalTrades !== undefined ? `${trade.winningTrades}/${trade.losingTrades}` : 'N/A'}</td><td className={`p-3 font-semibold ${trade.sessionProfit !== undefined && trade.sessionProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>${trade.sessionProfit?.toFixed(2) ?? 'N/A'}</td>
                            <td className="p-3 flex items-center space-x-2">
                                <button onClick={() => handleOpenEditTradeModal(trade)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 rounded-full"><Edit className="w-4 h-4" /></button>
                                <button onClick={() => getAiAnalysis(trade)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-purple-500 rounded-full" title="Get AI Analysis"><Sparkles className="w-4 h-4" /></button>
                            </td>
                        </tr>))}
                    </tbody>
                </table>
                {trades.length === 0 && <p className="text-center p-4 text-gray-500 dark:text-gray-400">No trading sessions logged yet.</p>}
            </div>
            <Modal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} title="AI Trade Analysis">
                {isAiLoading ? (<div className="flex flex-col items-center justify-center h-48"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div><p className="mt-4 text-gray-500 dark:text-gray-400">Analyzing your trade...</p></div>) : (<div className="prose prose-sm dark:prose-invert max-h-96 overflow-y-auto" dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br />') }}></div>)}
            </Modal>
        </div>
    );
};