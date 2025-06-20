'use client';

import { useState, useRef } from "react";
import { Download } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { AchievementBanner } from "../AchievementBanner";

interface Achievement {
    id: string;
    type: string;
    profit: number;
    date: Timestamp;
    traderName: string;
    createdAt: Timestamp;
    [key: string]: unknown;
}

// Define options interface for htmlToImage
interface HtmlToImageOptions {
    cacheBust?: boolean;
    pixelRatio?: number;
    width?: number;
    height?: number;
    quality?: number;
    backgroundColor?: string;
    style?: Record<string, string>;
    filter?: (node: Element) => boolean;
    [key: string]: unknown;
}

// Extend Window interface to include htmlToImage
declare global {
    interface Window {
        htmlToImage?: {
            toPng: (element: HTMLElement, options?: HtmlToImageOptions) => Promise<string>;
        };
    }
}

interface AchievementPreviewModalProps {
    achievement: Achievement | null,
    onClose: () => void,
    showAlert: (message: string) => void,
}

export const AchievementPreviewModal = ({ achievement, onClose, showAlert }: AchievementPreviewModalProps) => {
    const bannerRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = () => {
        if (!bannerRef.current || !achievement) return;
        if (typeof window.htmlToImage === 'undefined') { showAlert("Image library is still loading. Please try again in a moment."); return; }
        setIsDownloading(true);
        window.htmlToImage.toPng(bannerRef.current, { cacheBust: true, pixelRatio: 2 })
            .then((dataUrl: string) => {
                const link = document.createElement('a');
                link.download = `achievement-${achievement.type}-${achievement.date.toDate().toISOString().split('T')[0]}.png`;
                link.href = dataUrl;
                link.click();
                onClose();
            })
            .catch((err: Error) => {
                console.error(err);
                showAlert("Sorry, could not download the image. Please try again.");
            })
            .finally(() => setIsDownloading(false));
    };

    if (!achievement) return null;

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 rounded-2xl shadow-xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 animate-scale-up space-y-6">
                <div className="w-full"><AchievementBanner achievement={achievement} ref={bannerRef} /></div>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={handleDownload} disabled={isDownloading} className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all disabled:bg-blue-400"><Download className="mr-2 h-5 w-5" />{isDownloading ? 'Downloading...' : 'Download PNG'}</button>
                    <button onClick={onClose} className="w-full sm:w-auto bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 font-bold py-3 px-6 rounded-lg transition-colors">Close</button>
                </div>
            </div>
        </div>
    );
};
