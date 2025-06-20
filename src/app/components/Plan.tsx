'use client';
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { useEffect, useMemo, useState, ChangeEvent } from "react";
import { appId } from "../lib/firebaseConfig";
import { Download, RefreshCw } from "lucide-react";
import { downloadCSV } from "../utils/downloadCSV";
import { User } from "firebase/auth";
import { Firestore } from "firebase/firestore";


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

interface PlanProps {
    user: User,
    activeJournalData: Journal,
    db: Firestore,
    activeJournalId: string | null,
    showAlert: (message: string) => void,
}


export const Plan = ({ user, activeJournalId, showAlert, db }: PlanProps) => {
    const initialPlanState = useMemo(() => ({ startBalance: '', endBalance: '', days: '', drawdownPercentage: '' }), []);
    const [plan, setPlan] = useState(initialPlanState);

    const planDocRef = useMemo(() => {
        if (!appId || !activeJournalId) return null;
        return doc(db, 'artifacts', appId, 'users', user.uid, 'journals', activeJournalId, 'plan', 'mainPlan');
    }, [user.uid, activeJournalId, db]);

    useEffect(() => {
        if (!planDocRef) return;
        const fetchPlan = async () => { const docSnap = await getDoc(planDocRef); if (docSnap.exists()) { setPlan(docSnap.data() as typeof initialPlanState); } else { setPlan(initialPlanState); } };
        fetchPlan();
    }, [planDocRef, initialPlanState]);

    const handlePlanChange = (e: ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setPlan(prev => ({ ...prev, [name]: value === '' ? '' : parseFloat(value) || 0 })); };
    const handleSavePlan = async () => { if (!planDocRef) return; await setDoc(planDocRef, plan); showAlert("Your growth plan has been saved!"); };
    const handleResetPlan = async () => { if (!planDocRef) return; await deleteDoc(planDocRef); setPlan(initialPlanState); showAlert("Your growth plan has been reset."); };

    const planData = useMemo(() => {
        const { startBalance, endBalance, days, drawdownPercentage } = plan;
        if (!startBalance || !endBalance || !days || !drawdownPercentage || Number(startBalance) <= 0 || Number(endBalance) <= Number(startBalance) || Number(days) <= 0) return [];
        const dailyGrowthRate = Math.pow(Number(endBalance) / Number(startBalance), 1 / Number(days)) - 1;
        let currentBalance = parseFloat(startBalance);
        const tableData = [];
        for (let i = 1; i <= Number(days); i++) {
            const profitTarget = parseFloat((currentBalance * dailyGrowthRate).toFixed(2));
            const endOfDayBalance = parseFloat((currentBalance + profitTarget).toFixed(2));
            const drawdownAmount = parseFloat((currentBalance * (Number(drawdownPercentage) / 100)).toFixed(2));
            tableData.push({ day: i, date: new Date(new Date().setDate(new Date().getDate() + i)).toLocaleDateString(), start: currentBalance, profit: profitTarget, drawdown: drawdownAmount, end: endOfDayBalance });
            currentBalance = endOfDayBalance;
        }
        return tableData;
    }, [plan]);


    if (!appId) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">Money Growth Plan</h1>
                <div className="bg-red-100 dark:bg-red-900 p-4 rounded-lg">
                    <p className="text-red-700 dark:text-red-300">Error: Application ID not configured. Please check your Firebase configuration.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">Money Growth Plan</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 space-y-4">
                    <h2 className="text-2xl font-semibold">Define Your Plan</h2>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Starting Balance ($)</label><input type="number" name="startBalance" value={plan.startBalance} onChange={handlePlanChange} className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mt-1" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Goal Balance ($)</label><input type="number" name="endBalance" value={plan.endBalance} onChange={handlePlanChange} className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mt-1" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Number of Days</label><input type="number" name="days" value={plan.days} onChange={handlePlanChange} className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mt-1" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Max Drawdown (%)</label><input type="number" name="drawdownPercentage" value={plan.drawdownPercentage} onChange={handlePlanChange} className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mt-1" /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button onClick={handleSavePlan} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">Save Plan</button>
                        <button onClick={handleResetPlan} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center justify-center"><RefreshCw className="mr-2 h-5 w-5" /> Reset</button>
                        <button onClick={() => downloadCSV(planData, 'growth-plan.csv')} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center justify-center"><Download className="mr-2 h-5 w-5" /> Export</button>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-semibold mb-4">Your Daily Roadmap</h2>
                    <div className="overflow-x-auto max-h-[400px]"><table className="w-full text-left"><thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700 sticky top-0"><tr><th className="p-3">Day</th><th className="p-3">Start Balance</th><th className="p-3">Profit Target</th><th className="p-3">Max Drawdown</th><th className="p-3">End Balance</th></tr></thead><tbody className="divide-y divide-gray-200 dark:divide-gray-600">{planData.map(day => (<tr key={day.day} className="hover:bg-gray-50 dark:hover:bg-gray-700"><td className="p-3 font-semibold">{day.day}</td><td className="p-3">${day.start.toFixed(2)}</td><td className="p-3 text-green-500 font-semibold">+${day.profit.toFixed(2)}</td><td className="p-3 text-red-500 font-semibold">-${day.drawdown.toFixed(2)}</td><td className="p-3 font-bold">${day.end.toFixed(2)}</td></tr>))}</tbody></table>{planData.length === 0 && <p className="text-center p-4 text-gray-500 dark:text-gray-400">Enter valid plan details to generate your roadmap.</p>}</div>
                </div>
            </div>
        </div>
    );
};