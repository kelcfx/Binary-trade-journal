interface GaugeChartProps {
    value: number;
    label: string;
    maxValue: number;
    unit: string;
    info?: string;
}


export const GaugeChart = ({ value, label, maxValue, unit, info }: GaugeChartProps) => {
    const angle = Math.min(Math.max((value / maxValue) * 180, 0), 180);
    const colorStops = [{ offset: '0%', color: '#ef4444' }, { offset: '25%', color: '#f97316' }, { offset: '50%', color: '#f59e0b' }, { offset: '75%', color: '#22c55e' }];
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-between">
            <h4 className="text-gray-500 dark:text-gray-400 font-medium text-sm truncate">{label}</h4>
            <div className="relative w-48 h-24 mt-2">
                <svg viewBox="0 0 100 50" className="w-full h-full">
                    <defs><linearGradient id={`gauge-gradient-${label.replace(/\s/g, '')}`} x1="0%" y1="0%" x2="100%" y2="0%">{colorStops.map(stop => <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />)}</linearGradient></defs>
                    <path d="M 10 50 A 40 40 0 0 1 90 50" strokeWidth="10" strokeLinecap="round" className="stroke-current text-gray-200 dark:text-gray-700" fill="none" />
                    <path d="M 10 50 A 40 40 0 0 1 90 50" strokeWidth="10" strokeLinecap="round" stroke={`url(#gauge-gradient-${label.replace(/\s/g, '')})`} fill="none" strokeDasharray="125.66" strokeDashoffset={125.66 - (angle / 180 * 125.66)} className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute bottom-0 w-full text-center"><p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{value.toFixed(2)}{unit}</p></div>
            </div>
            {info && <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-2">{info}</p>}
        </div>
    );
}