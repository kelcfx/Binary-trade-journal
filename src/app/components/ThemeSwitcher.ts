// hooks/useCustomTheme.ts
import { useTheme as useNextTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const useCustomTheme = () => {
    const { theme: nextTheme, setTheme: setNextTheme } = useNextTheme();
    const [theme, setTheme] = useState(nextTheme);

    useEffect(() => {
        setTheme(nextTheme);
    }, [nextTheme]);

    const setCustomTheme = (theme: string) => {
        setNextTheme(theme);
    };

    return [theme, setCustomTheme];
};

export default useCustomTheme;
