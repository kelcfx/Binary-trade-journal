// import { Timestamp } from "firebase/firestore";

export const getStartOfDay = (date: Date) => { 
    const d = new Date(date); 
    d.setHours(0, 0, 0, 0); 
    return d; 
};

export const getEndOfDay = (date: Date) => { 
    const d = new Date(date);
    d.setHours(23, 59, 59, 999); 
    return d; 
};

export const getStartOfWeek = (date: Date) => { 
    const d = new Date(date); 
    const day = d.getDay(); 
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(d.setDate(diff)); 
};

export const getEndOfWeek = (date: Date) => { 
    const d = new Date(getStartOfWeek(date)); 
    d.setDate(d.getDate() + 6); 
    d.setHours(23, 59, 59, 999); 
    return d; 
};

export const getStartOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

export const getEndOfMonth = (date: Date) => { 
    const d = new Date(date.getFullYear(), date.getMonth() + 1, 0); 
    d.setHours(23, 59, 59, 999); 
    return d; 
};

export const getStartOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1);

export const getEndOfYear = (date: Date) => { 
    const d = new Date(date.getFullYear(), 11, 31); 
    d.setHours(23, 59, 59, 999);
    return d; 
};

export const getWeekOfMonth = (date: Date) => { 
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay(); 
    return Math.ceil((date.getDate() + firstDay) / 7); 
};

export const getOrdinalSuffix = (i: number) => { 
    const j = i % 10, k = i % 100; if (j === 1 && k !== 11) return "st"; 
    if (j === 2 && k !== 12) return "nd"; 
    if (j === 3 && k !== 13) return "rd"; 
    return "th"; 
};