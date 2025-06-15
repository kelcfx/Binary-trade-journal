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

interface DayStats {
    date: string;
    totalProfit: number;
    tradeCount: number;
    wins: number;
    losses: number;
    trades: Trade[];
}

interface DayStatsModalProps {
    stats: DayStats,
    onClose: () => void,
    theme?: string,
    isSystemDark: boolean
}

export const DayStatsModal = ({ stats, onClose, theme, isSystemDark }: DayStatsModalProps) => {
    const { date, totalProfit, tradeCount, wins, losses, trades } = stats;
    const winRate = tradeCount > 0 ? (wins / tradeCount) * 100 : 0;

    return (
        <Modal isOpen={true} onClose={onClose} title={`Stats for ${new Date(date + 'T00:00:00').toLocaleDateString()}`}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className={`p-4 rounded-lg ${theme === "dark" || isSystemDark ? "dark:bg-gray-700" : "bg-gray-100"}`}>
                        <h4 className={`text-sm font-medium ${theme === "dark" || isSystemDark ? "dark:text-gray-400" : "text-gray-500"}`}>Total P/L</h4>
                        <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>${totalProfit.toFixed(2)}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${theme === "dark" || isSystemDark ? "dark:bg-gray-700" : "bg-gray-100"}`}>
                        <h4 className={`text-sm font-medium ${theme === "dark" || isSystemDark ? "dark:text-gray-400" : "text-gray-500"}`}>Win Rate</h4>
                        <p className="text-2xl font-bold text-blue-500">{winRate.toFixed(2)}%</p>
                    </div>
                </div>
                <div className={`text-sm text-center ${theme === "dark" || isSystemDark ? "dark:text-gray-400" : "text-gray-500"}`}>
                    <p>Total Sessions: {trades.length} | Wins: {wins} | Losses: {losses}</p>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                    <h4 className={`font-semibold text-lg ${theme === "dark" || isSystemDark ? "dark:text-gray-400" : "text-gray-500"}`}>Trade Sessions</h4>
                    {trades.map((trade, index) => (
                        <div key={trade.id || index} className={`p-3 rounded-lg flex justify-between items-center ${theme === "dark" || isSystemDark ? "dark:bg-gray-700/50" : "bg-gray-50"}`}>
                            <div>
                                <p className={`font-bold ${theme === "dark" || isSystemDark ? "dark:text-gray-400" : "text-gray-500"}`}>{typeof trade.asset === "string" ? trade.asset : ""}</p>
                                <p className={`text-xs ${theme === "dark" || isSystemDark ? "dark:text-gray-400" : "text-gray-500"}`}>{typeof trade.direction === "string" ? trade.direction : ""}</p>
                            </div>
                            <p className={`font-semibold ${(trade.sessionProfit ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>${(trade.sessionProfit ?? 0).toFixed(2)}</p>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
};