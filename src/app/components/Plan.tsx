'use client';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { appId, db } from "../lib/firebaseConfig";
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
    theme?: string,
    isSystemDark: boolean
}


export const Plan = ({ user, activeJournalId, showAlert, theme, isSystemDark }: PlanProps) => {
    const initialPlanState = useMemo(() => ({
        startBalance: '',
        endBalance: '',
        days: '',
        drawdownPercentage: ''
    }), []);
    const [plan, setPlan] = useState(initialPlanState);

    const planDocRef = useMemo(() => {
        if (!appId || !activeJournalId) return null;
        return doc(
            db,
            'artifacts',
            appId,
            'users',
            user.uid,
            'journals',
            activeJournalId,
            'plan',
            'mainPlan'
        );
    }, [user.uid, activeJournalId]);

    useEffect(() => {
        const fetchPlan = async () => {
            if (!planDocRef) return;
            const docSnap = await getDoc(planDocRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setPlan({
                    startBalance: typeof data.startBalance === "string" ? data.startBalance : data.startBalance !== undefined ? String(data.startBalance) : "",
                    endBalance: typeof data.endBalance === "string" ? data.endBalance : data.endBalance !== undefined ? String(data.endBalance) : "",
                    days: typeof data.days === "string" ? data.days : data.days !== undefined ? String(data.days) : "",
                    drawdownPercentage: typeof data.drawdownPercentage === "string" ? data.drawdownPercentage : data.drawdownPercentage !== undefined ? String(data.drawdownPercentage) : "",
                });
            } else {
                setPlan(initialPlanState);
            }
        };
        fetchPlan();
    }, [planDocRef, initialPlanState]);

    const handlePlanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPlan(prev => ({ ...prev, [name]: value === '' ? '' : parseFloat(value) || 0 }));
    };

    const handleSavePlan = async () => {
        if (!planDocRef) return;
        await setDoc(planDocRef, plan);
        showAlert("Your growth plan has been saved!");
    };

    const handleResetPlan = () => {
        setPlan(initialPlanState);
    };

    const planData = useMemo(() => {
        const { startBalance, endBalance, days, drawdownPercentage } = plan;
        const start = parseFloat(startBalance);
        const end = parseFloat(endBalance);
        const numDays = parseFloat(days);
        const drawdown = parseFloat(drawdownPercentage);

        if (
            isNaN(start) || isNaN(end) || isNaN(numDays) || isNaN(drawdown) ||
            start <= 0 || end <= start || numDays <= 0
        ) return [];

        const dailyGrowthRate = Math.pow(end / start, 1 / numDays) - 1;
        let currentBalance = start;
        const tableData = [];

        for (let i = 1; i <= numDays; i++) {
            const profitTarget = parseFloat((currentBalance * dailyGrowthRate).toFixed(2));
            const endOfDayBalance = parseFloat((currentBalance + profitTarget).toFixed(2));
            const drawdownAmount = parseFloat((currentBalance * (drawdown / 100)).toFixed(2));
            tableData.push({
                day: i,
                date: new Date(new Date().setDate(new Date().getDate() + i)).toLocaleDateString(),
                start: currentBalance,
                profit: profitTarget,
                drawdown: drawdownAmount,
                end: endOfDayBalance
            });
            currentBalance = endOfDayBalance;
        }
        return tableData;
    }, [plan]);

    if (!appId || !activeJournalId || !user.uid) return null;

    return (
        <div className="space-y-6">
            <h1 className={`text-4xl font-bold ${theme === "dark" || isSystemDark ? "dark:text-gray-100" : "text-gray-800"}`}>Money Growth Plan</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className={`p-6 rounded-xl shadow-lg border space-y-4 ${theme === "dark" || isSystemDark ? "dark:bg-gray-800 dark:border-gray-700" : "bg-white border-gray-200"}`}>
                    <h2 className={`text-2xl font-semibold ${theme === "dark" || isSystemDark ? "dark:text-gray-100" : "text-gray-800"}`}>Define Your Plan</h2>
                    <div>
                        <label className={`block text-sm font-medium ${theme === "dark" || isSystemDark ? "dark:text-gray-300" : "text-gray-700"}`}>Starting Balance ($)</label>
                        <input
                            type="number"
                            name="startBalance"
                            value={plan.startBalance}
                            onChange={handlePlanChange}
                            className={`w-full p-3 rounded-lg mt-1 ${theme === "dark" || isSystemDark ? "dark:bg-gray-700" : "bg-gray-100"}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium ${theme === "dark" || isSystemDark ? "dark:text-gray-300" : "text-gray-700"}`}>Goal Balance ($)</label>
                        <input
                            type="number"
                            name="endBalance"
                            value={plan.endBalance}
                            onChange={handlePlanChange}
                            className={`w-full p-3 rounded-lg mt-1 ${theme === "dark" || isSystemDark ? "dark:bg-gray-700" : "bg-gray-100"}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium ${theme === "dark" || isSystemDark ? "dark:text-gray-300" : "text-gray-700"}`}>Number of Days</label>
                        <input
                            type="number"
                            name="days"
                            value={plan.days}
                            onChange={handlePlanChange}
                            className={`w-full p-3 rounded-lg mt-1 ${theme === "dark" || isSystemDark ? "dark:bg-gray-700" : "bg-gray-100"}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium ${theme === "dark" || isSystemDark ? "dark:text-gray-300" : "text-gray-700"}`}>Max Drawdown (%)</label>
                        <input
                            type="number"
                            name="drawdownPercentage"
                            value={plan.drawdownPercentage}
                            onChange={handlePlanChange}
                            className={`w-full p-3 rounded-lg mt-1 ${theme === "dark" || isSystemDark ? "dark:bg-gray-700" : "bg-gray-100"}`}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button
                            onClick={handleSavePlan}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                        >
                            Save Plan
                        </button>
                        <button
                            onClick={handleResetPlan}
                            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center justify-center"
                        >
                            <RefreshCw className="mr-2 h-5 w-5" /> Reset
                        </button>
                        <button
                            onClick={() => downloadCSV(planData, 'growth-plan.csv')}
                            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center justify-center"
                        >
                            <Download className="mr-2 h-5 w-5" /> Export
                        </button>
                    </div>
                </div>
                <div className={`p-6 rounded-xl shadow-lg border ${theme === "dark" || isSystemDark ? "dark:bg-gray-800 dark:border-gray-700" : "bg-white border-gray-200"}`}>
                    <h2 className={`text-2xl font-semibold mb-4 ${theme === "dark" || isSystemDark ? "dark:text-gray-100" : "text-gray-800"}`}>Your Daily Roadmap</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className={`text-xs uppercase ${theme === "dark" || isSystemDark ? "dark:text-gray-400 dark:bg-gray-700" : "text-gray-500 bg-gray-50"}`}>
                                <tr>
                                    <th className="p-3">Day</th>
                                    <th className="p-3">Start Balance</th>
                                    <th className="p-3">Profit Target</th>
                                    <th className="p-3">Max Drawdown</th>
                                    <th className="p-3">End Balance</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${theme === "dark" || isSystemDark ? "dark:divide-gray-600" : "divide-gray-200"}`}>
                                {planData.map(day => (
                                    <tr key={day.day} className={`${theme === "dark" || isSystemDark ? "dark:hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                                        <td className="p-3 font-semibold">{day.day}</td>
                                        <td className="p-3">${day.start.toFixed(2)}</td>
                                        <td className="p-3 text-green-500 font-semibold">+${day.profit.toFixed(2)}</td>
                                        <td className="p-3 text-red-500 font-semibold">-${day.drawdown.toFixed(2)}</td>
                                        <td className="p-3 font-bold">${day.end.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {planData.length === 0 && (
                            <p className={`text-center p-4 ${theme === "dark" || isSystemDark ? "dark:text-gray-400" : "text-gray-500"}`}>
                                Enter valid plan details to generate your roadmap.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};