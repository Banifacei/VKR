import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { Icons } from '../components/Icons';
import api from '../api/axiosInstance';
import './CertificatesPage.css';

interface ICertificate {
    id: number;
    certificateId: string;
    courseId: number;
    createdAt: string;
    course: { id: number; title: string; instructor: string; coverImage?: string };
}

export const CertificatesPage = () => {
    const [certs, setCerts] = useState<ICertificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<number | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/certificates/my')
            .then(r => setCerts(r.data || []))
            .finally(() => setLoading(false));
    }, []);

    const handleDownload = async (cert: ICertificate) => {
        setDownloading(cert.courseId);
        try {
            const res = await api.get(`/certificates/${cert.courseId}/download`, { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `certificate-${cert.certificateId}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            // ignore
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="lumeo-layout">
            <AppHeader />
            <main className="cert-main">
                <div className="cert-header">
                    <h1 className="cert-title">
                        <Icons.Trophy size={24} color="var(--primary)" /> Мои сертификаты
                    </h1>
                    <p className="cert-subtitle">Подтверждение пройденных курсов</p>
                </div>

                {loading && (
                    <div className="cert-grid">
                        {[1, 2, 3].map(i => <div key={i} className="skeleton cert-skeleton" />)}
                    </div>
                )}

                {!loading && certs.length === 0 && (
                    <div className="cert-empty">
                        <Icons.Trophy size={48} color="var(--text-muted)" />
                        <p>Завершите курс на 100%, чтобы получить сертификат</p>
                        <button className="primary-btn" onClick={() => navigate('/')}>
                            К курсам
                        </button>
                    </div>
                )}

                {!loading && certs.length > 0 && (
                    <div className="cert-grid">
                        {certs.map(cert => (
                            <div key={cert.id} className="cert-card">
                                <div className="cert-card-cover"
                                    style={{ backgroundImage: cert.course.coverImage ? `url(${cert.course.coverImage})` : undefined }}>
                                    <div className="cert-card-badge">
                                        <Icons.CheckCircle size={14} /> Завершён
                                    </div>
                                </div>
                                <div className="cert-card-body">
                                    <h3 className="cert-card-title">{cert.course.title}</h3>
                                    <p className="cert-card-instructor">{cert.course.instructor}</p>
                                    <div className="cert-card-meta">
                                        <span className="cert-id">ID: {cert.certificateId}</span>
                                        <span className="cert-date">
                                            {new Date(cert.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <button
                                        className="cert-download-btn"
                                        onClick={() => handleDownload(cert)}
                                        disabled={downloading === cert.courseId}
                                    >
                                        {downloading === cert.courseId
                                            ? <><Icons.Spinner size={14} /> Загрузка...</>
                                            : <><Icons.Download size={14} /> Скачать PDF</>}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};
