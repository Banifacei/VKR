import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface SearchContextType {
    isOpen: boolean;
    openSearch: () => void;
    closeSearch: () => void;
}

const SearchContext = createContext<SearchContextType>({
    isOpen: false,
    openSearch: () => {},
    closeSearch: () => {},
});

export const useSearch = () => useContext(SearchContext);

export const SearchProvider = ({ children }: { children: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);

    const openSearch = useCallback(() => setIsOpen(true), []);
    const closeSearch = useCallback(() => setIsOpen(false), []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === '/' || e.code === 'Slash')) {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);

    return (
        <SearchContext.Provider value={{ isOpen, openSearch, closeSearch }}>
            {children}
        </SearchContext.Provider>
    );
};
