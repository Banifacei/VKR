import { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import { useToast } from '../../context/ToastContext';
import { Icons } from '../Icons';
import { StudentDetailView } from './StudentDetailView';
import { ItemDetailView } from './ItemDetailView';

interface AnalyticsDrillDownModalProps {
    config: { id: number | null, type: 'student' | 'test' | 'video' | null } | null;
    courseId: number | undefined;
    onClose: () => void;
}

export const AnalyticsDrillDownModal = ({ config, courseId, onClose }: AnalyticsDrillDownModalProps) => {
    const { showToast } = useToast();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    
    // Анимация появления
    const [modalVisible, setModalVisible] = useState(false);
    
    useEffect(() => {
        if (!config || !config.id || !courseId) {
            setModalVisible(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setData(null);
            try {
                let url = '';
                if (config.type === 'student') url = `/videos/courses/${courseId}/analytics/student/${config.id}`;
                else url = `/videos/courses/${courseId}/analytics/item/${config.type}/${config.id}`;
                
                const res = await api.get(url);
                setData(res.data);
                setTimeout(() => setModalVisible(true), 50); // Плавное открытие
            } catch (e) {
                showToast('Ошибка загрузки данных', 'error');
                onClose();
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [config, courseId]);

    if (!config || !config.id) return null;

    // Шапка модалки динамическая
    // Шапка модалки динамическая с безопасной проверкой (защита от рассинхрона React)
    const getHeader = () => {
        if (!data) return { icon: '?', title: 'Загрузка...' };

        if (config.type === 'student' && data.student) return {
            icon: data.student.firstName?.charAt(0) || '👤',
            title: `${data.student.lastName || ''} ${data.student.firstName || ''}`,
            subTitle: data.student.email || 'Нет email'
        };
        
        if (config.type === 'test' && data.item) return {
            icon: <Icons.FileText size={24}/>,
            title: data.item.title || 'Без названия',
            subTitle: 'Курсовой тест'
        };

        if (config.type === 'video' && data.item) return {
            icon: <Icons.Monitor size={24}/>,
            title: data.item.title || 'Без названия',
            subTitle: 'Видеоурок'
        };

        // Заглушка на момент переключения между вкладками
        return { icon: '...', title: 'Сбор данных...' };
    };
    const header = getHeader();

    return (
        <>
            {/* Оверлей (задний фон) с блюром */}
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: modalVisible ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }} onClick={onClose}>
                
                {/* 🔥 ЦЕНТРАЛЬНАЯ МОДАЛКА (AAA Класс) */}
                <div 
                    style={{ background: '#121212', width: '900px', maxWidth: '90%', maxHeight: '90vh', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden', transform: modalVisible ? 'scale(1)' : 'scale(0.9)', transition: 'transform 0.3s ease-in-out', display: 'flex', flexDirection: 'column' }} 
                    onClick={e => e.stopPropagation()}
                >
                    {loading ? (
                        <div style={{ padding: '100px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#666' }}>
                            <Icons.Spinner /> <div style={{ marginTop: '20px' }}>Drilling down...</div>
                        </div>
                    ) : !data ? null : (
                        <>
                            {/* Красивый Header */}
                            <div style={{ padding: '25px 30px', borderBottom: '1px solid #222', background: '#161616', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 2 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div style={{ width: '55px', height: '55px', borderRadius: '15px', background: 'linear-gradient(135deg, #1d1d1d, #111)', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
                                        {header.icon}
                                    </div>
                                    <div>
                                        <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', color: '#fff' }}>{header.title}</h2>
                                        <div style={{ fontSize: '12px', color: '#888' }}>{header.subTitle}</div>
                                    </div>
                                </div>
                                <button className="btn btn-ghost" style={{ fontSize: '24px', color: '#555', padding: '0 10px' }} onClick={onClose}>×</button>
                            </div>

                            {/* Скроллящийся контент */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 30px 30px 30px' }}>
                                {config.type === 'student' && <StudentDetailView data={data} />}
                                {(config.type === 'test' || config.type === 'video') && <ItemDetailView data={data} />}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};