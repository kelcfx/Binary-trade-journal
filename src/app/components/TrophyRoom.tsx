'use client';

import { User } from "firebase/auth";
import { collection, Firestore, onSnapshot, query, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Trophy, Award } from "lucide-react";
import { appId } from "../lib/firebaseConfig";
import { AchievementPreviewModal } from "./AchievementModal/AchievementPreviewModal";
import { AchievementCard } from "./AchievementCard";

interface Achievement {
    id: string;
    type: string;
    profit: number;
    date: Timestamp;
    traderName: string;
    createdAt: Timestamp;
    [key: string]: unknown;
}

interface TrophyRoomProps {
    user: User,
    activeJournalId: string | null,
    db: Firestore,
    showAlert: (message: string) => void,
}

export const TrophyRoom = ({ user, activeJournalId, db, showAlert }: TrophyRoomProps) => {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('daily');
    const [previewAchievement, setPreviewAchievement] = useState<Achievement | null>(null);

    useEffect(() => {
        if (!activeJournalId || !appId) { setLoading(false); return; }
        setLoading(true);
        const achievementsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'journals', activeJournalId, 'achievements');
        const q = query(achievementsRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allAchievements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Achievement));
            const filteredAndSorted = allAchievements
                .filter(ach => ach.type === filter)
                .sort((a, b) => b.date.seconds - a.date.seconds);

            setAchievements(filteredAndSorted);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching achievements: ", error);
            showAlert("Could not load achievements. The database query failed.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [activeJournalId, filter, user.uid, db, showAlert]);


    const TABS = ['daily', 'weekly', 'monthly', 'yearly'];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3"><Trophy className="w-8 h-8 text-yellow-500" />Trophy Room</h1>
            <div className="border-b border-gray-200 dark:border-gray-700"><nav className="-mb-px flex space-x-6" aria-label="Tabs">{TABS.map(tab => (<button key={tab} onClick={() => setFilter(tab)} className={`${filter === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm capitalize transition-all`}>{tab}</button>))}</nav></div>
            {loading ? (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>)
                : achievements.length === 0 ? (<div className="text-center bg-white dark:bg-gray-800 p-12 rounded-xl shadow-lg border-dashed border-2 border-gray-300 dark:border-gray-700"><Award className="mx-auto h-12 w-12 text-gray-400" /><h3 className="mt-2 text-xl font-medium text-gray-900 dark:text-white">No {filter} achievements yet</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Keep trading! Your profitable {filter} will be celebrated here.</p></div>)
                    : (<div className="space-y-3">{achievements.map(achievement => (<AchievementCard key={achievement.id} achievement={achievement} onClick={() => setPreviewAchievement(achievement)} />))}</div>)
            }
            <AchievementPreviewModal achievement={previewAchievement} onClose={() => setPreviewAchievement(null)} showAlert={showAlert} />
        </div>
    );
};