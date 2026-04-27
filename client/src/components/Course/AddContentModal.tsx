import { useState } from 'react';
import api from '../../api/axiosInstance';
import { Icons } from '../Icons';
import { useToast } from '../../context/ToastContext';
import { AddVideoForm } from '../AddVideoForm';

interface AddContentModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: number;
    nextOrderIndex: number;
    onSuccess: () => void;
}

const EMPTY_TEST = { title: '', description: '', passingScore: 80, maxAttempts: 3 };

const psError = (v: number) => v < 0 || v > 100 ? 'от 0 до 100' : '';
const maError = (v: number) => v < 0 ? 'не может быть отрицательным' : '';

export const AddContentModal = ({ isOpen, onClose, courseId, nextOrderIndex, onSuccess }: AddContentModalProps) => {
    const { showToast } = useToast();
    const [modalView, setModalView] = useState<'select' | 'create_test' | 'create_video'>('select');
    const [newTestData, setNewTestData] = useState(EMPTY_TEST);
    const [touched, setTouched] = useState({ passingScore: false, maxAttempts: false });
    const [isCreating, setIsCreating] = useState(false);

    if (!isOpen) return null;

    const handleClose = () => {
        setModalView('select');
        setNewTestData(EMPTY_TEST);
        setTouched({ passingScore: false, maxAttempts: false });
        onClose();
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
