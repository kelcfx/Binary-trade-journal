'use client';

import { useEffect, useState } from "react";

interface AnalogClockProp {
    timezone: string,
    label: string,
}

type TimezoneKey = 'Europe/London' | 'America/New_York' | 'Asia/Tokyo';

export const AnalogClock = ({ timezone, label }: AnalogClockProp) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        let animationFrameId: number;
        const updateClock = () => {
            setTime(new Date());
            animationFrameId = requestAnimationFrame(updateClock);
        };
        animationFrameId = requestAnimationFrame(updateClock);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    const marketHours: Record<TimezoneKey, { open: number; close: number }> = {
        'Europe/London': { open: 8, close: 17 },
        'America/New_York': { open: 8, close: 17 },
        'Asia/Tokyo': { open: 9, close: 15 }
    };

    const nowInTimezone = new Date(time.toLocaleString('en-US', { timeZone: timezone }));
    const hours = nowInTimezone.getHours();
    const minutes = nowInTimezone.getMinutes();
    const seconds = nowInTimezone.getSeconds();
    const milliseconds = nowInTimezone.getMilliseconds();

    const hourDeg = (hours % 12 + minutes / 60) * 30;
    const minuteDeg = (minutes + seconds / 60) * 6;
    const secondDeg = (seconds + milliseconds / 1000) * 6;

    const session = (marketHours as Record<string, { open: number; close: number }>)[timezone] || { open: -1, close: -1 };
    const isOpen = hours >= session.open && hours < session.close;

    return (
        <div className="flex flex-col items-center justify-center p-2">
            <div className="w-36 h-36 rounded-full bg-gray-50 dark:bg-gray-900 border-4 border-gray-200 dark:border-gray-700 shadow-lg relative flex items-center justify-center">
                {/* Clock Face */}
                <div className="absolute w-full h-full">
                    {[...Array(12)].map((_, i) => {
                        const angle = i * 30;
                        const x = 50 + 40 * Math.sin(angle * Math.PI / 180);
                        const y = 50 - 40 * Math.cos(angle * Math.PI / 180);
                        return (
                            <div key={i} className="absolute text-center text-gray-600 dark:text-gray-300 font-semibold text-sm" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>{i === 0 ? 12 : i}</div>
                        );
                    })}
                </div>
                {/* Clock Hands */}
                <div className="absolute w-1.5 h-1.5 bg-gray-800 dark:bg-gray-200 rounded-full z-10"></div>
                <div className="absolute w-1 h-8 sm:h-10 bg-gray-800 dark:bg-gray-200 rounded-sm" style={{ transform: `rotate(${hourDeg}deg)`, transformOrigin: 'bottom', bottom: '50%' }}></div>
                <div className="absolute w-0.5 h-12 sm:h-14 bg-gray-600 dark:bg-gray-400 rounded-sm" style={{ transform: `rotate(${minuteDeg}deg)`, transformOrigin: 'bottom', bottom: '50%' }}></div>
                <div className="absolute w-px h-[52px] sm:h-[60px] bg-red-500" style={{ transform: `rotate(${secondDeg}deg)`, transformOrigin: 'bottom', bottom: '50%' }}></div>
            </div>
            <h3 className="mt-3 font-semibold text-gray-800 dark:text-gray-200">{label}</h3>
            <div className="flex items-center space-x-2 mt-1">
                <div className={`w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`text-sm font-medium ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
                    {isOpen ? 'Open' : 'Closed'}
                </span>
            </div>
        </div>
    );
};