import { collection, deleteDoc, doc, DocumentData, DocumentReference, getDoc, getDocs, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from "firebase/firestore";
import { getEndOfDay, getEndOfMonth, getEndOfWeek, getEndOfYear, getStartOfDay, getStartOfMonth, getStartOfWeek, getStartOfYear } from "./timeHelper";
import { User } from "firebase/auth";

interface AchievementProps {
    tradeDate: Date,
    journalRef:  DocumentReference<DocumentData, DocumentData>,
    user: User
}

export async function updateAchievements({tradeDate, journalRef, user}: AchievementProps) {
    const date = tradeDate instanceof Timestamp ? tradeDate.toDate() : tradeDate;
    const tradesCollectionRef = collection(journalRef, 'trades');
    const achievementsCollectionRef = collection(journalRef, 'achievements');
    const now = new Date(); // Get current time

    const periods = {
        daily: { start: getStartOfDay(date), end: getEndOfDay(date) },
        weekly: { start: getStartOfDay(getStartOfWeek(date)), end: getEndOfWeek(date) },
        monthly: { start: getStartOfDay(getStartOfMonth(date)), end: getEndOfMonth(date) },
        yearly: { start: getStartOfDay(getStartOfYear(date)), end: getEndOfYear(date) },
    };

    for (const [type, { start, end }] of Object.entries(periods)) {
        // *** NEW LOGIC: Only proceed if the period has fully ended ***
        if (end >= now) {
            continue; // Skip current or future periods
        }

        const tradesQuery = query(tradesCollectionRef, where('date', '>=', Timestamp.fromDate(start)), where('date', '<=', Timestamp.fromDate(end)));
        const tradesSnapshot = await getDocs(tradesQuery);
        const totalProfit = tradesSnapshot.docs.reduce((sum, doc) => sum + (doc.data().sessionProfit || 0), 0);

        let achievementId;
        if (type === 'daily') achievementId = `daily-${start.toISOString().split('T')[0]}`;
        else if (type === 'weekly') { 
            const year = start.getFullYear(); 
            const weekNum = Math.ceil((((start.getTime() - new Date(year, 0, 1).getTime()) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7); 
            achievementId = `weekly-${year}-W${weekNum}`; 
        }
        else if (type === 'monthly') achievementId = `monthly-${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
        else if (type === 'yearly') achievementId = `yearly-${start.getFullYear()}`;

        const achievementRef = doc(achievementsCollectionRef, achievementId);
        const achievementSnap = await getDoc(achievementRef);

        if (totalProfit > 0) {
            const achievementData = {
                type,
                profit: totalProfit,
                date: Timestamp.fromDate(start),
                traderName: user.displayName || 'Anonymous Trader',
                createdAt: serverTimestamp()
            };
            // Set or update the achievement document
            if (!achievementSnap.exists()) {
                await setDoc(achievementRef, achievementData);
            } else {
                await updateDoc(achievementRef, { profit: totalProfit });
            }
        } else {
            // If profit is no longer positive, remove the achievement
            if (achievementSnap.exists()) {
                await deleteDoc(achievementRef);
            }
        }
    }
}