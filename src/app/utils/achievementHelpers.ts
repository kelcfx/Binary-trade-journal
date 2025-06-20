import { Timestamp } from "firebase/firestore";
import { getEndOfWeek, getWeekOfMonth, getOrdinalSuffix } from "./timeHelper";

interface Achievement {
    id: string;
    type: string;
    profit: number;
    date: Timestamp;
    traderName: string;
    createdAt: Timestamp;
    [key: string]: unknown;
}

// Utility function to get achievement title based on type
export const getAchievementTitle = (type: string): string => {
    switch (type) {
        case 'daily':
            return 'Daily Champion';
        case 'weekly':
            return 'Weekly Warrior';
        case 'monthly':
            return 'Monthly Master';
        case 'yearly':
            return 'Yearly Legend';
        default:
            return 'Achievement Unlocked';
    }
};

// Utility function to format achievement date
export const getAchievementFormattedDate = (achievement: Achievement): string => {
    const date = achievement.date.toDate();
    const type = achievement.type;

    switch (type) {
        case 'daily':
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        case 'weekly': {
            const weekOfMonth = getWeekOfMonth(date);
            const endOfWeek = getEndOfWeek(date);
            return `${weekOfMonth}${getOrdinalSuffix(weekOfMonth)} week of ${endOfWeek.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            })}`;
        }
        case 'monthly':
            return date.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });
        case 'yearly':
            return date.getFullYear().toString();
        default:
            return date.toLocaleDateString('en-US');
    }
};
