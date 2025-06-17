import { Modal } from "../Modal";

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

interface WeekStatsModalProps {
    stats: WeekStats,
    onClose: () => void,
    theme?: string,
    isSystemDark: boolean
}

export const WeekStatsModal = ({ stats, onClose, theme, isSystemDark }: WeekStatsModalProps) => {
    const { startDate, totalProfit, tradeCount, wins, dailyBreakdown } = stats;
    const winRate = tradeCount > 0 ? (wins / tradeCount) * 100 : 0;

    return (
        <Modal theme={theme} isSystemDark={isSystemDark} isOpen={true} onClose={onClose} title={`Stats for Week of ${new Date(startDate + 'T00:00:00').toLocaleDateString()}`}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className={`p-4 rounded-lg ${theme === "dark" || isSystemDark ? "dark:bg-gray-700" : "bg-gray-100"}`}>
                        <h4 className={`text-sm font-medium ${theme === "dark" || isSystemDark ? "dark:text-gray-400" : "text-gray-500"}`}>Total P/L</h4>
                        <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>${totalProfit.toFixed(2)}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${theme === "dark" || isSystemDark ? "dark:bg-gray-700" : "bg-gray-100"}`}>
                        <h4 className={`text-sm font-medium ${theme === "dark" || isSystemDark ? "dark:text-gray-400" : "text-gray-500"}`}>Weekly Win Rate</h4>
                        <p className="text-2xl font-bold text-blue-500">{winRate.toFixed(2)}%</p>
                    </div>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-2">
                    <h4 className={`font-semibold text-lg ${theme === "dark" || isSystemDark ? "dark:text-gray-400" : "text-gray-500"}`}>Daily Breakdown</h4>
                    {dailyBreakdown.map(day => (
                        <div key={day.date} className={`p-3 rounded-lg ${theme === "dark" || isSystemDark ? "dark:bg-gray-700/50" : "bg-gray-50"}`}>
                            <div className="flex justify-between items-center font-bold">
                                <span className={`${theme === "dark" || isSystemDark ? "dark:text-gray-400" : "text-gray-500"}`}>{new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}</span>
                                <span className={day.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}>${day.totalProfit.toFixed(2)}</span>
                            </div>
                            <div className={`text-xs ${theme === "dark" || isSystemDark ? "dark:text-gray-400" : "text-gray-500"}`}>
                                {day.trades.length} session(s) | {day.wins} wins / {day.losses} losses
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
};