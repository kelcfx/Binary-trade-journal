'use client';

import { useEffect, useState } from "react";

interface ClockProps {
    timezone: string,
    label: string,
    theme?: string,
    isSystemDark: boolean
}

export const Clock = ({ timezone, label, theme, isSystemDark }: ClockProps) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    const timeString = time.toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true });

    return (
        <div className="text-center">
            <p className={`text-lg font-semibold ${theme === "dark" || isSystemDark ? "dark:text-white" : "text-gray-900"}`}>{timeString}</p>
            <p className={`text-sm ${theme === "dark" || isSystemDark ? "dark:text-gray-400" : "text-gray-500"}`}>{label}</p>
        </div>
    );
};