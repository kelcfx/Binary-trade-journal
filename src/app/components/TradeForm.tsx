import { ChangeEvent, Dispatch, SetStateAction } from "react";


interface TradeData {
    time: import("firebase/firestore").Timestamp | Date | string;
    id: string;
    asset?: string;
    direction?: string;
    date?: import("firebase/firestore").Timestamp | Date | string;
    sessionProfit?: number;
    sessionOutcome?: string;
    totalTrades?: number;
    investmentPerTrade?: number;
    roi?: number;
    winningTrades?: number;
    losingTrades?: number;
    [key: string]: unknown;
}

interface TradeFormProps {
    tradeData: TradeData;
    onInputChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    isManualProfit: boolean;
    setIsManualProfit: Dispatch<SetStateAction<boolean>>;
    theme?: string;
    isSystemDark: boolean;
}

export const TradeForm = ({ tradeData, onInputChange, onSubmit, isManualProfit, setIsManualProfit, theme, isSystemDark }: TradeFormProps) => {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex justify-end items-center">
                <label htmlFor="manual-profit-toggle" className={`mr-2 text-sm font-medium ${theme === "dark" || isSystemDark ? "text-gray-300" : "text-gray-700"}`}>
                    Enter Profit Manually
                </label>
                <button
                    type="button"
                    onClick={() => setIsManualProfit(!isManualProfit)}
                    className={`${isManualProfit ? 'bg-blue-600' : theme === "dark" || isSystemDark ? 'bg-gray-600' : 'bg-gray-200'} relative inline-flex items-center h-6 rounded-full w-11`}
                >
                    <span className={`${isManualProfit ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                </button>
            </div>

            <input
                name="asset"
                value={tradeData.asset}
                onChange={onInputChange}
                placeholder="Asset (e.g., EUR/USD)"
                required
                className={`w-full p-3 rounded-lg ${theme === "dark" || isSystemDark ? "bg-gray-700" : "bg-gray-100"}`}
            />

            <div className="grid grid-cols-2 gap-4">
                <input
                    type="date"
                    name="date"
                    value={
                        tradeData.date
                            ? typeof tradeData.date === "string"
                                ? tradeData.date
                                : tradeData.date instanceof Date
                                    ? tradeData.date.toISOString().slice(0, 10)
                                    : "toDate" in tradeData.date && typeof tradeData.date.toDate === "function"
                                        ? tradeData.date.toDate().toISOString().slice(0, 10)
                                        : ""
                            : ""
                    }
                    onChange={onInputChange}
                    required
                    className={`w-full p-3 rounded-lg ${theme === "dark" || isSystemDark ? "bg-gray-700" : "bg-gray-100"}`}
                />
                <input
                    type="time"
                    name="time"
                    value={
                        tradeData.time
                            ? typeof tradeData.time === "string"
                                ? tradeData.time
                                : tradeData.time instanceof Date
                                    ? tradeData.time.toISOString().slice(11, 16)
                                    : "toDate" in tradeData.time && typeof tradeData.time.toDate === "function"
                                        ? tradeData.time.toDate().toISOString().slice(11, 16)
                                        : ""
                            : ""
                    }
                    onChange={onInputChange}
                    required
                    className={`w-full p-3 rounded-lg ${theme === "dark" || isSystemDark ? "bg-gray-700" : "bg-gray-100"}`}
                />
            </div>

            {isManualProfit ? (
                <input
                    type="number"
                    step="0.01"
                    name="sessionProfit"
                    value={tradeData.sessionProfit}
                    onChange={onInputChange}
                    placeholder="Session Profit/Loss ($)"
                    required
                    className={`w-full p-3 rounded-lg ${theme === "dark" || isSystemDark ? "bg-gray-700" : "bg-gray-100"}`}
                />
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <input
                            type="number"
                            name="investmentPerTrade"
                            value={tradeData.investmentPerTrade}
                            onChange={onInputChange}
                            placeholder="Investment per Trade ($)"
                            required
                            className={`w-full p-3 rounded-lg ${theme === "dark" || isSystemDark ? "bg-gray-700" : "bg-gray-100"}`}
                        />
                        <input
                            type="number"
                            name="roi"
                            value={tradeData.roi}
                            onChange={onInputChange}
                            placeholder="ROI (%)"
                            required
                            className={`w-full p-3 rounded-lg ${theme === "dark" || isSystemDark ? "bg-gray-700" : "bg-gray-100"}`}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input
                            type="number"
                            name="totalTrades"
                            value={tradeData.totalTrades}
                            onChange={onInputChange}
                            placeholder="Total Trades"
                            required
                            className={`w-full p-3 rounded-lg ${theme === "dark" || isSystemDark ? "bg-gray-700" : "bg-gray-100"}`}
                        />
                        <input
                            type="number"
                            name="losingTrades"
                            value={tradeData.losingTrades}
                            onChange={onInputChange}
                            placeholder="Losing Trades"
                            required
                            className={`w-full p-3 rounded-lg ${theme === "dark" || isSystemDark ? "bg-gray-700" : "bg-gray-100"}`}
                        />
                    </div>
                </>
            )}

            <select
                name="direction"
                value={tradeData.direction}
                onChange={onInputChange}
                className={`w-full p-3 rounded-lg ${theme === "dark" || isSystemDark ? "bg-gray-700" : "bg-gray-100"}`}
            >
                <option>Buy</option>
                <option>Sell</option>
            </select>

            <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
                {tradeData.id ? 'Save Changes' : 'Log Trading Session'}
            </button>
        </form>
    );
};