'use client';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

import { useEffect, useMemo, useState } from "react";
import { appId } from '../lib/firebaseConfig';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayStatsModal } from './dateModal/DayStatsModal';
import { WeekStatsModal } from './dateModal/WeekStatsModal';

import { User } from "firebase/auth";
import { Firestore } from "firebase/firestore";
import { useTheme } from 'next-themes';

interface Trade {
    id: string;
    date?: import("firebase/firestore").Timestamp;
    sessionProfit?: number;
    totalTrades?: number;
    sessionOutcome?: 'Win' | 'Loss' | string;
    winningTrades?: number;
    losingTrades?: number;
    [key: string]: unknown;
}


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

interface CalendarProps {
    user: User,
    activeJournalData: Journal,
    db: Firestore,
    activeJournalId: string | null,
    showAlert: (message: string) => void;
}

interface DayStats {
    date: string;
    totalProfit: number;
    tradeCount: number;
    wins: number;
    losses: number;
    trades: Trade[];
}


interface WeekStats {
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
        trades: Trade[];
    }>;
    startDate: string;
    endDate: string;
}

export const CalendarView = ({ user, db, activeJournalId }: CalendarProps) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    // const [trades, setTrades] = useState<Array<{ id: string; [key: string]: any }>>([]);
    const [selectedDayStats, setSelectedDayStats] = useState<DayStats | null>(null);
    const [selectedWeekStats, setSelectedWeekStats] = useState<WeekStats | null>(null);
    const [trades, setTrades] = useState<Trade[]>([]);
    const { theme } = useTheme();

    const isSystemDark = theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

    useEffect(() => {
        if (!activeJournalId || !appId) return;
        const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'journals', activeJournalId, 'trades'), orderBy("date", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tradesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTrades(tradesData);
        }, (error) => console.error("Error fetching trades for calendar: ", error));
        return () => unsubscribe();
    }, [user.uid, db, activeJournalId]);

    const dailyStats = useMemo(() => {
        const stats: {
            [dateStr: string]: {
                totalProfit: number;
                tradeCount: number;
                wins: number;
                losses: number;
                trades: Trade[];
            };
        } = {};
        trades.forEach(trade => {
            if (trade.date) {
                const dateStr = trade.date.toDate().toISOString().split('T')[0];
                if (!stats[dateStr]) stats[dateStr] = { totalProfit: 0, tradeCount: 0, wins: 0, losses: 0, trades: [] };
                stats[dateStr].totalProfit += trade.sessionProfit || 0;
                const sessionTrades = trade.totalTrades || 1;
                stats[dateStr].tradeCount += sessionTrades;
                stats[dateStr].wins += trade.sessionOutcome === 'Win' ? (trade.winningTrades || 1) : 0;
                stats[dateStr].losses += trade.sessionOutcome === 'Loss' ? (trade.losingTrades || 1) : 0;
                stats[dateStr].trades.push(trade);
            }
        });
        return stats;
    }, [trades]);

    const handleDayClick = (dayStr: string) => {
        if (dailyStats[dayStr]) {
            setSelectedDayStats({
                date: dayStr,
                ...dailyStats[dayStr]
            });
        }
    };

    const handleWeekClick = (weekDays: { dayStr: string; day: Date }[]) => {
        const weeklyData = {
            totalProfit: 0,
            tradeCount: 0,
            wins: 0,
            losses: 0,
            dailyBreakdown: [] as Array<{ date: string; totalProfit: number; tradeCount: number; wins: number; losses: number; trades: Trade[] }>,
            startDate: weekDays[0].dayStr,
            endDate: weekDays[6].dayStr
        };

        weekDays.forEach(day => {
            const stat = dailyStats[day.dayStr];
            if (stat) {
                weeklyData.totalProfit += stat.totalProfit;
                weeklyData.tradeCount += stat.tradeCount;
                weeklyData.wins += stat.wins;
                weeklyData.losses += stat.losses;
                weeklyData.dailyBreakdown.push({ date: day.dayStr, ...stat });
            }
        });

        if (weeklyData.tradeCount > 0) {
            setSelectedWeekStats(weeklyData);
        }
    }

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    const renderHeader = () => (
        <div className="flex justify-between items-center mb-6">
            <button
                onClick={() => changeMonth(-1)}
                className={`p-2 rounded-full ${theme === "dark" || isSystemDark ? "dark:hover:bg-gray-700" : "hover:bg-gray-100"}`}
            >
                <ChevronLeft />
            </button>
            <h2 className={`text-2xl font-bold ${theme === "dark" || isSystemDark ? "dark:text-gray-200" : "text-gray-800"}`}>
                {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate)}
            </h2>
            <button
                onClick={() => changeMonth(1)}
                className={`p-2 rounded-full ${theme === "dark" || isSystemDark ? "dark:hover:bg-gray-700" : "hover:bg-gray-100"}`}
            >
                <ChevronRight />
            </button>
        </div>
    );

    const renderDays = () => (
        <div className={`grid grid-cols-8 text-center text-sm font-semibold ${theme === "dark" || isSystemDark ? "dark:text-gray-400" : "text-gray-500"}`}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Weekly'].map(day => (
                <div key={day} className={`py-2 border-b ${theme === "dark" || isSystemDark ? "dark:border-gray-700" : "border-gray-200"}`}>
                    {day}
                </div>
            ))}
        </div>
    );

    const renderCells = () => {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const startDate = new Date(monthStart); startDate.setDate(startDate.getDate() - monthStart.getDay());
        const endDate = new Date(monthEnd); endDate.setDate(endDate.getDate() + (6 - monthEnd.getDay()));
        const rows = []; const day = new Date(startDate);

        while (day <= endDate) {
            const daysInWeek: { dayStr: string; day: Date }[] = [];
            let weeklyProfit = 0;
            let hasTrades = false;

            for (let i = 0; i < 7; i++) {
                const dayStr = day.toISOString().split('T')[0];
                const stat = dailyStats[dayStr];
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();

                if (stat && isCurrentMonth) {
                    weeklyProfit += stat.totalProfit;
                    hasTrades = true;
                }

                daysInWeek.push({ dayStr, day: new Date(day) });
                day.setDate(day.getDate() + 1);
            }

            rows.push(
                <div key={day.toISOString()} className="grid grid-cols-8">
                    {daysInWeek.map(({ dayStr, day }) => {
                        const stat = dailyStats[dayStr];
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                        let style = {};
                        let clickableClass = 'cursor-default';
                        if (stat && isCurrentMonth) {
                            const baseColor = stat.totalProfit >= 0 ? '34, 197, 94' : '239, 68, 68';
                            const opacity = Math.min(Math.abs(stat.totalProfit) / 500, 0.7);
                            style = { backgroundColor: `rgba(${baseColor}, ${opacity})` };
                            clickableClass = 'cursor-pointer hover:ring-2 hover:ring-blue-500';
                        }
                        return (
                            <div key={dayStr} style={style} onClick={() => handleDayClick(dayStr)} className={`border-t border-r ${theme === "dark" || isSystemDark ? "dark:border-gray-700" : "border-gray-200"} p-2 h-32 flex flex-col transition-all duration-200 ${clickableClass} ${!isCurrentMonth ? `${theme === "dark" || isSystemDark ? "dark:bg-gray-800/50 dark:text-gray-400" : "bg-gray-50 text-gray-400"}` : `${theme === "dark" || isSystemDark ? "dark:bg-gray-800" : "bg-white"}`}`}>
                                <span className="font-bold self-end">{day.getDate()}</span>
                                {stat && isCurrentMonth && (
                                    <div className={`mt-1 text-xs text-left font-medium ${stat.totalProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                                        <p>Trades: {stat.tradeCount}</p>
                                        <p className="font-bold">${stat.totalProfit.toFixed(2)}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <div onClick={() => handleWeekClick(daysInWeek)} className={`border-t border-r ${theme === "dark" || isSystemDark ? "dark:border-gray-700" : "border-gray-200"} p-2 h-32 flex flex-col justify-center items-center text-center font-semibold ${hasTrades ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-gray-400'} ${weeklyProfit > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {hasTrades && <span>${weeklyProfit.toFixed(2)}</span>}
                    </div>
                </div>
            );
        }
        return <div className={`border-l border-b  ${theme === "dark" || isSystemDark ? "dark:border-gray-700" : "border-gray-200"}`}>{rows}</div>;
    };

    return (
        <div className="space-y-6">
            <h1 className={`text-4xl font-bold ${theme === "dark" || isSystemDark ? "dark:text-gray-100" : "text-gray-800" }`}>Trading Calendar</h1>
            <div className={`p-6 rounded-xl shadow-lg border ${theme === "dark" || isSystemDark ? "dark:bg-gray-800 dark:border-gray-700" : "bg-white border-gray-200"} `}>
                {renderHeader()}
                {renderDays()}
                {renderCells()}
            </div>
            {selectedDayStats && <DayStatsModal stats={selectedDayStats} onClose={() => setSelectedDayStats(null)} theme={theme} isSystemDark={isSystemDark} />}
            {selectedWeekStats && <WeekStatsModal stats={selectedWeekStats} onClose={() => setSelectedWeekStats(null)} theme={theme} isSystemDark={isSystemDark} />}
        </div>
    );
};