import { useState } from 'react';
import api from '../../api/axiosInstance';
import { Icons } from '../Icons';
import { useToast } from '../../context/ToastContext';
import { AddVideoForm } from '../AddVideoForm';
import { DateTimePicker } from '../DateTimePicker';

interface AddContentModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: number;
    nextOrderIndex: number;
    onSuccess: (newItem?: any) => void;
}

const EMPTY_TEST = { title: '', description: '', passingScore: 80, maxAttempts: 3 };

const psError = (v: number) => v < 0 || v > 100 ? 'от 0 до 100' : '';
const maError = (v: number) => v < 0 ? 'не может быть отрицательным' : '';

const EMPTY_HW = { title: '', deadline: null as string | null };
const CODE_LANGUAGES = [
    { id: 'python', label: 'Python' },
    { id: 'javascript', label: 'JavaScript' },
    { id: 'typescript', label: 'TypeScript' },
    { id: 'java', label: 'Java' },
    { id: 'c', label: 'C' },
    { id: 'c++', label: 'C++' },
];
const EMPTY_CODE = { title: '', deadline: null as string | null, allowedCodeLanguages: [] as string[] };

export const AddContentModal = ({ isOpen, onClose, courseId, nextOrderIndex, onSuccess }: AddContentModalProps) => {
    const { showToast } = useToast();
    const [modalView, setModalView] = useState<'select' | 'create_test' | 'create_video' | 'create_hw' | 'create_code'>('select');
    const [newTestData, setNewTestData] = useState(EMPTY_TEST);
    const [newHwData, setNewHwData] = useState(EMPTY_HW);
    const [newCodeData, setNewCodeData] = useState(EMPTY_CODE);
    const [touched, setTouched] = useState({ passingScore: false, maxAttempts: false });
    const [isCreating, setIsCreating] = useState(false);

    if (!isOpen) return null;

    const handleClose = () => {
        setModalView('select');
        setNewTestData(EMPTY_TEST);
        setNewHwData(EMPTY_HW);
        setNewCodeData(EMPTY_CODE);
        setTouched({ passingScore: false, maxAttempts: false });
        onClose();
    };

    const handleCreateCode = async () => {
        if (!newCodeData.title.trim()) return showToast('Введите название задания', 'error');
        if (!newCodeData.deadline) return showToast('Укажите дедлайн', 'error');
        setIsCreating(true);
        try {
            const r = await api.post('/hw/', {
                courseId, title: newCodeData.title,
                deadline: newCodeData.deadline,
                orderIndex: nextOrderIndex,
                type: 'code',
                allowCodeSubmission: true,
                allowedCodeLanguages: newCodeData.allowedCodeLanguages,
            });
            showToast('Код-задание создано!', 'success');
            onSuccess(r.data);
            handleClose();
        } catch {
            showToast('Ошибка при создании', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleCreateHw = async () => {
        if (!newHwData.title.trim()) return showToast('Введите название задания', 'error');
        if (!newHwData.deadline) return showToast('Укажите дедлайн', 'error');
        setIsCreating(true);
        try {
            const r = await api.post('/hw/', {
                courseId, title: newHwData.title,
                deadline: newHwData.deadline,
                orderIndex: nextOrderIndex,
            });
            showToast('Домашнее задание создано!', 'success');
            onSuccess(r.data);
            handleClose();
        } catch {
            showToast('Ошибка при создании задания', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const psErr = touched.passingScore ? psError(newTestData.passingScore) : '';
    const maErr = touched.maxAttempts ? maError(newTestData.maxAttempts) : '';
    const isFormValid = !psError(newTestData.passingScore) && !maError(newTestData.maxAttempts) && newTestData.title.trim();

    const handleCreateTest = async () => {
        setTouched({ passingScore: true, maxAttempts: true });
        if (!newTestData.title.trim()) return showToast('Введите название теста!', 'error');
        if (psError(newTestData.passingScore) || maError(newTestData.maxAttempts)) return;
        setIsCreating(true);
        try {
            await api.post(`/tests/courses/${courseId}`, { ...newTestData, orderIndex: nextOrderIndex });
            showToast('Тест успешно создан!', 'success');
            onSuccess();
            handleClose();
        } catch (e) {
            console.error(e);
            showToast('Ошибка при создании теста', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const fieldStyle = (err: string) => ({
        borderColor: err ? '#ff4d4d' : undefined,
        outline: err ? '1px solid #ff4d4d' : undefined,
    });

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }} onClick={handleClose}>

            <div
                style={{ background: 'var(--bg-panel)', padding: 'clamp(20px, 4vw, 30px)', borderRadius: '16px', border: '1px solid var(--border-color)', width: 'calc(100% - 32px)', maxWidth: '400px', animation: 'fadeIn 0.2s ease' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ЭКРАН 1: ВЫБОР */}
                {modalView === 'select' && (
                    <>
                        <h2 style={{color: 'var(--text-main)', marginBottom: '25px', marginTop: 0, textAlign: 'center'}}>Что добавим в курс?</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <button
                                onClick={() => setModalView('create_video')}
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '15px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', transition: '0.2s' }}
                            >
                                <Icons.Monitor size={24}/>
                                <div style={{textAlign: 'left'}}>
                                    <div style={{fontWeight: 'bold'}}>Видео-урок</div>
                                    <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>Добавить обучающее видео</div>
                                </div>
                            </button>

                            <button
                                onClick={() => setModalView('create_test')}
                                style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.3)', color: 'var(--text-main)', padding: '15px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', transition: '0.2s' }}
                            >
                                <Icons.FileText size={24}/>
                                <div style={{textAlign: 'left'}}>
                                    <div style={{fontWeight: 'bold', color: '#ffd700'}}>Тест</div>
                                    <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>Проверка знаний</div>
                                </div>
                            </button>

                            <button
                                onClick={() => setModalView('create_hw')}
                                style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', color: 'var(--text-main)', padding: '15px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', transition: '0.2s' }}
                            >
                                <Icons.Upload size={24} color="#a78bfa"/>
                                <div style={{textAlign: 'left'}}>
                                    <div style={{fontWeight: 'bold', color: '#a78bfa'}}>Задание</div>
                                    <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>Сдача файлов студентами</div>
                                </div>
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
                                <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>с кодом</span>
                                <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                            </div>

                            <button
                                onClick={() => setModalView('create_code')}
                                style={{ background: 'rgba(8,145,178,0.08)', border: '1px solid rgba(8,145,178,0.25)', color: 'var(--text-main)', padding: '15px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', transition: '0.2s' }}
                            >
                                <Icons.Code size={24} color="#22d3ee"/>
                                <div style={{textAlign: 'left'}}>
                                    <div style={{fontWeight: 'bold', color: '#22d3ee'}}>Код-задание</div>
                                    <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>Редактор кода + запуск</div>
                                </div>
                            </button>
                        </div>
                    </>
                )}

                {/* ЭКРАН 2: ФОРМА СОЗДАНИЯ ТЕСТА */}
                {modalView === 'create_test' && (
                    <>
                        <h2 style={{color: 'var(--text-main)', marginBottom: '20px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.FileText size={20}/> Новый тест</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <input
                                type="text" placeholder="Название теста" className="modern-input"
                                value={newTestData.title} onChange={e => setNewTestData({...newTestData, title: e.target.value})}
                            />
                            <textarea
                                placeholder="Краткое описание" className="modern-textarea" style={{ minHeight: '80px' }}
                                value={newTestData.description} onChange={e => setNewTestData({...newTestData, description: e.target.value})}
                            />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px', color: psErr ? '#ff4d4d' : 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                        Проходной балл (%)
                                    </label>
                                    <input
                                        type="number" className="modern-input"
                                        min="0" max="100"
                                        style={fieldStyle(psErr)}
                                        value={newTestData.passingScore}
                                        onChange={e => setNewTestData({...newTestData, passingScore: Number(e.target.value)})}
                                        onBlur={() => setTouched(t => ({...t, passingScore: true}))}
                                    />
                                    {psErr && <span style={{ fontSize: '11px', color: '#ff4d4d', marginTop: '3px', display: 'block' }}>⚠ {psErr}</span>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px', color: maErr ? '#ff4d4d' : 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                        Попытки (0 = ∞)
                                    </label>
                                    <input
                                        type="number" className="modern-input"
                                        min="0"
                                        style={fieldStyle(maErr)}
                                        value={newTestData.maxAttempts}
                                        onChange={e => setNewTestData({...newTestData, maxAttempts: Number(e.target.value)})}
                                        onBlur={() => setTouched(t => ({...t, maxAttempts: true}))}
                                    />
                                    {maErr && <span style={{ fontSize: '11px', color: '#ff4d4d', marginTop: '3px', display: 'block' }}>⚠ {maErr}</span>}
                                </div>
                            </div>
                            <button
                                className="primary-btn"
                                onClick={handleCreateTest}
                                disabled={isCreating || !isFormValid}
                                style={{ opacity: isCreating || !isFormValid ? 0.5 : 1, cursor: isCreating || !isFormValid ? 'not-allowed' : 'pointer' }}
                            >
                                {isCreating ? 'Создаем...' : 'Сохранить тест'}
                            </button>
                        </div>
                    </>
                )}

                {/* ЭКРАН 4: ФОРМА СОЗДАНИЯ ДЗ */}
                {modalView === 'create_hw' && (
                    <>
                        <h2 style={{color: 'var(--text-main)', marginBottom: '20px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <Icons.Upload size={20} color="#a78bfa"/> Новое домашнее задание
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <input
                                type="text" placeholder="Название задания" className="modern-input"
                                value={newHwData.title} onChange={e => setNewHwData({...newHwData, title: e.target.value})}
                            />
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Срок сдачи</label>
                                <DateTimePicker
                                    value={newHwData.deadline}
                                    onChange={val => setNewHwData({ ...newHwData, deadline: val })}
                                />
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '10px', background: 'rgba(124,58,237,0.06)', borderRadius: '8px', border: '1px solid rgba(124,58,237,0.15)' }}>
                                После создания сможете добавить текст условия, файлы и ссылки через конструктор
                            </div>
                            <button
                                className="primary-btn"
                                onClick={handleCreateHw}
                                disabled={isCreating || !newHwData.title.trim() || !newHwData.deadline}
                                style={{ opacity: isCreating || !newHwData.title.trim() || !newHwData.deadline ? 0.5 : 1 }}
                            >
                                {isCreating ? 'Создаём...' : 'Создать задание'}
                            </button>
                        </div>
                    </>
                )}

                {/* ЭКРАН 5: ФОРМА СОЗДАНИЯ КОД-ЗАДАНИЯ */}
                {modalView === 'create_code' && (
                    <>
                        <h2 style={{color: 'var(--text-main)', marginBottom: '20px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <Icons.Code size={20} color="#22d3ee"/> Новое код-задание
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <input
                                type="text" placeholder="Название задания" className="modern-input"
                                value={newCodeData.title} onChange={e => setNewCodeData({...newCodeData, title: e.target.value})}
                            />
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Срок сдачи</label>
                                <DateTimePicker
                                    value={newCodeData.deadline}
                                    onChange={val => setNewCodeData({ ...newCodeData, deadline: val })}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                                    Языки <span style={{ fontWeight: 400 }}>(не выбрано = все)</span>
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {CODE_LANGUAGES.map(l => {
                                        const active = newCodeData.allowedCodeLanguages.includes(l.id);
                                        return (
                                            <button key={l.id} onClick={() => setNewCodeData(p => ({
                                                ...p,
                                                allowedCodeLanguages: active
                                                    ? p.allowedCodeLanguages.filter(x => x !== l.id)
                                                    : [...p.allowedCodeLanguages, l.id],
                                            }))}
                                                style={{ padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid',
                                                    background: active ? 'rgba(8,145,178,0.15)' : 'var(--bg-input)',
                                                    borderColor: active ? 'rgba(8,145,178,0.5)' : 'var(--border-color)',
                                                    color: active ? '#22d3ee' : 'var(--text-muted)',
                                                }}>{l.label}</button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '10px', background: 'rgba(8,145,178,0.06)', borderRadius: '8px', border: '1px solid rgba(8,145,178,0.15)' }}>
                                После создания можно добавить описание, шаблон кода и настроить параметры
                            </div>
                            <button
                                className="primary-btn"
                                onClick={handleCreateCode}
                                disabled={isCreating || !newCodeData.title.trim() || !newCodeData.deadline}
                                style={{ opacity: isCreating || !newCodeData.title.trim() || !newCodeData.deadline ? 0.5 : 1 }}
                            >
                                {isCreating ? 'Создаём...' : 'Создать код-задание'}
                            </button>
                        </div>
                    </>
                )}

                {/* ЭКРАН 3: ФОРМА СОЗДАНИЯ ВИДЕО */}
                {modalView === 'create_video' && (
                    <>
                        <h2 style={{color: 'var(--text-main)', marginBottom: '20px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px'}}><Icons.Monitor size={20}/> Новый урок</h2>
                        <AddVideoForm
                            courseId={courseId}
                            onVideoAdded={() => {
                                onSuccess();
                                handleClose();
                            }}
                        />
                    </>
                )}

                <button
                    className="btn btn-ghost" style={{ marginTop: '20px', color: 'var(--text-muted)', width: '100%' }}
                    onClick={handleClose}
                >
                    Отмена
                </button>
            </div>
        </div>
    );
};
