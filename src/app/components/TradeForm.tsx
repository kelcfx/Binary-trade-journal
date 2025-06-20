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
}

function formatDate(value: string | Date | { toDate: () => Date } | undefined): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate().toISOString().slice(0, 10);
    return '';
}

function formatTime(value: string | Date | { toDate: () => Date } | undefined): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString().slice(11, 16);
    if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate().toISOString().slice(11, 16);
    return '';
}

export const TradeForm = ({ tradeData, onInputChange, onSubmit, isManualProfit, setIsManualProfit }: TradeFormProps) => {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex justify-end items-center">
                <label htmlFor="manual-profit-toggle" className="mr-2 text-sm font-medium text-gray-700 dark:text-gray-300">Enter Profit Manually</label>
                <button type="button" onClick={() => setIsManualProfit(!isManualProfit)} className={`${isManualProfit ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}>
                    <span className={`${isManualProfit ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                </button>
            </div>

            <input name="asset" value={tradeData.asset} onChange={onInputChange} placeholder="Asset (e.g., EUR/USD)" required className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg" />
            <div className="grid grid-cols-2 gap-4">
                <input
                    type="date"
                    name="date"
                    value={formatDate(tradeData.date)}
                    onChange={onInputChange}
                    required
                    className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg"
                />
                <input
                    type="time"
                    name="time"
                    value={formatTime(tradeData.time)}
                    onChange={onInputChange}
                    required
                    className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg"
                />
            </div>

            {isManualProfit ? (
                <input type="number" step="0.01" name="sessionProfit" value={tradeData.sessionProfit} onChange={onInputChange} placeholder="Session Profit/Loss ($)" required className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg" />
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-4"><input type="number" name="investmentPerTrade" value={tradeData.investmentPerTrade} onChange={onInputChange} placeholder="Investment per Trade ($)" required className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg" /><input type="number" name="roi" value={tradeData.roi} onChange={onInputChange} placeholder="ROI (%)" required className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg" /></div>
                    <div className="grid grid-cols-2 gap-4"><input type="number" name="totalTrades" value={tradeData.totalTrades} onChange={onInputChange} placeholder="Total Trades" required className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg" /><input type="number" name="losingTrades" value={tradeData.losingTrades} onChange={onInputChange} placeholder="Losing Trades" required className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg" /></div>
                </>
            )}
            <select name="direction" value={tradeData.direction} onChange={onInputChange} className="w-full bg-gray-100 dark:bg-gray-700 p-3 rounded-lg"><option>Buy</option><option>Sell</option></select>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">{tradeData.id ? 'Save Changes' : 'Log Trading Session'}</button>
        </form>
    );
};