import { ReactNode } from "react";

interface ModalProp {
    isOpen: boolean,
    onClose: (event: React.MouseEvent<HTMLElement>) => void,
    title: string,
    children?: ReactNode,
    theme?: string,
    isSystemDark: boolean
}

export const Modal = ({ isOpen, onClose, title, children, theme, isSystemDark }: ModalProp) => {
    if (!isOpen) return null;
    return (
        <div onClick={onClose} className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div onClick={(e) => e.stopPropagation()} className={`p-8 rounded-2xl shadow-xl w-full max-w-lg border animate-scale-up ${theme === "dark" || isSystemDark ? "dark:bg-gray-800 dark:border-gray-700" : "bg-white border-gray-200"}`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className={`text-2xl font-bold ${theme === "dark" || isSystemDark ? "dark:text-gray-200" : "text-gray-800"}`}>{title}</h2>
                    <button onClick={onClose} className={`text-gray-400 text-3xl leading-none ${theme === "dark" || isSystemDark ? "dark:hover:text-white" : "hover:text-gray-800"}`}>&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
};