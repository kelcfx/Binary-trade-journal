import { Timestamp } from "firebase/firestore";
import { Trophy } from "lucide-react";
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

interface AchievementCardProps {
    achievement: Achievement;
    onClick: () => void;
}

export const AchievementCard = ({ achievement, onClick }: AchievementCardProps) => {
    return (
        <button onClick={onClick} className="w-full bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:ring-2 hover:ring-blue-500 transition-all duration-200">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-yellow-100 dark:bg-yellow-500/10 p-2 rounded-lg">
                        <Trophy className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-200">{getAchievementTitle(achievement.type)}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{getAchievementFormattedDate(achievement)}</p>
                    </div>
                </div>
                <p className="text-lg font-bold text-green-500">${achievement.profit.toFixed(2)}</p>
            </div>
        </button>
    );
};