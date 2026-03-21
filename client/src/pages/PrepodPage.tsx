import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { VideoPlayer } from '../components/VideoPlayer';
import { AddVideoForm } from '../components/AddVideoForm';
import { DraggableVideoList } from '../components/DraggableVideoList';
import api from '../api/axiosInstance';
import { 
    getVideosByCourse,
    addEvent,
    updateEvent,
    deleteEvent,
    getVideoStats,
    updateVideo,
    getCourses,
    createCourse,
    updateCourseApi,
    deleteCourseApi,
    generateAutoSubtitles,
    transcodeVideo,
    reorderVideos,
    deleteVideoApi
} from '../api/videoApi';
import type { IVideo, ICourse } from '../types';
import './PrepodPage.css';
import './UserPage.css'; 
import { UserProfile } from '../components/UserProfile';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { 
    getCourseTests, createCourseTest, deleteCourseTest, deleteTestQuestion,addTestQuestion,
    type ICourseTest 
} from '../api/testApi';
import * as XLSX from 'xlsx';
import { Icons } from '../components/Icons';
export const PrepodPage = () => {
  const { showToast } = useToast();
  const { globalTheme } = useTheme();
  // --- СОСТОЯНИЕ: КУРСЫ --- (С сохранением после F5)
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(() => {
      const saved = localStorage.getItem('prepod_course_id');
      return saved ? Number(saved) : null;
  });
  const { user, logout, updateUser } = useAuth();

  const handleAvatarUpdate = (newUrl: string) => {
      updateUser({ avatarUrl: newUrl });
  };

  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseInstructor, setNewCourseInstructor] = useState('');

  // --- СОСТОЯНИЕ: ВИДЕО И РЕДАКТОР ---
  const [videos, setVideos] = useState<IVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<IVideo | null>(null);
  // Вспомогательный стейт для восстановления видео после F5
  const [savedVideoId, setSavedVideoId] = useState<number | null>(() => {
      const saved = localStorage.getItem('prepod_video_id');
      return saved ? Number(saved) : null;
  });
  
  // Конструктор событий
  const [currentTime, setCurrentTime] = useState(0);
  const [eventType, setEventType] = useState<'single_choice' | 'multiple_choice' | 'free_text' | 'info'>('single_choice');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState([{ text: '', isCorrect: false }, { text: '', isCorrect: false }]);
  const [freeTextAnswer, setFreeTextAnswer] = useState(''); 
  const [isStrict, setIsStrict] = useState(false);
  const [weight, setWeight] = useState(1);
  const [rewindTo, setRewindTo] = useState<number | ''>('');
  const [explanation, setExplanation] = useState('');
  const [aiThreshold, setAiThreshold] = useState(50);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  // Храним массив ID видео, для которых сейчас генерируются субтитры
  const [generatingVideos, setGeneratingVideos] = useState<number[]>(() => {
      const saved = localStorage.getItem('prepod_generating_videos');
      return saved ? JSON.parse(saved) : [];
  });
  const [transcodingVideos, setTranscodingVideos] = useState<number[]>([]);
  // --- SSE: мгновенное уведомление о завершении генерации субтитров ---
  useEffect(() => {
      if (!selectedCourseId) return;
      const token = localStorage.getItem('lumeo_token');
      if (!token) return;

      const es = new EventSource(`/api/videos/courses/${selectedCourseId}/processing/stream?token=${token}`);

      es.onmessage = async ({ data }) => {
          try {
              const d = JSON.parse(data);
              if (d.type === 'subtitle_done') {
                  showToast(`Субтитры для урока "${d.videoTitle}" успешно созданы!`, 'success');
                  setGeneratingVideos(prev => prev.filter(id => id !== d.videoId));
                  const freshVideos = await getVideosByCourse(selectedCourseId);
                  setVideos(freshVideos);
              } else if (d.type === 'quality_ready') {
                  showToast(`Версии качества для урока "${d.videoTitle}" готовы!`, 'success');
                  setTranscodingVideos(prev => prev.filter(id => id !== d.videoId));
                  const freshVideos = await getVideosByCourse(selectedCourseId);
                  setVideos(freshVideos);
              }
          } catch { /* игнорируем */ }
      };

      es.onerror = () => es.close();
      return () => es.close();
  }, [selectedCourseId]);
  // Сохраняем этот список в кэш браузера при каждом изменении
  useEffect(() => {
      localStorage.setItem('prepod_generating_videos', JSON.stringify(generatingVideos));
  }, [generatingVideos]);
  
  // --- СОСТОЯНИЕ: ТЕСТЫ ---
  const [activeTab, setActiveTab] = useState<'videos' | 'tests'>('videos');
  const [tests, setTests] = useState<ICourseTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<ICourseTest | null>(null);
  // Загрузка тестов при выборе курса
    const loadTests = async () => {
        if (!selectedCourseId) return;
        try {
            const data = await getCourseTests(selectedCourseId);
            setTests(data);
        } catch (e) { console.error("Ошибка загрузки тестов"); }
    };
  // --- СИНХРОНИЗАЦИЯ ТЕСТА (как с видео) ---
  useEffect(() => {
      if (selectedTest && tests.length > 0) {
          const updated = tests.find(t => t.id === selectedTest.id);
          if (updated && JSON.stringify(updated) !== JSON.stringify(selectedTest)) {
              setSelectedTest(updated);
          }
      }
  }, [tests]);

  // --- ДОБАВЛЕНИЕ И УДАЛЕНИЕ ВОПРОСОВ В ТЕСТ ---
  const handleAddTestQuestion = async () => {
      if (!selectedTest) return;
      if (!questionText.trim()) return showToast('Введите текст вопроса!', 'error');
      if ((eventType === 'single_choice' || eventType === 'multiple_choice') && !options.some(o => o.isCorrect)) {
          return showToast('Выберите хотя бы один правильный ответ!', 'error');
      }

      setIsAddingEvent(true);
      try {
          await addTestQuestion(selectedTest.id, {
              type: eventType,
              text: questionText,
              options: (eventType === 'single_choice' || eventType === 'multiple_choice') ? options : [],
              correctAnswer: eventType === 'free_text' ? freeTextAnswer : '',
              weight: Number(weight),
              aiThreshold
          });
          showToast('Вопрос добавлен в тест!', 'success');
          setQuestionText(''); setOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }]);
          setFreeTextAnswer('');
          loadTests(); // Обновляем список, чтобы вопрос появился
      } catch (e) {
          showToast('Ошибка при добавлении вопроса', 'error');
      } finally {
          setIsAddingEvent(false);
      }
  };

  const handleDeleteTestQuestion = async (qId: number) => {
      if (!window.confirm('Точно удалить этот вопрос?')) return;
      try {
          await deleteTestQuestion(qId);
          showToast('Вопрос удален', 'info');
          loadTests();
      } catch (e) { showToast('Ошибка удаления', 'error'); }
  };
  // Статистика
  const [showStats, setShowStats] = useState(false);
  const [statsData, setStatsData] = useState<any[]>([]);
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null);
  // Настройки курса
  const [showCourseSettings, setShowCourseSettings] = useState(false);
  const [editCourseData, setEditCourseData] = useState({ title: '', description: '', instructor: '' });
  // --- СТЕЙТЫ ДЛЯ КОМАНДЫ КУРСА ---
  const [settingsTab, setSettingsTab] = useState<'info' | 'team'>('info');
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const fetchCollaborators = async (courseId: number) => {
      try {
          const res = await api.get(`/videos/courses/${courseId}/collaborators`);
          setCollaborators(res.data);
      } catch (e) {
          console.error('Ошибка загрузки команды');
      }
  };

  const handleInvite = async () => {
      if (!inviteEmail.trim()) return showToast('Введите email', 'error');
      setIsInviting(true);
      try {
          await api.post(`/videos/courses/${selectedCourseId}/collaborators`, { email: inviteEmail.trim() });
          showToast('Пользователь добавлен в команду!', 'success');
          setInviteEmail('');
          fetchCollaborators(selectedCourseId!);
      } catch (e: any) {
          showToast(e.response?.data?.message || 'Ошибка приглашения', 'error');
      } finally {
          setIsInviting(false);
      }
  };

  const handleRemoveCollaborator = async (userId: number) => {
      if (!window.confirm('Удалить пользователя из команды курса?')) return;
      try {
          await api.delete(`/videos/courses/${selectedCourseId}/collaborators/${userId}`);
          showToast('Пользователь удален', 'info');
          fetchCollaborators(selectedCourseId!);
      } catch (e) {
          showToast('Ошибка удаления', 'error');
      }
  };
  // --- СОХРАНЕНИЕ В LOCAL STORAGE ---
  useEffect(() => {
      if (selectedCourseId) localStorage.setItem('prepod_course_id', selectedCourseId.toString());
      else localStorage.removeItem('prepod_course_id');
  }, [selectedCourseId]);

  useEffect(() => {
      if (selectedVideo) localStorage.setItem('prepod_video_id', selectedVideo.id.toString());
      else localStorage.removeItem('prepod_video_id');
  }, [selectedVideo]);

  const handleAddOption = () => setOptions([...options, { text: '', isCorrect: false }]);
  const handleRemoveOption = (index: number) => setOptions(options.filter((_, i) => i !== index));
  
  const handleOptionChange = (index: number, field: 'text' | 'isCorrect', value: any) => {
      const newOptions = [...options];
      if (eventType === 'single_choice' && field === 'isCorrect' && value === true) {
          newOptions.forEach(opt => opt.isCorrect = false);
      }
      newOptions[index] = { ...newOptions[index], [field]: value };
      setOptions(newOptions);
  };

  // 1. ПРИ ЗАГРУЗКЕ СТРАНИЦЫ И РАДАР КУРСОВ
  useEffect(() => {
      loadCourses();
      const interval = setInterval(async () => {
          try {
              const freshCourses = await getCourses();
              setCourses(prev => {
                  if (JSON.stringify(prev) !== JSON.stringify(freshCourses)) {
                      return freshCourses;
                  }
                  return prev;
              });
          } catch (e) {}
      }, 15000); 
      return () => clearInterval(interval);
  }, []);

  // 2. РАДАР СТАТИСТИКИ
  useEffect(() => {
      if (!showStats || !selectedVideo) return;
      const interval = setInterval(async () => {
          try {
              const freshStats = await getVideoStats(selectedVideo.id);
              setStatsData(prev => {
                  if (JSON.stringify(prev) !== JSON.stringify(freshStats)) {
                      return freshStats;
                  }
                  return prev;
              });
          } catch (e) {}
      }, 5000);
      return () => clearInterval(interval);
  }, [showStats, selectedVideo]);

  // Видео обновляются через SSE (subtitle_done) — polling убран

  // СИНХРОНИЗАЦИЯ ПЛЕЕРА
  useEffect(() => {
      if (selectedVideo && videos.length > 0) {
          const updated = videos.find(v => v.id === selectedVideo.id);
          if (updated && JSON.stringify(updated) !== JSON.stringify(selectedVideo)) {
              setSelectedVideo(updated);
              
              // МАГИЯ: Убираем ИМЕННО ЭТО видео из списка загружаемых, так как данные пришли!
              setGeneratingVideos(prev => prev.filter(id => id !== updated.id));
          }
      }
  }, [videos]);
  
  useEffect(() => {
      if (selectedCourseId) {
          loadVideos();
          loadTests();
      }
  }, [selectedCourseId]);

  const loadCourses = async () => {
      try {
        const data = await getCourses();
        setCourses(data);
      } catch (e) {
        console.error("Ошибка загрузки курсов", e);
      }
  };

  const handleCreateCourse = async () => {
      if (!newCourseTitle.trim() || !newCourseInstructor.trim()) {
          return showToast('Заполните название и ФИО преподавателя!', 'error');
      }
      try {
          await createCourse({
              title: newCourseTitle,
              description: newCourseDesc,
              instructor: newCourseInstructor
          });
          setNewCourseTitle(''); setNewCourseDesc(''); setNewCourseInstructor('');
          loadCourses(); 
          showToast('Курс успешно создан!', 'success');
      } catch (e) {
          showToast('Ошибка при создании курса', 'error');
      }
  };

  const loadVideos = async () => {
    if (!selectedCourseId) return;
    try {
        const data = await getVideosByCourse(selectedCourseId);
        setVideos(data);
        
        if (selectedVideo) {
            const updated = data.find(v => v.id === selectedVideo.id);
            if (updated) setSelectedVideo(updated);
        } else if (savedVideoId) {
            // Восстанавливаем видео после обновления страницы
            const saved = data.find(v => v.id === savedVideoId);
            if (saved) {
                setSelectedVideo(saved);
                setSavedVideoId(null); // Очищаем кэш после восстановления
            }
        }
    } catch (e) {
        console.error("Ошибка загрузки видео", e);
    }
  };

  const handleUpdateSettings = async (updates: Partial<IVideo>) => {
      if (!selectedVideo) return;
      try {
          await updateVideo(selectedVideo.id, updates);
          setSelectedVideo({ ...selectedVideo, ...updates });
          setVideos(prev => prev.map(v => v.id === selectedVideo.id ? { ...v, ...updates } : v));
      } catch (e) {
          showToast("Ошибка при обновлении настроек", 'error');
      }
  };

  const handleAddEvent = async () => {
      if (!selectedVideo) return;
      if (!questionText.trim()) return showToast('Введите текст вопроса или информации!', 'error');
      
      if (eventType === 'single_choice' || eventType === 'multiple_choice') {
          if (options.some(o => !o.text.trim())) return showToast('Заполните все варианты ответов!', 'error');
          if (!options.some(o => o.isCorrect)) return showToast('Выберите хотя бы один правильный ответ!', 'error');
      }

      if (eventType === 'free_text' && !freeTextAnswer.trim()) {
          return showToast('Введите эталонный ответ (ключевые слова) для проверки!', 'error');
      }

      setIsAddingEvent(true);
      try {
          const eventPayload = {
              time: currentTime,
              type: eventType,
              question: questionText, 
              options: (eventType === 'single_choice' || eventType === 'multiple_choice') ? options : [],
              correctAnswer: eventType === 'free_text' ? freeTextAnswer : '',
              isStrict, weight: Number(weight),
              rewindTo: rewindTo === '' ? undefined : Number(rewindTo),
              explanation, aiThreshold
          };

          if (editingEventId) {
              await updateEvent(editingEventId, eventPayload);
              showToast('Метка успешно обновлена!', 'success');
          } else {
              await addEvent(selectedVideo.id, eventPayload);
              showToast('Метка успешно добавлена на таймлайн!', 'success');
          }
          
          setQuestionText(''); 
          setOptions([{ text: '', isCorrect: false }, { text: '', isCorrect: false }]);
          setFreeTextAnswer(''); setExplanation(''); setRewindTo(''); setAiThreshold(50);
          setEditingEventId(null); 
          await loadVideos();
      } catch (e) {
          showToast('Ошибка при добавлении метки', 'error');
      } finally {
          setIsAddingEvent(false);
      }
  };

  const handleEditClick = (ev: any) => {
      setEditingEventId(ev.id);
      setCurrentTime(ev.time);
      setEventType(ev.type);
      setQuestionText(ev.question);
      if (ev.type === 'free_text') setFreeTextAnswer(ev.correctAnswer || '');
      if (ev.options && ev.options.length > 0) setOptions(ev.options);
      setIsStrict(ev.isStrict || false);
      setWeight(ev.weight || 1);
      setRewindTo(ev.rewindTo !== null && ev.rewindTo !== undefined ? ev.rewindTo : '');
      setExplanation(ev.explanation || '');
      setAiThreshold(ev.aiThreshold || 50);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = async (eventId: number) => {
      if (!window.confirm('Точно удалить этот вопрос?')) return;
      try {
          await deleteEvent(eventId);
          if (editingEventId === eventId) setEditingEventId(null);
          await loadVideos();
          showToast('Метка удалена', 'info');
      } catch (e) {
          showToast('Ошибка при удалении', 'error');
      }
  };

  const handleGenerateSubs = async () => {
      if (!selectedVideo) return;
      // ДОБАВЛЯЕМ текущее видео в список обрабатываемых
      setGeneratingVideos(prev => [...prev, selectedVideo.id]); 

      try {
          await generateAutoSubtitles(selectedVideo.id);
          showToast("ИИ начал работу! Вы можете переключиться на другой урок.", 'info');
      } catch (e) {
          console.error(e);
          showToast("Ошибка при старте генерации.", 'error');
          setGeneratingVideos(prev => prev.filter(id => id !== selectedVideo.id)); 
      }
  };

  const handleTranscode = async () => {
      if (!selectedVideo) return;
      if (!selectedVideo.url.startsWith('/uploads/')) {
          showToast('Транскодирование доступно только для загруженных файлов', 'error');
          return;
      }
      setTranscodingVideos(prev => [...prev, selectedVideo.id]);
      try {
          await transcodeVideo(selectedVideo.id);
          showToast('Транскодирование запущено. Это может занять несколько минут.', 'info');
      } catch (e) {
          console.error(e);
          showToast('Ошибка при запуске транскодирования', 'error');
          setTranscodingVideos(prev => prev.filter(id => id !== selectedVideo.id));
      }
  };

  // Статистика
  const loadStats = async () => {
      if (!selectedVideo) return;
      try {
          const data = await getVideoStats(selectedVideo.id);
          setStatsData(data);
          setExpandedStudent(null); 
          setShowStats(true);
      } catch (e) {
          showToast('Не удалось загрузить статистику', 'error');
      }
  };


  // --- ВЫГРУЗКА В EXCEL (.xlsx) С НАСТРОЙКОЙ ШИРИНЫ КОЛОНОК ---
  const exportToExcel = () => {
      if (statsData.length === 0) return showToast('Нет данных для выгрузки!', 'error');

      const courseName = courses.find(c => c.id === selectedCourseId)?.title || 'Неизвестный курс';
      const videoName = selectedVideo?.title || 'Неизвестный урок';
      const teacherName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Неизвестно';
      const exportDate = new Date().toLocaleDateString('ru-RU');

      // 1. Формируем данные по строкам (двумерный массив)
      const wsData: any[][] = [];

      // Шапка
      wsData.push(['ВЕДОМОСТЬ РЕЗУЛЬТАТОВ ТЕСТИРОВАНИЯ']);
      wsData.push(['Курс:', courseName]);
      wsData.push(['Урок/Тема:', videoName]);
      wsData.push(['Преподаватель:', teacherName]);
      wsData.push(['Дата формирования:', exportDate]);
      wsData.push([]); // Пустая строка

      // Сводная таблица
      wsData.push(['СВОДНАЯ СТАТИСТИКА ПО СТУДЕНТАМ']);
      wsData.push(['№ п/п', 'ФИО обучающегося', 'Всего ответов', 'Правильных', 'С ошибками', 'Процент усвоения', 'Рекомендуемая оценка']);

      const groups = getGroupedStats();
      groups.forEach((student, index) => {
          const percent = student.total > 0 ? Math.round((student.correct / student.total) * 100) : 0;
          let grade = 'Неудовлетворительно (2)';
          if (percent >= 90) grade = 'Отлично (5)';
          else if (percent >= 75) grade = 'Хорошо (4)';
          else if (percent >= 50) grade = 'Удовлетворительно (3)';

          wsData.push([index + 1, student.name, student.total, student.correct, student.incorrect, `${percent}%`, grade]);
      });

      wsData.push([]);
      wsData.push([]);

      // Детализация
      wsData.push(['ДЕТАЛИЗАЦИЯ ОТВЕТОВ И ИИ-АНАЛИЗ']);
      wsData.push(['ФИО обучающегося', 'Текст вопроса', 'Ответ студента', 'Результат проверки', 'Смысловая точность (ИИ)']);

      statsData.forEach(stat => {
          const name = stat.user ? `${stat.user.firstName} ${stat.user.lastName}`.trim() : `Студент ID: ${stat.userId}`;
          const question = stat.event?.question || 'Вопрос удален';
          const answer = stat.answer || '—';
          const result = stat.isCorrect ? 'Верно' : 'Ошибка';
          const aiScore = stat.similarity !== null ? `${stat.similarity}%` : '—';

          wsData.push([name, question, answer, result, aiScore]);
      });

      // 2. Создаем рабочий лист (Worksheet) из массива
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // --- МАГИЯ: ЗАДАЕМ ИДЕАЛЬНУЮ ШИРИНУ КОЛОНОК (в символах) ---
      ws['!cols'] = [
          { wch: 30 }, // A: ФИО / Номера
          { wch: 55 }, // B: Длинные вопросы
          { wch: 45 }, // C: Ответы студентов
          { wch: 20 }, // D: Верно/Ошибка
          { wch: 25 }, // E: Проценты / ИИ
          { wch: 20 }, // F: Процент усвоения
          { wch: 25 }, // G: Оценка
      ];

      // 3. Создаем книгу (Workbook) и добавляем в нее лист
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ведомость');

      // Формируем безопасное имя файла
      const safeCourseName = courseName.replace(/[^a-zа-яё0-9]/gi, '_');
      const safeVideoName = videoName.replace(/[^a-zа-яё0-9]/gi, '_');
      const fileName = `Ведомость_${safeCourseName}_${safeVideoName}.xlsx`;

      // 4. Скачиваем готовый настоящий .xlsx файл!
      XLSX.writeFile(wb, fileName);
  };
  
  const getGroupedStats = () => {
      const groups: Record<number, { correct: number; incorrect: number; name: string; userId: number }> = {};
      statsData.forEach(stat => {
          const uId = stat.userId;
          const name = stat.user ? `${stat.user.firstName} ${stat.user.lastName}`.trim() : `Студент ID: ${uId}`;
          if (!groups[uId]) groups[uId] = { correct: 0, incorrect: 0, name, userId: uId };
          
          if (stat.isCorrect) groups[uId].correct++;
          else groups[uId].incorrect++;
      });
      return Object.values(groups).map(data => ({
          ...data,
          total: data.correct + data.incorrect
      }));
  };

  const groupedStats = getGroupedStats();
  const studentDetails = expandedStudent !== null ? statsData.filter(s => s.userId === expandedStudent) : [];
  const expandedStudentName = expandedStudent !== null ? groupedStats.find(s => s.userId === expandedStudent)?.name : '';

  // СЦЕНАРИЙ 1: ВЫБОР КУРСА
  // СЦЕНАРИЙ 1: ВЫБОР КУРСА
  if (!selectedCourseId) {
    return (
        <div className="prepod-layout">
            <header className="lumeo-header">
                <div className="logo">
                    {globalTheme.platform_logo && <img src={globalTheme.platform_logo} alt="logo" style={{ height: 28, marginRight: 8, verticalAlign: 'middle' }} />}
                    {globalTheme.platform_name}<span className="dot">.</span>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                <span style={{fontSize: '14px', color: '#888', fontWeight: 600, marginRight: '10px'}}>Панель преподавателя</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '24px'}}>
              <Link to="/" className="nav-link">Выход на сайт →</Link>
              {user && <UserProfile user={user} onUpdate={handleAvatarUpdate} onLogout={logout} />}
            </div>
            </header>

            <div className="courses-container">
                <div className="courses-header">
                    <h1>Ваши курсы</h1>
                    <p>Выберите курс для редактирования или создайте новый</p>
                </div>

                <div className="courses-grid">
                    {courses.map(c => (
                        <div 
                            key={c.id} 
                            className="course-card" 
                            style={{ position: 'relative' }} 
                            onClick={() => {
                                setSelectedCourseId(c.id);
                                setSelectedVideo(null);
                            }}
                        >
                            <h3 className="course-title" style={{ paddingRight: '60px' }}>{c.title}</h3>
                            <div className="course-instructor" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Icons.Teacher size={14}/> {c.instructor}</div>
                            {/* ВОТ ЭТИХ СТРОК И ЗАКРЫВАЮЩИХ ТЕГОВ НЕ ХВАТАЛО! 👇 */}
                            <div className="course-desc">{c.description || 'Нет описания'}</div>
                            <div className="course-meta">{c.videos?.length || 0} УРОКОВ</div>
                        </div>
                    ))}
                </div>

                <div className="create-course-panel">
                    <h3>+ Создать новый курс</h3>
                    <div style={{display: 'flex', gap: '12px', marginBottom: '12px'}}>
                        <input className="deck-input" style={{marginBottom: 0}} placeholder="Название курса (DevOps)" value={newCourseTitle} onChange={e => setNewCourseTitle(e.target.value)} />
                        <input className="deck-input" style={{marginBottom: 0}} placeholder="ФИО Преподавателя" value={newCourseInstructor} onChange={e => setNewCourseInstructor(e.target.value)} />
                    </div>
                    <textarea className="deck-input" placeholder="Краткое описание курса..." value={newCourseDesc} onChange={e => setNewCourseDesc(e.target.value)} style={{minHeight: '80px', resize: 'vertical'}} />
                    <button className="btn btn-primary" onClick={handleCreateCourse}>Создать курс</button>
                </div>
            </div>
        </div>
    )
  }

  // СЦЕНАРИЙ 2: РЕДАКТОР КУРСА
  return (
    <div className="prepod-layout">
        {/* MODAL STATS */}
        {showStats && (
            <div className="stats-modal-overlay">
                <div className="stats-modal-content">
                    <div className="stats-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{margin: 0}}>Статистика: {selectedVideo?.title}</h3>
                            {expandedStudent && (<button className="back-link" onClick={() => setExpandedStudent(null)}>← К списку группы</button>)}
                        </div>
                        <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                            {/* КНОПКА ВЫГРУЗКИ EXCEL */}
                            <button className="btn btn-primary" onClick={exportToExcel} style={{padding: '6px 12px', fontSize: '13px', display: 'flex', gap: '6px'}}>
                                <Icons.Download /> Выгрузить в Excel
                            </button>
                            <button className="close-btn" onClick={() => setShowStats(false)}>✕</button>
                        </div>
                    </div>
                    
                    <div className="stats-modal-body">
                        {statsData.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
                                <div style={{ fontSize: '40px', marginBottom: '20px' }}>📭</div>
                                <p>Пока никто не проходил этот урок.</p>
                            </div>
                        ) : (
                            <>
                                {!expandedStudent && (
                                    <table className="stats-table">
                                        <thead><tr><th>Студент</th><th>Статус</th><th style={{ textAlign: 'center' }}>Верно</th><th style={{ textAlign: 'center' }}>Ошибок</th><th></th></tr></thead>
                                        <tbody>
                                            {groupedStats.map((student) => (
                                                <tr key={student.userId} className="stats-row">
                                                    <td className="student-name-cell">{student.name}</td>
                                                    <td><span className="status-badge solved">Решён</span></td>
                                                    <td style={{ textAlign: 'center' }}><div className="count-badge correct">{student.correct}</div></td>
                                                    <td style={{ textAlign: 'center' }}><div className={`count-badge incorrect ${student.incorrect === 0 ? 'zero' : ''}`}>{student.incorrect}</div></td>
                                                    <td style={{ textAlign: 'right' }}><button className="details-btn" onClick={() => setExpandedStudent(student.userId)}>Подробнее</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                {expandedStudent && (
                                    <div>
                                        <h4 style={{ color: 'var(--primary)', marginTop: 0, marginBottom: '25px', fontSize: '1.2rem' }}>
                                            Ответы студента: <span style={{color: 'white'}}>{expandedStudentName}</span>
                                        </h4>
                                        <table className="stats-table">
                                            <thead><tr><th>Вопрос</th><th>Ответ</th><th style={{ textAlign: 'center' }}>Точность (ИИ)</th><th style={{ textAlign: 'right' }}>Результат</th></tr></thead>
                                            <tbody>
                                                {studentDetails.map((stat) => (
                                                    <tr key={stat.id} className="stats-row">
                                                        <td style={{ color: '#ccc' }}>{stat.event?.question || 'Вопрос удален'}</td>
                                                        <td style={{ color: '#fff', fontWeight: '500' }}>{stat.answer}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            {stat.event?.type === 'free_text' && stat.similarity !== null ? (
                                                                <span style={{ 
                                                                    color: stat.isCorrect ? '#4dff88' : '#ff4d4d', 
                                                                    fontSize: '13px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px'
                                                                }}>{stat.similarity}%</span>
                                                            ) : (<span style={{ color: '#444' }}>—</span>)}
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            {stat.isCorrect ? (<span style={{ color: '#4dff88', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><Icons.LogSuccess size={14}/> Верно</span>) : (<span style={{ color: '#ff4d4d', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><Icons.Fail size={14}/> Ошибка</span>)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}
        {/* MODAL COURSE SETTINGS */}
        {showCourseSettings && (() => {
            const currentCourse = courses.find(c => c.id === selectedCourseId);
            const isOwner = currentCourse?.ownerId === user?.id || user?.role === 'admin';
            const isChanged = currentCourse && (
                currentCourse.title !== editCourseData.title ||
                (currentCourse.description || '') !== editCourseData.description ||
                (currentCourse.instructor || '') !== editCourseData.instructor
            );
            return (
                <div className="stats-modal-overlay">
                    <div className="stats-modal-content" style={{ maxWidth: '500px', padding: 0, overflow: 'hidden' }}>
                        
                        <div style={{ padding: '20px 25px', background: '#111', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{margin: 0}}>Настройки курса</h3>
                            <button className="close-btn" onClick={() => setShowCourseSettings(false)}>✕</button>
                        </div>

                        {/* ВКЛАДКИ */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #333', background: '#0a0a0a' }}>
                            <button 
                                onClick={() => setSettingsTab('info')}
                                style={{ flex: 1, padding: '15px', background: 'none', border: 'none', borderBottom: settingsTab === 'info' ? '2px solid var(--primary)' : '2px solid transparent', color: settingsTab === 'info' ? 'var(--primary)' : '#888', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Основное
                            </button>
                            <button 
                                onClick={() => { setSettingsTab('team'); fetchCollaborators(selectedCourseId!); }}
                                style={{ flex: 1, padding: '15px', background: 'none', border: 'none', borderBottom: settingsTab === 'team' ? '2px solid var(--primary)' : '2px solid transparent', color: settingsTab === 'team' ? 'var(--primary)' : '#888', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Команда
                            </button>
                        </div>

                        <div className="stats-modal-body" style={{ padding: '25px' }}>
                            {settingsTab === 'info' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#888', marginBottom: '5px', display: 'block' }}>Название курса</label>
                                        <input className="modern-input" value={editCourseData.title} onChange={e => setEditCourseData({...editCourseData, title: e.target.value})} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#888', marginBottom: '5px', display: 'block' }}>ФИО Преподавателя (для витрины)</label>
                                        <input className="modern-input" value={editCourseData.instructor} onChange={e => setEditCourseData({...editCourseData, instructor: e.target.value})} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#888', marginBottom: '5px', display: 'block' }}>Описание</label>
                                        <textarea className="modern-input" style={{ minHeight: '80px', resize: 'vertical' }} value={editCourseData.description} onChange={e => setEditCourseData({...editCourseData, description: e.target.value})} />
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                        <button 
                                            className="btn btn-primary" 
                                            style={{ flex: 1, opacity: isChanged ? 1 : 0.5, cursor: isChanged ? 'pointer' : 'not-allowed' }} 
                                            disabled={!isChanged}
                                            onClick={async () => {
                                                try {
                                                    await updateCourseApi(selectedCourseId!, editCourseData);
                                                    loadCourses();
                                                    setShowCourseSettings(false);
                                                    showToast('Курс успешно обновлен!', 'success');
                                                } catch (e) { showToast('Ошибка при обновлении', 'error'); }
                                            }}
                                        >
                                            Сохранить
                                        </button>
                                        
                                        {isOwner && (
                                            <button className="btn btn-ghost" style={{ background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d' }} onClick={async () => {
                                                if (window.confirm(`⚠️ УДАЛЕНИЕ КУРСА!\nВы уверены, что хотите навсегда удалить "${currentCourse?.title}"?\nВсе видео, субтитры и тесты будут стерты с жесткого диска!`)) {
                                                    try {
                                                        await deleteCourseApi(selectedCourseId!);
                                                        setShowCourseSettings(false);
                                                        setSelectedCourseId(null);
                                                        loadCourses();
                                                    } catch (e) { showToast('Ошибка при удалении', 'error'); }
                                                }
                                            }}><Icons.Trash size={14}/> Удалить курс</button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {isOwner && (
                                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                            <input 
                                                className="modern-input" 
                                                style={{ marginBottom: 0 }} 
                                                placeholder="Email пользователя..." 
                                                value={inviteEmail} 
                                                onChange={e => setInviteEmail(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                                            />
                                            <button className="btn btn-primary" onClick={handleInvite} disabled={isInviting}>
                                                {isInviting ? '...' : 'Добавить'}
                                            </button>
                                        </div>
                                    )}

                                    <div style={{ background: '#1a1a1a', borderRadius: '12px', border: '1px solid #333', overflow: 'hidden' }}>
                                        {collaborators.length === 0 ? (
                                            <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '13px' }}>В команде пока никого нет.<br/>Здесь появятся ваши соавторы.</div>
                                        ) : (
                                            collaborators.map(col => (
                                                <div key={col.userId} style={{ padding: '12px 15px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#fff', overflow: 'hidden' }}>
                                                            {col.user?.avatarUrl ? <img src={col.user.avatarUrl} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="a"/> : col.user?.firstName?.[0] || '?'}
                                                        </div>
                                                        <div>
                                                            <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>{col.user?.firstName} {col.user?.lastName}</div>
                                                            <div style={{ color: '#888', fontSize: '12px' }}>{col.user?.email}</div>
                                                        </div>
                                                    </div>
                                                    {isOwner && (
                                                        <button className="btn-icon" style={{ color: '#ff4d4d' }} onClick={() => handleRemoveCollaborator(col.userId)}>✕</button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>*Соавторы могут добавлять, удалять и редактировать уроки и тесты в этом курсе, а также смотреть статистику студентов.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        })()}
        {/* HEADER */}
        <header className="lumeo-header">
             <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                 <button className="btn btn-ghost" onClick={() => {
                     setSelectedCourseId(null);
                     setSelectedVideo(null); // Очищаем стейты при выходе Назад
                 }} style={{padding: '6px 12px'}}>
                    <Icons.Back /> Назад
                 </button>
                 <div style={{height: '24px', width: '1px', background: '#333'}}></div>
                 <div className="logo" style={{fontSize: '18px', display: 'flex', alignItems: 'center', gap: '15px'}}>
                    {courses.find(c => c.id === selectedCourseId)?.title}
                    <span style={{color: '#666', fontWeight: 400}}>| Редактор</span>
                    <button 
                        className="btn btn-ghost" 
                        style={{ padding: '4px 10px', fontSize: '13px', background: 'rgba(255,255,255,0.05)' }}
                        onClick={() => {
                            const c = courses.find(crs => crs.id === selectedCourseId);
                            if (c) {
                                setEditCourseData({ title: c.title, description: c.description || '', instructor: c.instructor || '' });
                                setSettingsTab('info');
                                setShowCourseSettings(true);
                            }
                        }}
                    >
                        <Icons.Settings size={14}/> Настройки курса
                    </button>
                 </div>
             </div>
             <div style={{display: 'flex', alignItems: 'center', gap: '24px'}}>
              <Link to="/" className="nav-link">Выход на сайт →</Link>
              {user && <UserProfile user={user} onUpdate={handleAvatarUpdate} onLogout={logout} />}
            </div>
        </header>

        <div className="editor-container">
            {/* SIDEBAR */}
            {/* SIDEBAR */}
            <aside className="editor-sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
                
                {/* ВКЛАДКИ */}
                <div className="sidebar-tabs">
                    <button className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`} onClick={() => setActiveTab('videos')}>Уроки (Видео)</button>
                    <button className={`tab-btn ${activeTab === 'tests' ? 'active' : ''}`} onClick={() => setActiveTab('tests')}>Тесты курса</button>
                    {tests.length === 0 && <div style={{ textAlign: 'center', color: '#666', fontSize: '13px', marginTop: '20px' }}>Нет тестов</div>}
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {activeTab === 'videos' ? (
                        <>
                            <div style={{ padding: '20px', paddingBottom: '0' }}>
                                <AddVideoForm onVideoAdded={loadVideos} courseId={selectedCourseId} />
                            </div>
                            <div className="sidebar-header"><h3>Список уроков</h3></div>
                            <DraggableVideoList 
                                videos={videos} 
                                selectedVideoId={selectedVideo?.id}
                                onSelectVideo={(v) => { 
                                    if (selectedVideo?.id !== v.id) setSelectedVideo(v); 
                                    setSelectedTest(null); // Сбрасываем тест
                                }}
                                onReorder={async (newVideosArray) => {
                                    setVideos(newVideosArray);
                                    try {
                                        const orderedIds = newVideosArray.map(v => v.id);
                                        await reorderVideos(orderedIds); 
                                    } catch (e) { showToast("Ошибка при сохранении.", "error"); loadVideos(); }
                                }}
                                onEdit={async (videoToEdit, e) => {
                                    e.stopPropagation(); 
                                    const newTitle = window.prompt('Введите новое название урока:', videoToEdit.title);
                                    if (!newTitle || newTitle === videoToEdit.title) return;
                                    try {
                                        await updateVideo(videoToEdit.id, { title: newTitle });
                                        showToast('Название успешно обновлено!', 'success');
                                        loadVideos(); 
                                    } catch (err) { showToast('Ошибка при обновлении названия', 'error'); }
                                }}
                                onDelete={async (videoToDelete, e) => {
                                    e.stopPropagation();
                                    if (!window.confirm(`Вы уверены, что хотите удалить урок "${videoToDelete.title}"?`)) return;
                                    try {
                                        await deleteVideoApi(videoToDelete.id);
                                        showToast('Урок успешно удален!', 'info');
                                        if (selectedVideo?.id === videoToDelete.id) setSelectedVideo(null);
                                        loadVideos();
                                    } catch (err) { showToast('Ошибка при удалении', 'error'); }
                                }}
                            />
                        </>
                    ) : (
                        <div style={{ padding: '20px' }}>
                            <button className="btn btn-primary" style={{ width: '100%', marginBottom: '20px' }} onClick={async () => {
                                const title = window.prompt('Введите название итогового теста:');
                                if (!title) return;
                                try {
                                    await createCourseTest(selectedCourseId!, { title });
                                    showToast('Тест создан!', 'success');
                                    loadTests();
                                } catch (e) { showToast('Ошибка создания теста', 'error'); }
                            }}>
                                + Создать тест
                            </button>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {tests.map(test => (
                                    <div 
                                        key={test.id} 
                                        className={`test-item ${selectedTest?.id === test.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedTest(test);
                                            setSelectedVideo(null); // Сбрасываем видео
                                        }}
                                    >
                                        <div>
                                            <div className="test-item-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.FileText size={14}/> {test.title}</div>
                                            <div className="test-item-meta">{test.questions?.length || 0} вопросов</div>
                                        </div>
                                        <button className="btn-icon" style={{ color: '#ff4d4d' }} onClick={async (e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`Удалить тест "${test.title}" навсегда?`)) {
                                                try {
                                                    await deleteCourseTest(test.id);
                                                    if (selectedTest?.id === test.id) setSelectedTest(null);
                                                    loadTests();
                                                    showToast('Тест удален', 'info');
                                                } catch (err) { showToast('Ошибка удаления', 'error'); }
                                            }
                                        }}><Icons.Trash size={14}/></button>
                                    </div>
                                ))}
                                {tests.length === 0 && <div style={{ textAlign: 'center', color: '#666', fontSize: '13px', marginTop: '20px' }}>Нет итоговых тестов</div>}
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* MAIN STAGE */}
            {/* MAIN STAGE */}
            <main className="editor-stage">
                {activeTab === 'videos' ? (
                    /* РЕДАКТОР ВИДЕО УРОКОВ */
                    selectedVideo ? (
                        <>
                            <div className="player-wrapper-animation" style={{width: '100%', maxWidth: '1000px'}}>
                                <VideoPlayer 
                                    key={selectedVideo.id}
                                    sources={[
                                    { quality: 'Оригинал', url: selectedVideo.url, subtitles: selectedVideo.subtitles },
                                    ...(selectedVideo.qualityUrls || []).map((q: any) => ({ quality: q.quality, url: q.url, subtitles: selectedVideo.subtitles }))
                                ]}
                                    title={selectedVideo.title} 
                                    events={selectedVideo.events || []}
                                    hideResults={selectedVideo.hideResults}
                                    videoId={selectedVideo.id}
                                    userId={user?.id?.toString()}
                                    userRole={user?.role}
                                    onTimeUpdate={(t) => setCurrentTime(t)}
                                    maxAttempts={selectedVideo.maxAttempts}
                                />
                            </div>

                            {/* ПАНЕЛЬ УПРАВЛЕНИЯ ВИДЕО (Существующая) */}
                            <div className="control-deck">
                                <div className="deck-header">
                                    <div className="deck-title">
                                        <div className="deck-icon">⚡</div>
                                        <h3>Добавление интерактива в видео</h3>
                                    </div>
                                    <div style={{display: 'flex', gap: '10px'}}>
                                        <button className="btn btn-ghost" onClick={loadStats}><Icons.Stats /> Статистика</button>
                                        <button className={`btn btn-ai ${generatingVideos.includes(selectedVideo.id) ? 'generating' : ''}`} onClick={handleGenerateSubs} disabled={generatingVideos.includes(selectedVideo.id)}>
                                            {generatingVideos.includes(selectedVideo.id) ? <><Icons.Spinner /> Обработка ИИ...</> : <><Icons.AI /> AI Субтитры</>}
                                        </button>
                                        {selectedVideo.url.startsWith('/uploads/') && (
                                            <button className={`btn btn-ghost ${transcodingVideos.includes(selectedVideo.id) ? 'generating' : ''}`} onClick={handleTranscode} disabled={transcodingVideos.includes(selectedVideo.id)} title="Создать версии 360p и 720p для выбора качества">
                                                {transcodingVideos.includes(selectedVideo.id) ? <><Icons.Spinner /> Транскодирование...</> : <><Icons.Settings /> Качество</>}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 2, minWidth: '300px' }}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                                            <select className="deck-input" style={{ width: 'auto', marginBottom: 0, padding: '5px 10px', fontSize: '13px' }} value={eventType} onChange={(e) => setEventType(e.target.value as any)}>
                                                <option value="single_choice">Один из списка (Radio)</option>
                                                <option value="multiple_choice">Несколько ответов (Checkbox)</option>
                                                <option value="free_text">Открытый вопрос (ИИ Проверка)</option>
                                                <option value="info">Инфо-пауза (без ответа)</option>
                                            </select>
                                            <div style={{color: '#666', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px'}}><Icons.Time /> {currentTime.toFixed(1)}s</div>
                                        </div>
                                        {eventType === 'free_text' && (
                                            <div style={{ marginBottom: '15px', background: 'rgba(var(--primary-rgb), 0.05)', padding: '15px', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                                                <label style={{ fontSize: '13px', color: 'var(--primary)', display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontWeight: 'bold' }}><span>Точность (ИИ):</span><span>{aiThreshold}%</span></label>
                                                <input type="range" min="10" max="100" value={aiThreshold} onChange={e => setAiThreshold(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
                                            </div>
                                        )}
                                        <input className="deck-input" placeholder={eventType === 'info' ? "Текст карточки..." : "Текст вопроса..."} value={questionText} onChange={e => setQuestionText(e.target.value)} />
                                        {(eventType === 'single_choice' || eventType === 'multiple_choice') && (
                                            <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                                <h5 style={{ margin: '0 0 10px 0', color: '#888' }}>Варианты ответа:</h5>
                                                {options.map((opt, idx) => (
                                                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                                                        <input type={eventType === 'single_choice' ? 'radio' : 'checkbox'} checked={opt.isCorrect} onChange={(e) => handleOptionChange(idx, 'isCorrect', e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                                        <input className="deck-input" style={{ marginBottom: 0, flex: 1 }} placeholder={`Вариант ${idx + 1}`} value={opt.text} onChange={e => handleOptionChange(idx, 'text', e.target.value)} />
                                                        {options.length > 2 && <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => handleRemoveOption(idx)}>✕</button>}
                                                    </div>
                                                ))}
                                                <button className="btn btn-ghost" style={{ marginTop: '10px', fontSize: '12px' }} onClick={handleAddOption}>+ Добавить вариант</button>
                                            </div>
                                        )}
                                        {eventType === 'free_text' && <textarea className="deck-input" placeholder="Эталонный ответ для ИИ..." value={freeTextAnswer} onChange={e => setFreeTextAnswer(e.target.value)} style={{ minHeight: '80px', resize: 'vertical' }} />}
                                        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddEvent} disabled={isAddingEvent}>{isAddingEvent ? 'Сохранение...' : (editingEventId ? 'Сохранить изменения' : 'Добавить метку')}</button>
                                            {editingEventId && <button className="btn btn-ghost" onClick={() => { setEditingEventId(null); setQuestionText(''); setExplanation(''); }}>Отмена</button>}
                                        </div>
                                    </div>

                                    <div style={{ flex: 1, minWidth: '250px', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '30px' }}>
                                        <h4 style={{marginTop: 0, marginBottom: '20px', color: '#888'}}>Логика и видео</h4>
                                        {eventType !== 'info' && (
                                            <>
                                                <label className="toggle-wrapper" style={{ marginBottom: '15px' }}><input type="checkbox" className="toggle-input" checked={isStrict} onChange={e => setIsStrict(e.target.checked)} /><div className="toggle-track"><div className="toggle-thumb"></div></div><span className="toggle-label">Строгий режим</span></label>
                                                <div style={{ marginBottom: '15px' }}><label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Вес в баллах:</label><input type="number" className="deck-input" min="1" max="100" value={weight} onChange={e => setWeight(Number(e.target.value))} style={{ marginBottom: 0 }} /></div>
                                                <div style={{ marginBottom: '15px' }}><label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Откинуть при ошибке (сек):</label><input type="number" className="deck-input" placeholder="Напр. 120" value={rewindTo} onChange={e => setRewindTo(e.target.value ? Number(e.target.value) : '')} style={{ marginBottom: 0 }} /></div>
                                                <div style={{ marginBottom: '15px' }}><label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Объяснение при ошибке:</label><textarea className="deck-input" placeholder="Неверно, потому что..." value={explanation} onChange={e => setExplanation(e.target.value)} style={{ minHeight: '60px', marginBottom: 0, resize: 'vertical' }} /></div>
                                                <div style={{ borderTop: '1px solid #333', margin: '20px 0' }}></div>
                                            </>
                                        )}
                                        <label className="toggle-wrapper" style={{ marginBottom: '20px' }}><input type="checkbox" className="toggle-input" checked={selectedVideo.hideResults || false} onChange={(e) => handleUpdateSettings({ hideResults: e.target.checked })} /><div className="toggle-track"><div className="toggle-thumb"></div></div><span className="toggle-label">Скрыть результаты</span></label>
                                        <div><label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Попыток пересдачи (0 - безлимит):</label><input type="number" className="deck-input" min="0" value={selectedVideo.maxAttempts ?? 3} onChange={(e) => handleUpdateSettings({ maxAttempts: Number(e.target.value) })} style={{ marginBottom: 0 }} /></div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* СПИСОК МЕТОК ВИДЕО */}
                            {selectedVideo.events && selectedVideo.events.length > 0 && (
                                <div style={{ marginTop: '30px', background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #333', maxWidth: '1000px' }}>
                                    <h3 style={{ margin: '0 0 20px 0', color: '#fff' }}>Метки ({selectedVideo.events.length})</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {[...selectedVideo.events].sort((a, b) => a.time - b.time).map(ev => (
                                            <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a1a', padding: '15px', borderRadius: '8px', borderLeft: `3px solid ${ev.type === 'info' ? '#ffd700' : 'var(--primary)'}` }}>
                                                <div>
                                                    <strong style={{ color: ev.type === 'info' ? '#ffd700' : 'var(--primary)', marginRight: '10px' }}>{Math.floor(ev.time / 60)}:{(Math.floor(ev.time % 60)).toString().padStart(2, '0')}</strong>
                                                    <span style={{ color: '#eee' }}>{ev.question}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => handleEditClick(ev)}><Icons.Edit size={14}/></button>
                                                    <button className="btn btn-ghost" style={{ padding: '6px', color: '#ff4d4d' }} onClick={() => handleDeleteClick(ev.id)}><Icons.Trash size={14}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="empty-state"><h2>Выберите урок</h2><p>Нажмите на видео слева, чтобы начать редактирование.</p></div>
                    )
                ) : (
                    /* РЕДАКТОР ГЛОБАЛЬНЫХ ТЕСТОВ (НОВАЯ ВКЛАДКА) */
                    selectedTest ? (
                        <div style={{ width: '100%', maxWidth: '1000px' }}>
                            <div className="admin-header" style={{ marginBottom: '20px' }}>
                                <h1>{selectedTest.title}</h1>
                                <p>Добавляйте вопросы, которые студенты будут решать отдельно от видео.</p>
                            </div>

                            {/* КОНСТРУКТОР ВОПРОСА ДЛЯ ТЕСТА */}
                            <div className="control-deck">
                                <div className="deck-header">
                                    <div className="deck-title"><div className="deck-icon" style={{background: 'rgba(255, 215, 0, 0.1)', color: '#ffd700'}}><Icons.FileText size={16}/></div><h3>Новый вопрос в тест</h3></div>
                                </div>
                                <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 2, minWidth: '300px' }}>
                                        <div style={{marginBottom: '15px'}}>
                                            <select className="deck-input" style={{ width: '100%', marginBottom: 0, padding: '12px 16px' }} value={eventType} onChange={(e) => setEventType(e.target.value as any)}>
                                                <option value="single_choice">Один из списка (Radio)</option>
                                                <option value="multiple_choice">Несколько ответов (Checkbox)</option>
                                                <option value="free_text">Открытый вопрос (ИИ Проверка)</option>
                                            </select>
                                        </div>
                                        
                                        {eventType === 'free_text' && (
                                            <div style={{ marginBottom: '15px', background: 'rgba(var(--primary-rgb), 0.05)', padding: '15px', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                                                <label style={{ fontSize: '13px', color: 'var(--primary)', display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontWeight: 'bold' }}><span>Точность (ИИ):</span><span>{aiThreshold}%</span></label>
                                                <input type="range" min="10" max="100" value={aiThreshold} onChange={e => setAiThreshold(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
                                            </div>
                                        )}
                                        <input className="deck-input" placeholder="Текст вопроса..." value={questionText} onChange={e => setQuestionText(e.target.value)} />
                                        
                                        {(eventType === 'single_choice' || eventType === 'multiple_choice') && (
                                            <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                                <h5 style={{ margin: '0 0 10px 0', color: '#888' }}>Варианты ответа:</h5>
                                                {options.map((opt, idx) => (
                                                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                                                        <input type={eventType === 'single_choice' ? 'radio' : 'checkbox'} checked={opt.isCorrect} onChange={(e) => handleOptionChange(idx, 'isCorrect', e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                                        <input className="deck-input" style={{ marginBottom: 0, flex: 1 }} placeholder={`Вариант ${idx + 1}`} value={opt.text} onChange={e => handleOptionChange(idx, 'text', e.target.value)} />
                                                        {options.length > 2 && <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => handleRemoveOption(idx)}>✕</button>}
                                                    </div>
                                                ))}
                                                <button className="btn btn-ghost" style={{ marginTop: '10px', fontSize: '12px' }} onClick={handleAddOption}>+ Добавить вариант</button>
                                            </div>
                                        )}
                                        {eventType === 'free_text' && <textarea className="deck-input" placeholder="Эталонный ответ для ИИ..." value={freeTextAnswer} onChange={e => setFreeTextAnswer(e.target.value)} style={{ minHeight: '80px', resize: 'vertical' }} />}
                                    </div>
                                    <div style={{ flex: 1, minWidth: '250px', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '30px' }}>
                                        <div style={{ marginBottom: '15px' }}><label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Вес вопроса в баллах:</label><input type="number" className="deck-input" min="1" max="100" value={weight} onChange={e => setWeight(Number(e.target.value))} style={{ marginBottom: 0 }} /></div>
                                        <button className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={handleAddTestQuestion} disabled={isAddingEvent}>{isAddingEvent ? 'Сохранение...' : 'Сохранить вопрос'}</button>
                                    </div>
                                </div>
                            </div>

                            {/* СПИСОК ВОПРОСОВ ТЕСТА */}
                            {selectedTest.questions && selectedTest.questions.length > 0 && (
                                <div style={{ marginTop: '30px', background: '#111', borderRadius: '12px', padding: '20px', border: '1px solid #333' }}>
                                    <h3 style={{ margin: '0 0 20px 0', color: '#fff' }}>Вопросы ({selectedTest.questions.length})</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {selectedTest.questions.map((q, i) => (
                                            <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a1a', padding: '15px', borderRadius: '8px', borderLeft: `3px solid #ffd700` }}>
                                                <div>
                                                    <strong style={{ color: '#888', marginRight: '10px' }}>Вопрос {i + 1}.</strong>
                                                    <span style={{ color: '#eee' }}>{q.text}</span>
                                                    <span style={{ marginLeft: '10px', fontSize: '11px', color: '#666', background: '#222', padding: '2px 6px', borderRadius: '4px' }}>{q.type}</span>
                                                </div>
                                                <button className="btn btn-ghost" style={{ padding: '6px', color: '#ff4d4d' }} onClick={() => handleDeleteTestQuestion(q.id)}><Icons.Trash size={14}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="empty-state"><h2>Выберите тест</h2><p>Нажмите на тест слева, чтобы добавить в него вопросы.</p></div>
                    )
                )}
            </main>
        </div>
    </div>
  );
};