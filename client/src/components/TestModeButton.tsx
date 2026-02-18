interface TestModeButtonProps {
    isExternalMode: boolean;
    onToggle: () => void;
}

export const TestModeButton = ({ isExternalMode, onToggle }: TestModeButtonProps) => {
    return (
        <div className="menu-item" onClick={onToggle}>
            <span className="menu-label">
                {isExternalMode ? '🎬 Решить тест в видео' : '📝 Решить тест отдельно'}
            </span>
            <span className="menu-value">›</span>
        </div>
    );
};