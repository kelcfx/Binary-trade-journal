'use client';
import { Book, Calendar, ChevronsUp, DollarSign, LogOut, Map, Moon, Settings, Sun, Target, TrendingUp, Trophy, X } from "lucide-react";
import { Dispatch, SetStateAction } from "react";
import { User } from "firebase/auth";


interface SidebarProps {
    activeView: string,
    setActiveView: Dispatch<SetStateAction<string>>,
    user: User,
    handleLogout: () => void,
    theme?: string,
    setTheme: (theme: string) => void,
    isSidebarOpen: boolean,
    setIsSidebarOpen: Dispatch<SetStateAction<boolean>>,
}

export const Sidebar = ({ activeView, setActiveView, user, handleLogout, theme, setTheme, isSidebarOpen, setIsSidebarOpen }: SidebarProps) => {

    const navItems = [
        { name: 'Dashboard', icon: <TrendingUp className="w-5 h-5" /> },
        { name: 'Trade Logs', icon: <Book className="w-5 h-5" /> },
        { name: 'Trophy Room', icon: <Trophy className="w-5 h-5" /> },
        { name: 'Performance', icon: <ChevronsUp className="w-5 h-5" /> },
        { name: 'Plan', icon: <Map className="w-5 h-5" /> },
        { name: 'Goals', icon: <Target className="w-5 h-5" /> },
        { name: 'Transactions', icon: <DollarSign className="w-5 h-5" /> },
        { name: 'Calendar', icon: <Calendar className="w-5 h-5" /> },
        { name: 'Journal Manager', icon: <Settings className="w-5 h-5" /> },
    ];

    const handleNavClick = (viewName: string) => {
        setActiveView(viewName);
        setIsSidebarOpen(false); // Close sidebar on mobile after navigation
    };

    return (
        <>
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity lg:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={() => setIsSidebarOpen(false)}
            ></div>
            <nav className={`w-64 bg-white dark:bg-gray-900 p-4 flex flex-col justify-between border-r border-gray-200 dark:border-gray-800 
                             fixed h-full z-40 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
                             ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col flex-grow min-h-0">
                    <div className="flex-shrink-0">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center">
                                <img src={user.photoURL || `https://placehold.co/40x40/374151/E5E7EB?text=${(user.displayName || 'G').charAt(0)}`} alt="User" className="w-10 h-10 rounded-full mr-3" />
                                <div>
                                    <h2 className="font-semibold text-md text-gray-800 dark:text-gray-200">{user.displayName || 'Guest User'}</h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[150px] truncate" title={user.uid}>{user.uid}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-gray-500 dark:text-gray-400 rounded-md">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto">
                        <ul>
                            {navItems.map(item => (
                                <li key={item.name} className="mb-2">
                                    <button
                                        onClick={() => handleNavClick(item.name)}
                                        className={`flex items-center w-full p-3 rounded-lg transition-all duration-200 ${activeView === item.name
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        {item.icon}
                                        <span className="ml-4 font-medium">{item.name}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="flex-shrink-0 space-y-2">
                    <div className="flex items-center justify-center space-x-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <button onClick={() => setTheme('light')} className={`p-2 rounded-md ${theme === 'light' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}><Sun size={18} /></button>
                        <button onClick={() => setTheme('dark')} className={`p-2 rounded-md ${theme === 'dark' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}><Moon size={18} /></button>
                        <button onClick={() => setTheme('auto')} className={`p-2 rounded-md ${theme === 'auto' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Auto</button>
                    </div>
                    <button onClick={handleLogout} className="flex items-center w-full p-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <LogOut className="w-5 h-5" />
                        <span className="ml-4 font-medium">Logout</span>
                    </button>
                </div>
            </nav>
        </>
    );
};