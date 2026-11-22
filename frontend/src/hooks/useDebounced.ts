import { useEffect, useState } from 'react';

/**
 * Search is now a server query, so the raw input value cannot drive it directly -
 * that would fire a request per keystroke. The input stays controlled and
 * instant; only the value the query key reads is delayed.
 */
export const useDebounced = <T,>(value: T, delayMs = 300): T => {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(timer);
    }, [value, delayMs]);

    return debounced;
};
