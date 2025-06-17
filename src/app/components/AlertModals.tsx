import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { useTheme } from "next-themes";


interface AlertModalProp {
    isOpen: boolean,
    onClose: (event: React.MouseEvent<HTMLElement>) => void,
    message: string,
    theme?: string,
    isSystemDark: boolean
}

interface ConfirmModalProp {
    isOpen: boolean,
    onClose: (event: React.MouseEvent<HTMLElement>) => void,
    message: string,
    title: string,
    onConfirm: () => void
}

export const AlertModal = ({ isOpen, onClose, message, theme, isSystemDark }: AlertModalProp) => {

    if (!isOpen) return null;
    return (
        <Modal theme={theme} isSystemDark={isSystemDark}  isOpen={isOpen} onClose={onClose} title="Alert">
            <p className={`  mb-6 ${theme === "dark" || isSystemDark ? "dark:text-gray-300" : "text-gray-600"}`}>{message}</p>
            <button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg">OK</button>
        </Modal>
    );
};

export const ConfirmationModal = ({ isOpen, onClose, title, message, onConfirm }: ConfirmModalProp) => {
    const { theme } = useTheme();
    const isSystemDark = theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (!isOpen) return null;

    return (
        <Modal theme={theme} isSystemDark={isSystemDark} isOpen={isOpen} onClose={onClose} title={title}>
            <div className="text-center">
                <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full  ${theme === "dark" || isSystemDark ? "dark:bg-red-800/50" : "bg-red-100"} `}>
                    <AlertTriangle className={`h-6 w-6 ${theme === "dark" || isSystemDark ? "dark:text-red-400" : "text-red-600" }`} aria-hidden="true" />
                </div>
                <p className={`${theme === "dark" || isSystemDark ? "dark:text-gray-300" : "text-gray-600"} my-4`}>{message}</p>
                <div className="flex justify-center space-x-4">
                    <button onClick={onClose} className={`w-full ${theme === "dark" || isSystemDark ? "dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white" : "bg-gray-200  hover:bg-gray-300 text-black"} font-bold py-2 px-4 rounded-lg`}>Cancel</button>
                    <button onClick={(event) => { onConfirm(); onClose(event); }} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Confirm</button>
                </div>
            </div>
        </Modal>
    );
};