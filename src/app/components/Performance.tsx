'use client';
import React from "react";
import { useMemo } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { StatCard } from "./PerformanceUtils/StatCard";
import { GaugeChart } from "./PerformanceUtils/GaugeChart";


interface PerformanceProps {
    trades: Trade[],
}

interface Trade {
    id: string;
    asset?: string;
    direction?: string;
    date?: import("firebase/firestore").Timestamp | Date | string;
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

interface AssetPerformanceData {
    profit: number;
    wins: number;
    losses: number;
    count: number;
}

interface DirectionPerformanceData {
    profit: number;
    count: number;
}


export const Performance = ({ trades }: PerformanceProps) => {
    const performanceData = useMemo(() => {
        const stats = {
            totalProfit: 0,
            totalSessionWins: 0,
            totalSessionLosses: 0,
            avgWin: 0,
            avgLoss: 0,
            profitFactor: 0,
            maxDrawdown: { value: 0, percentage: 0 },
            performanceByAsset: {} as Record<string, AssetPerformanceData>,
            performanceByDirection: {
                Buy: { profit: 0, count: 0 } as DirectionPerformanceData,
                Sell: { profit: 0, count: 0 } as DirectionPerformanceData
            }
        };
        if (trades.length === 0) return { ...stats, assetPerformance: [], directionPerformance: [] };

        let totalWinAmount = 0, totalLossAmount = 0;
        trades.forEach(t => {
            const profit = t.sessionProfit || 0;
            stats.totalProfit += profit;
            if (t.sessionOutcome === 'Win') { stats.totalSessionWins++; totalWinAmount += profit; } else { stats.totalSessionLosses++; totalLossAmount += profit; }
            if (t.asset) {
                if (!stats.performanceByAsset[t.asset]) stats.performanceByAsset[t.asset] = { profit: 0, wins: 0, losses: 0, count: 0 };
                stats.performanceByAsset[t.asset].profit += profit; stats.performanceByAsset[t.asset].count++;
                if (t.sessionOutcome === 'Win') stats.performanceByAsset[t.asset].wins++; else stats.performanceByAsset[t.asset].losses++;
            }
            if (t.direction && (t.direction === 'Buy' || t.direction === 'Sell')) { stats.performanceByDirection[t.direction].profit += profit; stats.performanceByDirection[t.direction].count++; }
        });


        stats.avgWin = stats.totalSessionWins > 0 ? totalWinAmount / stats.totalSessionWins : 0;
        stats.avgLoss = stats.totalSessionLosses > 0 ? Math.abs(totalLossAmount / stats.totalSessionLosses) : 0;
        stats.profitFactor = stats.avgLoss > 0 ? totalWinAmount / Math.abs(totalLossAmount) : Infinity;

        // Helper function to get sortable timestamp from different date types
        const getTimestamp = (date?: import("firebase/firestore").Timestamp | Date | string): number => {
            if (!date) return 0;
            if (typeof date === 'string') return new Date(date).getTime();
            if (date instanceof Date) return date.getTime();
            if ('seconds' in date) return date.seconds * 1000; // Firebase Timestamp
            return 0;
        };

        let cumulativeProfit = 0, peak = -Infinity;
        const sortedTrades = [...trades].sort((a, b) => getTimestamp(a.date) - getTimestamp(b.date));
        sortedTrades.forEach(t => {
            cumulativeProfit += t.sessionProfit || 0;
            peak = Math.max(peak, cumulativeProfit);
            const drawdown = peak - cumulativeProfit;
            if (drawdown > stats.maxDrawdown.value) { stats.maxDrawdown.value = drawdown; stats.maxDrawdown.percentage = peak > 0 ? (drawdown / peak) * 100 : 0; }
        });

        const assetPerformance = Object.entries(stats.performanceByAsset).map(([name, data]) => ({ name, ...data, winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0 })).sort((a, b) => b.profit - a.profit);
        const directionPerformance = Object.entries(stats.performanceByDirection).map(([name, data]) => ({ name, value: data.profit }));
        return { ...stats, assetPerformance, directionPerformance };
    }, [trades]);

    const totalSessions = performanceData.totalSessionWins + performanceData.totalSessionLosses;
    const winRate = totalSessions > 0 ? (performanceData.totalSessionWins / totalSessions) * 100 : 0;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">Performance Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <StatCard title="Total Profit" value={performanceData.totalProfit.toFixed(2)} prefix="$" />
                <GaugeChart label="Win Rate" value={winRate} maxValue={100} unit="%" info={`${performanceData.totalSessionWins} W / ${performanceData.totalSessionLosses} L`} />
                <GaugeChart label="Profit Factor" value={isFinite(performanceData.profitFactor) ? performanceData.profitFactor : 0} maxValue={4} unit="" info="Higher is better" />
                <StatCard title="Avg Win / Loss" value={`$${performanceData.avgWin.toFixed(2)} / $${performanceData.avgLoss.toFixed(2)}`} />
                <StatCard title="Max Drawdown" value={`$${performanceData.maxDrawdown.value.toFixed(2)} (${performanceData.maxDrawdown.percentage.toFixed(2)}%)`} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold mb-4">P/L by Direction</h2>
                    <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={performanceData.directionPerformance} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(entry) => `${entry.name}: $${entry.value.toFixed(2)}`} paddingAngle={5}>{performanceData.directionPerformance.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.name === 'Buy' ? '#22c55e' : '#ef4444'} />)}</Pie><Tooltip formatter={(value) => `$${typeof value === 'number' ? value.toFixed(2) : String(value)}`} /><Legend /></PieChart></ResponsiveContainer>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold mb-4">P/L by Asset</h2>
                    <div className="overflow-x-auto max-h-[300px]"><table className="w-full text-left"><thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700"><tr><th className="p-3">Asset</th><th className="p-3">Total P/L</th><th className="p-3">Win Rate</th></tr></thead><tbody className="divide-y divide-gray-200 dark:divide-gray-600">{performanceData.assetPerformance.map(asset => (<tr key={asset.name} className="hover:bg-gray-50 dark:hover:bg-gray-700"><td className="p-3 font-medium">{asset.name}</td><td className={`p-3 font-semibold ${asset.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>${asset.profit.toFixed(2)}</td><td className="p-3">{asset.winRate.toFixed(2)}%</td></tr>))}</tbody></table></div>
                </div>
            </div>
        </div>
    );
};