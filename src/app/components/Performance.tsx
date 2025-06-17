'use client';
import React from "react";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";


interface PerformanceProps {
    trades: Trade[],
    theme?: string,
    isSystemDark: boolean
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

interface StatCardProps {
    title: string;
    value: string | number;
    prefix?: string;
    suffix?: string;
}

export const Performance = ({ trades, theme, isSystemDark }: PerformanceProps) => {
    const [viewMode, setViewMode] = useState('single'); // 'single' or 'compare'

    // State for single metric view
    type ChartDataKey = 'dailyProfit' | 'cumulativeProfit' | 'tradesPerDay' | 'winRateByDay';
    const [singleMetric, setSingleMetric] = useState<ChartDataKey>('dailyProfit');
    const [chartType, setChartType] = useState('Bar');

    // State for compare metrics view
    const [compareMetrics, setCompareMetrics] = useState<MetricKey[]>(['dailyProfit', 'cumulativeProfit']);

    type MetricKey = 'dailyProfit' | 'cumulativeProfit' | 'tradesPerDay' | 'winRateByDay';

    const ALL_METRICS = {
        dailyProfit: { label: 'Daily P/L ($)', type: 'Line', color: '#8884d8', yAxisId: 'left' },
        cumulativeProfit: { label: 'Cumulative P/L ($)', type: 'Area', color: '#82ca9d', yAxisId: 'left' },
        tradesPerDay: { label: 'Trades per Day', type: 'Bar', color: '#ffc658', yAxisId: 'right' },
        winRateByDay: { label: 'Daily Win Rate (%)', type: 'Line', color: '#ff7300', yAxisId: 'right', domain: [0, 100] }
    };

    const performanceData = useMemo(() => {
        const stats = {
            totalProfit: 0, totalSessionWins: 0, totalSessionLosses: 0, avgWin: 0, avgLoss: 0, profitFactor: 0, totalVolume: 0,
            avgRoi: 0, winningStreak: 0, losingStreak: 0,
            performanceByAsset: {} as { [key: string]: { profit: number; wins: number; losses: number } }, dailyMetrics: {} as { [key: string]: { dailyProfit: number; tradesPerDay: number; winsToday: number } }, performanceByDirection: { Buy: { profit: 0, wins: 0, count: 0 }, Sell: { profit: 0, wins: 0, count: 0 } }
        };
        if (trades.length === 0) return { ...stats, chartData: [] };

        let totalWinAmount = 0, totalLossAmount = 0, totalRoi = 0, winningRoiCount = 0;
        let currentWinStreak = 0, currentLoseStreak = 0;

        const getDateValue = (
            date: string | Date | { seconds: number; toDate: () => Date } | undefined
        ): number => {
            if (!date) return 0;
            if (typeof date === 'string') return new Date(date).getTime();
            if (date instanceof Date) return date.getTime();
            if (typeof date === 'object' && date !== null) {
                // Check for Firestore Timestamp shape
                if ('seconds' in date && typeof (date as { seconds: number }).seconds === 'number') {
                    return (date as { seconds: number }).seconds * 1000;
                }
                if ('toDate' in date && typeof (date as { toDate: () => Date }).toDate === 'function') {
                    return (date as { toDate: () => Date }).toDate().getTime();
                }
            }
            return 0;
        };
        const sortedTrades = [...trades].sort((a, b) => getDateValue(a.date) - getDateValue(b.date));

        sortedTrades.forEach(t => {
            const profit = t.sessionProfit || 0;
            const outcome = t.sessionOutcome;

            stats.totalProfit += profit;
            if (t.totalTrades && t.investmentPerTrade) { stats.totalVolume += t.totalTrades * t.investmentPerTrade; }
            if (outcome === 'Win') {
                stats.totalSessionWins++;
                totalWinAmount += profit;
                if (t.roi) { totalRoi += t.roi; winningRoiCount++; }
                currentWinStreak++; currentLoseStreak = 0;
            } else if (outcome === 'Loss') {
                stats.totalSessionLosses++;
                totalLossAmount += profit;
                currentLoseStreak++; currentWinStreak = 0;
            }
            stats.winningStreak = Math.max(stats.winningStreak, currentWinStreak);
            stats.losingStreak = Math.max(stats.losingStreak, currentLoseStreak);

            const assetKey = t.asset ?? 'Unknown';
            if (!stats.performanceByAsset[assetKey]) stats.performanceByAsset[assetKey] = { profit: 0, wins: 0, losses: 0 };
            stats.performanceByAsset[assetKey].profit += profit;
            if (outcome === 'Win') {
                stats.performanceByAsset[assetKey].wins++;
            } else {
                stats.performanceByAsset[assetKey].losses++;
            }

            if (t.direction === "Buy" || t.direction === "Sell") {
                stats.performanceByDirection[t.direction].profit += profit;
                stats.performanceByDirection[t.direction].count++;
                if (outcome === 'Win') stats.performanceByDirection[t.direction].wins++;
            }

            let dateStr = 'Unknown';
            if (
                t.date &&
                typeof t.date === 'object' &&
                'toDate' in t.date &&
                typeof (t.date as { toDate: () => Date }).toDate === 'function'
            ) {
                dateStr = (t.date as { toDate: () => Date }).toDate().toLocaleDateString('en-CA');
            } else if (t.date instanceof Date) {
                dateStr = t.date.toLocaleDateString('en-CA');
            } else if (typeof t.date === 'string') {
                dateStr = new Date(t.date).toLocaleDateString('en-CA');
            }
            if (!stats.dailyMetrics[dateStr]) stats.dailyMetrics[dateStr] = { dailyProfit: 0, tradesPerDay: 0, winsToday: 0 };
            stats.dailyMetrics[dateStr].dailyProfit += profit;
            stats.dailyMetrics[dateStr].tradesPerDay += (t.totalTrades || 1);
            if (outcome === 'Win') stats.dailyMetrics[dateStr].winsToday += (t.winningTrades || 1);
        });

        Object.keys(stats.performanceByAsset).forEach(asset => {
            stats.performanceByAsset[asset].profit = parseFloat(stats.performanceByAsset[asset].profit.toFixed(2));
        });

        stats.avgWin = stats.totalSessionWins > 0 ? totalWinAmount / stats.totalSessionWins : 0;
        stats.avgLoss = stats.totalSessionLosses > 0 ? Math.abs(totalLossAmount / stats.totalSessionLosses) : 0;
        stats.profitFactor = Math.abs(totalLossAmount) > 0 ? totalWinAmount / Math.abs(totalLossAmount) : Infinity;
        stats.avgRoi = winningRoiCount > 0 ? totalRoi / winningRoiCount : 0;

        let cumulativeProfit = 0;
        const chartData = Object.entries(stats.dailyMetrics)
            .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
            .map(([date, metrics]) => {
                cumulativeProfit += metrics.dailyProfit;
                const winRate = (metrics.tradesPerDay > 0) ? (metrics.winsToday / metrics.tradesPerDay) * 100 : 0;
                return {
                    name: date,
                    dailyProfit: parseFloat(metrics.dailyProfit.toFixed(2)),
                    tradesPerDay: metrics.tradesPerDay,
                    cumulativeProfit: parseFloat(cumulativeProfit.toFixed(2)),
                    winRateByDay: isNaN(winRate) ? 0 : parseFloat(winRate.toFixed(2)),
                };
            });

        const finalStats = {
            ...stats,
            totalProfit: parseFloat(stats.totalProfit.toFixed(2)),
            avgWin: parseFloat(stats.avgWin.toFixed(2)),
            avgLoss: parseFloat(stats.avgLoss.toFixed(2)),
            profitFactor: isFinite(stats.profitFactor) ? parseFloat(stats.profitFactor.toFixed(2)) : stats.profitFactor,
            avgRoi: parseFloat(stats.avgRoi.toFixed(2)),
        };

        return { ...finalStats, chartData };
    }, [trades]);

    const handleCompareMetricChange = (metric: MetricKey) => setCompareMetrics(prev => prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]);

