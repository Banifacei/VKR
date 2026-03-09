import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    course: any;
    analytics: any;
    exportType: 'gost' | 'detailed' | null;
}

export const ExportModal = ({ isOpen, onClose, course, analytics, exportType }: ExportModalProps) => {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [group, setGroup] = useState('');
    const [semester, setSemester] = useState('');
    const [gradingType, setGradingType] = useState<'5-point' | 'pass-fail' | 'points'>('5-point');

    if (!isOpen || !course || !analytics) return null;

    // Авто-конвертер оценок
    const getGrade = (score: number) => {
        if (gradingType === 'points') return '';
        if (gradingType === 'pass-fail') return score >= 60 ? 'Зачтено' : 'Не зачтено';
        
        // 5-балльная шкала
        if (score >= 85) return 'Отлично (5)';
        if (score >= 70) return 'Хорошо (4)';
        if (score >= 50) return 'Удовл. (3)';
        return 'Неуд. (2)';
    };

    const handleExport = () => {
        if (exportType === 'gost') {
            generateGostExcel();
        } else {
            generateDetailedExcel();
        }
    };

    const generateGostExcel = () => {
        try {
            // 1. Формируем массив данных построчно
            const data: any[][] = [
                ['ВЕДОМОСТЬ УСПЕВАЕМОСТИ'], // A1
                [`Дисциплина: ${course.title}`], // A2
                [`Преподаватель: ${user?.lastName} ${user?.firstName}`], // A3
                [`Учебная группа: ${group || '________'}`, `Семестр: ${semester || '________'}`], // A4, B4
                [], // Пустая строка
                ['№ п/п', 'ФИО студента', 'Прогресс по курсу', 'Оценка', 'Подпись преподавателя'] // Шапка таблицы
            ];

            // 2. Добавляем студентов
            analytics.studentsProgress.forEach((student: any, index: number) => {
                data.push([
                    index + 1,
                    student.name,
                    `${student.avgScore}%`,
                    getGrade(student.avgScore),
                    '' // Пустое место для подписи
                ]);
            });

            // 3. Создаем книгу и лист
            const ws = XLSX.utils.aoa_to_sheet(data);
            const wb = XLSX.utils.book_new();

            // 4. Наводим красоту (ширина колонок)
            ws['!cols'] = [
                { wch: 8 },  // №
                { wch: 35 }, // ФИО
                { wch: 18 }, // Прогресс
                { wch: 18 }, // Оценка
                { wch: 25 }, // Подпись
            ];

            // Объединяем ячейки для заголовков (чтобы было как в Word)
            ws['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // ВЕДОМОСТЬ УСПЕВАЕМОСТИ (по центру)
                { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // Дисциплина
                { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }, // Преподаватель
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'Ведомость ГОСТ');
            XLSX.writeFile(wb, `Ведомость_${course.title}_${group || 'Отчет'}.xlsx`);
            
            showToast('Ведомость по ГОСТу успешно скачана!', 'success');
            onClose();
        } catch (e) {
            console.error(e);
            showToast('Ошибка при генерации Excel', 'error');
        }
    };

    const generateDetailedExcel = () => {
        try {
            // Исправленная часть без экранированных переносов строк!
            const data = analytics.studentsProgress.map((student: any) => ({
                'ФИО студента': student.name,
                'Email': student.email,
                'Последний вход': student.lastLogin ? new Date(student.lastLogin).toLocaleDateString('ru-RU') : 'Никогда',
                'Прогресс (%)': student.progressPercent,
                'Средний балл тестов (%)': student.avgScore
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            
            ws['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 25 }];
            
            XLSX.utils.book_append_sheet(wb, ws, 'Детальная аналитика');
            XLSX.writeFile(wb, `Аналитика_${course.title}.xlsx`);
            
            showToast('Детальный отчет скачан', 'success');
            onClose();
        } catch (e) {
            console.error(e);
            showToast('Ошибка при генерации Excel', 'error');
        }
    };

    return (
        <div className="test-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
            <div className="test-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', padding: '30px' }}>
                <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '22px' }}>
                    {exportType === 'gost' ? '🖨️ Настройка ведомости' : '📥 Детальный отчет'}
                </h2>
                
                {exportType === 'gost' && (
                    <>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#888', fontSize: '13px' }}>Учебная группа (необязательно)</label>
                            <input className="modern-input" placeholder="Например: И-121" value={group} onChange={e => setGroup(e.target.value)} />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#888', fontSize: '13px' }}>Семестр (необязательно)</label>
                            <input className="modern-input" placeholder="Например: Осенний 2026" value={semester} onChange={e => setSemester(e.target.value)} />
                        </div>
                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ display: 'block', marginBottom: '12px', color: '#888', fontSize: '13px' }}>Формат оценивания</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                    <input type="radio" name="grading" checked={gradingType === '5-point'} onChange={() => setGradingType('5-point')} />
                                    <span>5-балльная шкала (Отл/Хор/Удовл/Неуд)</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                    <input type="radio" name="grading" checked={gradingType === 'pass-fail'} onChange={() => setGradingType('pass-fail')} />
                                    <span>Зачет / Незачет</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                    <input type="radio" name="grading" checked={gradingType === 'points'} onChange={() => setGradingType('points')} />
                                    <span>Оставить пустой колонку (только баллы)</span>
                                </label>
                            </div>
                        </div>
                    </>
                )}

                {exportType === 'detailed' && (
                    <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '25px', lineHeight: '1.5' }}>
                        Будет сгенерирована таблица со списком всех студентов, их email-адресами, датой последнего входа и детальной успеваемостью. Подходит для работы в Excel.
                    </p>
                )}

                <div style={{ display: 'flex', gap: '15px' }}>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Отмена</button>
                    <button className="btn btn-primary" style={{ flex: 1, background: exportType === 'gost' ? '#00aeef' : '#4dff88', color: exportType === 'gost' ? '#fff' : '#000' }} onClick={handleExport}>
                        Скачать .xlsx
                    </button>
                </div>
            </div>
        </div>
    );
};