interface StatCardProps {
    title: string;
    value: string | number;
    prefix?: string;
    suffix?: string;
}

export const StatCard = ({ title, value, prefix = '', suffix = '' }: StatCardProps) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center flex flex-col justify-center">
        <h4 className="text-gray-500 dark:text-gray-400 font-medium text-sm truncate">{title}</h4>
        <p className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200 break-words">{prefix}{value}{suffix}</p>
    </div>
);