import { Modal } from "../PopupModal/Modal";

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
}

export const WeekStatsModal = ({ stats, onClose }: WeekStatsModalProps) => {
    const { totalProfit, tradeCount, wins, dailyBreakdown } = stats;
    const winRate = tradeCount > 0 ? (wins / tradeCount) * 100 : 0;

    return (
        <Modal isOpen={true} onClose={onClose} title={`Weekly Stats Summary`}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center"><div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg"><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total P/L</h4><p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>${totalProfit.toFixed(2)}</p></div><div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg"><h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Weekly Win Rate</h4><p className="text-2xl font-bold text-blue-500">{winRate.toFixed(2)}%</p></div></div>
                <div className="max-h-80 overflow-y-auto space-y-2"><h4 className="font-semibold text-lg">Daily Breakdown</h4>{dailyBreakdown.map(day => (<div key={day.date} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"><div className="flex justify-between items-center font-bold"><span>{new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}</span><span className={day.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}>${day.totalProfit.toFixed(2)}</span></div><div className="text-xs text-gray-500">{day.trades.length} session(s) | {day.wins} wins / {day.losses} losses</div></div>))}</div>
            </div>
        </Modal>
    );
};