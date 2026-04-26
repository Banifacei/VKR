import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '../context/SearchContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';
import { Icons } from './Icons';
import { UserOverviewPanel } from './UserOverviewPanel';
import './GlobalSearch.css';

interface Course  { id: number; title: string; instructor?: string; coverImage?: string }
interface Video   { id: number; title: string; courseId: number; course?: { title: string } }
interface Test    { id: number; title: string; courseId: number; course?: { title: string } }
interface UserRes { id: number; firstName: string; lastName: string; email: string; role: string; avatarUrl?: string }

interface SearchResults {
    courses: Course[];
    videos: Video[];
    tests: Test[];
    users: UserRes[];
}

type ResultItem =
    | (Course  & { _type: 'course' })
    | (Video   & { _type: 'video' })
    | (Test    & { _type: 'test' })
    | (UserRes & { _type: 'user' });

const EMPTY: SearchResults = { courses: [], videos: [], tests: [], users: [] };

export const GlobalSearch = () => {
    const { isOpen, closeSearch } = useSearch();
    useAuth();
    const navigate = useNavigate();

    const [query, setQuery]           = useState('');
    const [results, setResults]       = useState<SearchResults>(EMPTY);
    const [loading, setLoading]       = useState(false);
    const [activeIdx, setActiveIdx]   = useState(0);
    const [overviewUserId, setOverviewUserId] = useState<number | null>(null);

    const inputRef   = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<number>(0);

    // Flat list for keyboard navigation
    const allItems: ResultItem[] = [
        ...results.courses.map(r => ({ ...r, _type: 'course' as const })),
        ...results.videos .map(r => ({ ...r, _type: 'video'  as const })),
        ...results.tests  .map(r => ({ ...r, _type: 'test'   as const })),
        ...results.users  .map(r => ({ ...r, _type: 'user'   as const })),
    ];

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults(EMPTY);
            setActiveIdx(0);
            setTimeout(() => inputRef.current?.focus(), 40);
        }
    }, [isOpen]);

    // Lock body scroll when open
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const doSearch = useCallback(async (q: string) => {
        if (q.length < 2) { setResults(EMPTY); return; }
        setLoading(true);
        try {
            const res = await api.get<SearchResults>(`/search?q=${encodeURIComponent(q)}`);
            setResults(res.data);
            setActiveIdx(0);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(val), 280);
    };

    const goTo = useCallback((item: ResultItem) => {
        switch (item._type) {
            case 'course': closeSearch(); navigate(`/course/${item.id}`); break;
            case 'video':  closeSearch(); navigate(`/course/${item.courseId}?lessonId=${item.id}`); break;
            case 'test':   closeSearch(); navigate(`/course/${item.courseId}`); break;
            case 'user':
                // Не закрываем поиск — открываем панель поверх него
                setOverviewUserId(item.id);
                break;
        }
    }, [closeSearch, navigate]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx(i => Math.min(i + 1, allItems.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && allItems[activeIdx]) {
            goTo(allItems[activeIdx]);
        } else if (e.key === 'Escape') {
            if (overviewUserId !== null) {
                setOverviewUserId(null);
            } else {
                closeSearch();
            }
        }
    };

    if (!isOpen) return null;

    const hasResults = allItems.length > 0;
    const showHint   = query.length < 2;

    // Helper: global flat index for each section
    const offset = (section: 'courses' | 'videos' | 'tests' | 'users') => {
        if (section === 'courses') return 0;
        if (section === 'videos')  return results.courses.length;
        if (section === 'tests')   return results.courses.length + results.videos.length;
        return results.courses.length + results.videos.length + results.tests.length;
    };

    return (
        <>
        <div className="gs-overlay" onClick={overviewUserId ? undefined : closeSearch}>
            <div className="gs-modal" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>

                {/* ── Input row ── */}
                <div className="gs-input-row">
                    <Icons.Search size={16} color="#666" />
                    <input
                        ref={inputRef}
                        className="gs-input"
                        placeholder="Поиск курсов, уроков, тестов, пользователей..."
                        value={query}
                        onChange={handleChange}
                        autoComplete="off"
                        spellCheck={false}
                    />
                    {loading
                        ? <Icons.Spinner size={14} color="#666" />
                        : <kbd className="gs-esc-key" onClick={closeSearch}>Esc</kbd>
                    }
                </div>

                {/* ── Results ── */}
                {!showHint && (
                    <div className="gs-body">
                        {!hasResults && !loading && (
                            <div className="gs-empty">Ничего не найдено по запросу «{query}»</div>
                        )}

                        {results.courses.length > 0 && (
                            <Section label="Курсы">
                                {results.courses.map((item, i) => (
                                    <Item
                                        key={`c-${item.id}`}
                                        icon={<Icons.Monitor size={14} />}
                                        title={item.title}
                                        sub={item.instructor}
                                        active={activeIdx === offset('courses') + i}
                                        onClick={() => goTo({ ...item, _type: 'course' })}
                                        onHover={() => setActiveIdx(offset('courses') + i)}
                                    />
                                ))}
                            </Section>
                        )}

                        {results.videos.length > 0 && (
                            <Section label="Видео-уроки">
                                {results.videos.map((item, i) => (
                                    <Item
                                        key={`v-${item.id}`}
                                        icon={<Icons.Video size={14} />}
                                        title={item.title}
                                        sub={item.course?.title ? `в курсе: ${item.course.title}` : undefined}
                                        active={activeIdx === offset('videos') + i}
                                        onClick={() => goTo({ ...item, _type: 'video' })}
                                        onHover={() => setActiveIdx(offset('videos') + i)}
                                    />
                                ))}
                            </Section>
                        )}

                        {results.tests.length > 0 && (
                            <Section label="Тесты">
                                {results.tests.map((item, i) => (
                                    <Item
                                        key={`t-${item.id}`}
                                        icon={<Icons.Test size={14} />}
                                        title={item.title}
                                        sub={item.course?.title ? `в курсе: ${item.course.title}` : undefined}
                                        active={activeIdx === offset('tests') + i}
                                        onClick={() => goTo({ ...item, _type: 'test' })}
                                        onHover={() => setActiveIdx(offset('tests') + i)}
                                    />
                                ))}
                            </Section>
                        )}

                        {results.users.length > 0 && (
                            <Section label="Пользователи">
                                {results.users.map((item, i) => (
                                    <Item
                                        key={`u-${item.id}`}
                                        icon={
                                            item.avatarUrl
                                                ? <img src={item.avatarUrl} alt="" className="gs-avatar" />
                                                : <Icons.User size={14} />
                                        }
                                        title={`${item.firstName} ${item.lastName}`}
                                        sub={`${item.email} · ${item.role}`}
                                        active={activeIdx === offset('users') + i}
                                        onClick={() => goTo({ ...item, _type: 'user' })}
                                        onHover={() => setActiveIdx(offset('users') + i)}
                                    />
                                ))}
                            </Section>
                        )}
                    </div>
                )}

                {/* ── Hint footer ── */}
                <div className="gs-footer">
                    {showHint
                        ? 'Введите минимум 2 символа для поиска'
                        : <><kbd>↑↓</kbd> навигация &nbsp;·&nbsp; <kbd>Enter</kbd> открыть &nbsp;·&nbsp; <kbd>Esc</kbd> закрыть</>
                    }
                </div>
            </div>

        </div>

            {/* Панель профиля — рендерится ВНЕ gs-overlay, чтобы клик по бэкдропу не закрывал поиск */}
            <UserOverviewPanel
                userId={overviewUserId}
                onClose={() => setOverviewUserId(null)}
            />
        </>
    );
};

// ── Small helpers ──────────────────────────────────────────────────────────────

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="gs-section">
        <div className="gs-section-label">{label}</div>
        {children}
    </div>
);

const Item = ({ icon, title, sub, active, onClick, onHover }: {
    icon: React.ReactNode;
    title: string;
    sub?: string;
    active: boolean;
    onClick: () => void;
    onHover: () => void;
}) => (
    <div
        className={`gs-item${active ? ' active' : ''}`}
        onClick={onClick}
        onMouseEnter={onHover}
    >
        <span className="gs-item-icon">{icon}</span>
        <div className="gs-item-text">
            <span className="gs-item-title">{title}</span>
            {sub && <span className="gs-item-sub">{sub}</span>}
        </div>
        <span className="gs-item-arrow">↗</span>
    </div>
);
