'use client';

import React from "react";
import { Award } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { getAchievementTitle, getAchievementFormattedDate } from "../utils/achievementHelpers";



interface Achievement {
    id: string;
    type: string;
    profit: number;
    date: Timestamp;
    traderName: string;
    createdAt: Timestamp;
    [key: string]: unknown;
}

interface AchievementBannerProps {
    achievement: Achievement;
}

export const AchievementBanner = React.forwardRef<HTMLDivElement, AchievementBannerProps>(({ achievement }, ref) => {
    const { profit, traderName } = achievement;
    return (
        <div ref={ref} className="bg-gradient-to-br from-gray-800 to-gray-900 text-white p-6 rounded-xl shadow-2xl border-2 border-yellow-400 w-full relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-400/10 rounded-full"></div>
            <div className="absolute -bottom-16 -left-10 w-48 h-48 bg-blue-500/10 rounded-full"></div>
            <div className="relative z-10 text-center space-y-4">
                <Award className="mx-auto h-16 w-16 text-yellow-400" />
                <h2 className="text-2xl font-bold tracking-wider uppercase text-yellow-300">{getAchievementTitle(achievement.type)}</h2>
                <p className="text-lg">Awarded to</p>
                <h3 className="text-3xl font-serif font-semibold">{traderName}</h3>
                <p className="text-lg">for achieving a total profit of</p>
                <p className="text-5xl font-bold text-green-400">${profit.toFixed(2)}</p>
                <p className="text-gray-400 text-sm pt-2">{getAchievementFormattedDate(achievement)}</p>
            </div>
        </div>
    );
});

AchievementBanner.displayName = 'AchievementBanner';