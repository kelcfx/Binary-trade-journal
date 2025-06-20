import { GoogleAuthProvider, signInAnonymously, signInWithPopup } from "firebase/auth";
import { Trophy, User } from "lucide-react";
import { auth } from "../lib/firebaseConfig";

interface LoginProp {
    showAlert: (message: string) => void;
}

export const LoginScreen = ({ showAlert }: LoginProp) => {
    const handleSignIn = async (providerName: string) => {
        let provider;
        if (providerName === 'google') {
            provider = new GoogleAuthProvider();
        } else {
            return;
        }

        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error(`Error signing in with ${providerName}`, error);
            const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: string }).code : "unknown";
            showAlert(`Could not sign in with ${providerName}. Please try again. Code: ${code}`);
        }
    };

    const handleGuestSignIn = async () => {
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error('Error signing in as guest', error);
            const code = typeof error === "object" && error !== null && "code" in error ? (error as { code?: string }).code : "unknown";
            showAlert(`Could not sign in as guest. Please try again. Code: ${code}`);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-950">
            <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
                <div className="text-center">
                    <Trophy className="mx-auto h-12 w-12 text-blue-600" />
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mt-2">Trading Journal</h1>
                    <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">Your professional suite for tracking trades and celebrating success.</p>
                </div>
                <div className="space-y-4">
                    <button onClick={() => handleSignIn('google')} className="w-full flex items-center justify-center px-8 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 8.841C34.553 4.806 29.625 2.5 24 2.5C11.936 2.5 2.5 11.936 2.5 24S11.936 45.5 24 45.5c11.498 0 20.44-8.522 20.44-19.516c0-1.346-.138-2.658-.389-3.95z" /></svg>
                        Sign in with Google
                    </button>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">Or</span>
                        </div>
                    </div>
                    <button onClick={handleGuestSignIn} className="w-full flex items-center justify-center px-8 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 transition-colors">
                        <User className="w-5 h-5 mr-2" />
                        Sign in as Guest
                    </button>
                </div>
            </div>
        </div>
    );
};