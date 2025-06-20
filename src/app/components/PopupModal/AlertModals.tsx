import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";


interface AlertModalProp {
    isOpen: boolean,
    onClose: (event: React.MouseEvent<HTMLElement>) => void,
    message: string,
}

interface ConfirmModalProp {
    isOpen: boolean,
    onClose: (event: React.MouseEvent<HTMLElement>) => void,
    message: string,
    title: string,
    onConfirm: () => void
}

export const AlertModal = ({ isOpen, onClose, message }: AlertModalProp) => {

    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Alert">
            <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
            <button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg">OK</button>
        </Modal>
    );
};

export const ConfirmationModal = ({ isOpen, onClose, title, message, onConfirm }: ConfirmModalProp) => {
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-800/50">
                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                </div>
                <p className="text-gray-600 dark:text-gray-300 my-4">{message}</p>
                <div className="flex justify-center space-x-4">
                    <button onClick={onClose} className="w-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-black dark:text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                    <button
                        onClick={(e) => {
                            onConfirm();
                            onClose(e);
                        }}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </Modal>
    );
};