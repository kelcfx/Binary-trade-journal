import { ReactNode } from "react";

interface ModalProp {
    isOpen: boolean,
    onClose: () => void,
    title: string,
    children?: ReactNode,
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProp) => {
    if (!isOpen) return null;
    return (
        <div onClick={onClose} className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-lg border border-gray-200 dark:border-gray-700 animate-scale-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 dark:hover:text-white text-3xl leading-none">&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
};