'use client';
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayStatsModal } from './dateModal/DayStatsModal';
import { WeekStatsModal } from './dateModal/WeekStatsModal';

// Import the types from the modal components to ensure compatibility
type ModalTrade = {
    id: string;
    date?: import("firebase/firestore").Timestamp;
    sessionProfit?: number;
    totalTrades?: number;
    sessionOutcome?: 'Win' | 'Loss' | string;
    winningTrades?: number;
    losingTrades?: number;
    asset?: string;
    direction?: string;
    [key: string]: unknown;
};

type ModalDayStats = {
    date: string;
    totalProfit: number;
    tradeCount: number;
    wins: number;
    losses: number;
    trades: ModalTrade[];
};

type ModalWeekStats = {
    totalProfit: number;
    tradeCount: number;
    wins: number;
    losses: number;
    dailyBreakdown: Array<{
        date: string;
        totalProfit: number;
        tradeCount: number;
        wins: number;
        losses: number;
        trades: ModalTrade[];
    }>;
    startDate: string;
    endDate: string;
};
import { Timestamp } from "firebase/firestore";

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

interface CalendarProps {
    trades: Trade[],
}

export const CalendarView = ({ trades }: CalendarProps) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDayStats, setSelectedDayStats] = useState<ModalDayStats | null>(null);
    const [selectedWeekStats, setSelectedWeekStats] = useState<ModalWeekStats | null>(null);

    // Helper function to convert Trade to ModalTrade
    const convertToModalTrade = (trade: Trade): ModalTrade => {
        // Convert date to Timestamp if it's not already
        let convertedDate: import("firebase/firestore").Timestamp | undefined;
        if (trade.date) {
            if (typeof trade.date === 'object' && 'toDate' in trade.date) {
                convertedDate = trade.date as import("firebase/firestore").Timestamp;
            } else {
                // For string or Date, we'll leave it undefined since modal expects Timestamp
                convertedDate = undefined;
            }
        }

        return {
            id: trade.id,
            date: convertedDate,
            sessionProfit: trade.sessionProfit,
            totalTrades: trade.totalTrades,
            sessionOutcome: trade.sessionOutcome,
            winningTrades: trade.winningTrades,
            losingTrades: trade.losingTrades,
            asset: trade.asset,
            direction: trade.direction,
        };
    };

    // Helper function to convert different date types to Date object
    const getDateObj = (date: string | Timestamp | Date | undefined): Date | null => {
        if (!date) return null;
        if (typeof date === 'string') return new Date(date);
        if (date instanceof Date) return date;
        if (typeof date === 'object' && date !== null && 'toDate' in date && typeof date.toDate === 'function') {
            return date.toDate();
        }
        return null;
    };

    const dailyStats = useMemo(() => {
        const stats: Record<string, { totalProfit: number; tradeCount: number; wins: number; losses: number; trades: Trade[] }> = {};
        trades.forEach(trade => {
            if (trade.date) {
                const dateObj = getDateObj(trade.date);
                if (dateObj) {
                    const dateStr = dateObj.toLocaleDateString('en-CA');
                    if (!stats[dateStr]) stats[dateStr] = { totalProfit: 0, tradeCount: 0, wins: 0, losses: 0, trades: [] };
                    stats[dateStr].totalProfit += trade.sessionProfit || 0;
                    const sessionTrades = trade.totalTrades || 1;
                    stats[dateStr].tradeCount += sessionTrades;
                    stats[dateStr].wins += trade.sessionOutcome === 'Win' ? (trade.winningTrades || 1) : 0;
                    stats[dateStr].losses += trade.sessionOutcome === 'Loss' ? (trade.losingTrades || 1) : 0;
                    stats[dateStr].trades.push(trade);
                }
            }
        });
        return stats;
    }, [trades]);

    const handleDayClick = (dayStr: string) => {
        if (dailyStats[dayStr]) {
            const stat = dailyStats[dayStr];
            const modalStats: ModalDayStats = {
                date: dayStr,
                totalProfit: stat.totalProfit,
                tradeCount: stat.tradeCount,
                wins: stat.wins,
                losses: stat.losses,
                trades: stat.trades.map(convertToModalTrade)
            };
            setSelectedDayStats(modalStats);
        }
    };

    const handleWeekClick = (weekDays: Array<{ dayStr: string; day: Date }>) => {
        const weeklyData: Omit<ModalWeekStats, 'startDate' | 'endDate'> = { totalProfit: 0, tradeCount: 0, wins: 0, losses: 0, dailyBreakdown: [] };
        let hasTrades = false;
        weekDays.forEach(day => {
            const stat = dailyStats[day.dayStr];
            if (stat) {
                hasTrades = true;
                weeklyData.totalProfit += stat.totalProfit;
                weeklyData.tradeCount += stat.tradeCount;
                weeklyData.wins += stat.wins;
                weeklyData.losses += stat.losses;
                weeklyData.dailyBreakdown.push({
                    date: day.dayStr,
                    totalProfit: stat.totalProfit,
                    tradeCount: stat.tradeCount,
                    wins: stat.wins,
                    losses: stat.losses,
                    trades: stat.trades.map(convertToModalTrade)
                });
            }
        });
        if (hasTrades) { setSelectedWeekStats({ ...weeklyData, startDate: weekDays[0].dayStr, endDate: weekDays[6].dayStr }); }
    }

    const changeMonth = (offset: number) => setCurrentDate(prev => { const newDate = new Date(prev); newDate.setMonth(newDate.getMonth() + offset); return newDate; });

    const renderHeader = () => (<div className="flex justify-between items-center mb-6"><button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeft /></button><h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200">{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate)}</h2><button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRight /></button></div>);
    const renderDays = () => (<div className="grid grid-cols-8 text-center text-gray-500 dark:text-gray-400 text-xs md:text-sm font-semibold">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Weekly'].map(day => <div key={day} className="py-2 border-b border-gray-200 dark:border-gray-700">{day}</div>)}</div>);

    const renderCells = () => {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const startDate = new Date(monthStart); startDate.setDate(startDate.getDate() - monthStart.getDay());
        const rows = [];
        const day = new Date(startDate);
        let weekIndex = 0;

        while (day <= monthEnd) {
            const daysInWeek: Array<{ dayStr: string; day: Date }> = [];
            let weeklyProfit = 0;
            let hasTrades = false;

            for (let i = 0; i < 7; i++) {
                const dayStr = day.toLocaleDateString('en-CA');
                const stat = dailyStats[dayStr];
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                if (stat && isCurrentMonth) { weeklyProfit += stat.totalProfit; hasTrades = true; }
                daysInWeek.push({ dayStr, day: new Date(day) });
                day.setDate(day.getDate() + 1);
            }

            rows.push(
                <div key={`week-${weekIndex}`} className="grid grid-cols-8">
                    {daysInWeek.map(({ dayStr, day }) => {
                        const stat = dailyStats[dayStr];
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                        let style = {}, clickableClass = 'cursor-default';
                        if (stat && isCurrentMonth) {
                            const baseColor = stat.totalProfit >= 0 ? '34, 197, 94' : '239, 68, 68';
                            const opacity = Math.min(Math.abs(stat.totalProfit) / 500, 0.7);
                            style = { backgroundColor: `rgba(${baseColor}, ${opacity})` };
                            clickableClass = 'cursor-pointer hover:ring-2 hover:ring-blue-500';
                        }
                        return (
                            <div key={dayStr} style={style} onClick={() => handleDayClick(dayStr)} className={`border-t border-r border-gray-200 dark:border-gray-700 p-1 md:p-2 h-24 md:h-32 flex flex-col transition-all duration-200 ${clickableClass} ${!isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-400' : 'bg-white dark:bg-gray-800'}`}>
                                <span className="font-bold self-end text-xs md:text-sm">{day.getDate()}</span>
                                {stat && isCurrentMonth && (<div className={`mt-1 text-xs text-left font-medium ${stat.totalProfit >= 0 ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}><p className="hidden sm:block">Trades: {stat.tradeCount}</p><p className="font-bold">${stat.totalProfit.toFixed(2)}</p></div>)}
                            </div>
                        );
                    })}
                    <div onClick={() => handleWeekClick(daysInWeek)} className={`border-t border-r border-gray-200 dark:border-gray-700 p-2 h-24 md:h-32 flex flex-col justify-center items-center text-center font-semibold ${hasTrades ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-gray-400'} ${weeklyProfit > 0 ? 'text-green-500' : 'text-red-500'}`}>{hasTrades && <span className="text-sm md:text-base">${weeklyProfit.toFixed(2)}</span>}</div>
                </div>
            );
            weekIndex++;
        }
        return <div className="border-l border-b border-gray-200 dark:border-gray-700">{rows}</div>;
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">Trading Calendar</h1>
            <div className="bg-white dark:bg-gray-800 p-2 md:p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">{renderHeader()}{renderDays()}{renderCells()}</div>
            {selectedDayStats && <DayStatsModal stats={selectedDayStats} onClose={() => setSelectedDayStats(null)} />}
            {selectedWeekStats && <WeekStatsModal stats={selectedWeekStats} onClose={() => setSelectedWeekStats(null)} />}
        </div>
    );
};