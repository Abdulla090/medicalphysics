import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface BookmarkItem {
    id: string;
    type: 'lesson' | 'article' | 'course' | 'tool';
    title: string;
    path: string;
    savedAt: number;
}

interface BookmarkContextType {
    bookmarks: BookmarkItem[];
    addBookmark: (item: Omit<BookmarkItem, 'savedAt'>) => void;
    removeBookmark: (id: string) => void;
    isBookmarked: (id: string) => boolean;
    toggleBookmark: (item: Omit<BookmarkItem, 'savedAt'>) => void;
    clearBookmarks: () => void;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

const STORAGE_KEY = 'medphysics_bookmarks';

const loadBookmarks = (): BookmarkItem[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveBookmarks = (bookmarks: BookmarkItem[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    } catch {
        // storage full or unavailable
    }
};

export const BookmarkProvider = ({ children }: { children: ReactNode }) => {
    const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(loadBookmarks);

    // Persist on change
    useEffect(() => {
        saveBookmarks(bookmarks);
    }, [bookmarks]);

    const addBookmark = useCallback((item: Omit<BookmarkItem, 'savedAt'>) => {
        setBookmarks((prev) => {
            if (prev.some((b) => b.id === item.id)) return prev;
            return [...prev, { ...item, savedAt: Date.now() }];
        });
    }, []);

    const removeBookmark = useCallback((id: string) => {
        setBookmarks((prev) => prev.filter((b) => b.id !== id));
    }, []);

    const isBookmarked = useCallback(
        (id: string) => bookmarks.some((b) => b.id === id),
        [bookmarks]
    );

    const toggleBookmark = useCallback(
        (item: Omit<BookmarkItem, 'savedAt'>) => {
            if (bookmarks.some((b) => b.id === item.id)) {
                removeBookmark(item.id);
            } else {
                addBookmark(item);
            }
        },
        [bookmarks, addBookmark, removeBookmark]
    );

    const clearBookmarks = useCallback(() => {
        setBookmarks([]);
    }, []);

    return (
        <BookmarkContext.Provider
            value={{ bookmarks, addBookmark, removeBookmark, isBookmarked, toggleBookmark, clearBookmarks }}
        >
            {children}
        </BookmarkContext.Provider>
    );
};

export const useBookmarks = () => {
    const context = useContext(BookmarkContext);
    if (!context) {
        throw new Error('useBookmarks must be used within a BookmarkProvider');
    }
    return context;
};

export type { BookmarkItem };
export default BookmarkContext;
