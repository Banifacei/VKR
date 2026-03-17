import { Icons } from './Icons';

interface TestModeButtonProps {
    isExternalMode: boolean;
    onToggle: () => void;
}

export const TestModeButton = ({ isExternalMode, onToggle }: TestModeButtonProps) => {
    return (
        <div className="menu-item" onClick={onToggle}>
            <span className="menu-label">
                {isExternalMode
                    ? <><Icons.Monitor size={14}/> Решить тест в видео</>
                    : <><Icons.FileText size={14}/> Решить тест отдельно</>
                }
            </span>
            <span className="menu-value">›</span>
        </div>
    );
};