    const tooltipValueFormatter = (value: number | string, name: string): string | number => {
        if (typeof value !== 'number') return value;
        if (name.includes('($)')) return `$${value.toFixed(2)}`;
        if (name.includes('%')) return `${value.toFixed(2)}%`;
        if (name.includes('Trades')) return Math.round(value);
        return value.toFixed(2);
    };

    const StatCard = ({ title, value, prefix = '', suffix = '' }: StatCardProps) => (
        <div className={`p-4 rounded-xl shadow-lg border text-center flex flex-col justify-center
            ${theme === 'dark' || isSystemDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h4 className={`font-medium text-sm truncate ${
              theme === 'dark' || isSystemDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {title}
            </h4>
            <p className={`text-lg md:text-xl font-bold break-words ${
              theme === 'dark' || isSystemDark ? 'text-gray-200' : 'text-gray-800'
            }`}>
              {prefix}{value}{suffix}
            </p>
          </div>
    );

    const assetPerformance = Object.entries(performanceData.performanceByAsset).sort((a, b) => b[1].profit - a[1].profit);
    const bestAsset = assetPerformance[0];
    const worstAsset = assetPerformance[assetPerformance.length - 1];

    const renderChart = () => {
        if (performanceData.chartData.length === 0) return <div className={`flex items-center justify-center h-full   ${theme === 'dark' || isSystemDark ? "dark:text-gray-400" : "text-gray-500 " }`}>No data to display.</div>;

        const tooltipProps = { formatter: tooltipValueFormatter, contentStyle: { backgroundColor: 'rgba(30, 41, 59, 0.8)', border: 'none', color: '#fff', borderRadius: '12px' }, labelStyle: { fontWeight: 'bold', color: '#fff' }, cursor: { fill: 'rgba(255, 255, 255, 0.1)' } };

        if (viewMode === 'compare') {
            return (
                <ComposedChart data={performanceData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                    <XAxis dataKey="name" stroke="rgba(128, 128, 128, 0.8)" />
                    <YAxis yAxisId="left" stroke="rgba(128, 128, 128, 0.8)" tickFormatter={(tick) => `$${tick.toFixed(0)}`} />
                    <YAxis yAxisId="right" orientation="right" stroke="rgba(128, 128, 128, 0.8)" />
                    <Tooltip {...tooltipProps} /> <Legend />
                    {compareMetrics.map(key => {
                        const config = ALL_METRICS[key];
                        if (config.type === 'Line') return <Line key={key} yAxisId={config.yAxisId} type="monotone" dataKey={key} name={config.label} stroke={config.color} dot={false} />;
                        if (config.type === 'Bar') return <Bar key={key} yAxisId={config.yAxisId} dataKey={key} name={config.label} fill={config.color} />;
                        if (config.type === 'Area') return <Area key={key} yAxisId={config.yAxisId} type="monotone" dataKey={key} name={config.label} stroke={config.color} fill={config.color} fillOpacity={0.3} />;
                        return null;
                    })}
                </ComposedChart>
            );
        }

        const singleChartData = performanceData.chartData.map(d => ({ name: d.name, value: d[singleMetric] }));
        const ChartComponent = chartType === 'Bar' ? BarChart : AreaChart;

        return (
            <ResponsiveContainer width="100%" height={400}>
                <ChartComponent data={singleChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                    <XAxis dataKey="name" /> <YAxis /> <Tooltip {...tooltipProps} /> <Legend />
                    {chartType === 'Bar' ? (
                        <Bar
                            dataKey="value"
                            name={ALL_METRICS[singleMetric].label}
                            fill={ALL_METRICS[singleMetric].color}
                        />
                    ) : (
                        <Area
                            type="monotone"
                            dataKey="value"
                            name={ALL_METRICS[singleMetric].label}
                            stroke={ALL_METRICS[singleMetric].color}
                            fill={ALL_METRICS[singleMetric].color}
                            fillOpacity={0.3}
                        />
                    )}
                </ChartComponent>
            </ResponsiveContainer>
        );
    };
    // ${ theme === 'dark' || isSystemDark ? "" : "" }

    return (
        <div className="space-y-6">
            <h1 className={`"text-3xl md:text-4xl font-bold   ${theme === 'dark' || isSystemDark ? "dark:text-gray-100" : "text-gray-800"}`}>Performance Analytics</h1>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard title="Total Profit" value={performanceData.totalProfit} prefix="$" />
                <StatCard title="Win Rate" value={((performanceData.totalSessionWins / (performanceData.totalSessionWins + performanceData.totalSessionLosses) || 0) * 100).toFixed(2)} suffix="%" />
                <StatCard title="Profit Factor" value={isFinite(performanceData.profitFactor) ? performanceData.profitFactor : 'Inf'} />
                <StatCard title="Avg Win/Loss" value={`$${performanceData.avgWin} / $${performanceData.avgLoss}`} />
                <StatCard title="Winning Streak" value={performanceData.winningStreak} suffix=" sessions" />
                {bestAsset && <StatCard title="Best Asset" value={bestAsset[0]} prefix={bestAsset[1].profit > 0 ? `+$${bestAsset[1].profit}` : `-$${Math.abs(bestAsset[1].profit)}`} />}
                {worstAsset && bestAsset?.toString() !== worstAsset?.toString() && <StatCard title="Worst Asset" value={worstAsset[0]} prefix={worstAsset[1].profit > 0 ? `+$${worstAsset[1].profit}` : `-$${Math.abs(worstAsset[1].profit)}`} />}
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row border-b border-gray-200 dark:border-gray-700 mb-4">
                    <button onClick={() => setViewMode('single')} className={`py-2 px-4 font-medium ${viewMode === 'single' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Single Metric</button>
                    <button onClick={() => setViewMode('compare')} className={`py-2 px-4 font-medium ${viewMode === 'compare' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Compare Metrics</button>
                </div>

                {viewMode === 'single' ? (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <div className="flex items-center gap-2">
                            <label className="font-medium">Metric:</label>
                            <select value={singleMetric} onChange={(e) => setSingleMetric(e.target.value as ChartDataKey)} className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg border border-gray-300 dark:border-gray-600">
                                {Object.entries(ALL_METRICS).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="font-medium">Chart Type:</label>
                            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
                                <button onClick={() => setChartType('Bar')} className={`px-3 py-1 rounded-l-md ${chartType === 'Bar' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>Bar</button>
                                <button onClick={() => setChartType('Line')} className={`px-3 py-1 border-x border-gray-300 dark:border-gray-600 ${chartType === 'Line' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>Line</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-start gap-4 mb-4">
                        <label className="font-medium">Metrics to Compare:</label>
                        <div className="flex flex-wrap gap-4">
                            {Object.entries(ALL_METRICS).map(([key, { label }]) => (
                                            <label key={key} className="flex items-center space-x-2 cursor-pointer">
                                            <input type="checkbox" checked={compareMetrics.includes(key as MetricKey)} onChange={() => handleCompareMetricChange(key as MetricKey)} className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500" />
                                                <span>{label}</span>              </label>
                                           ))}
                        </div>
                    </div>
                )}
                {renderChart()}
            </div>
        </div>
    );
};