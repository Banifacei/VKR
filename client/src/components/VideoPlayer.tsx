import { useState, useRef, useEffect, useMemo } from 'react';
import { sendAnswer, resetProgress, savePlaybackProgress, getPlaybackProgress } from '../api/videoApi';
import './VideoPlayer.css';
import type { IInteractiveEvent, ISubtitle } from '../types';
import { TestModeButton } from './TestModeButton'; // <--- ИМПОРТ НОВОЙ КНОПКИ

const Icons = {
  Play: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3" fill="currentColor" /></svg>,
  Pause: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" fill="currentColor" /><rect x="14" y="4" width="4" height="16" fill="currentColor" /></svg>,
  VolumeHigh: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>,
  VolumeMuted: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>,
  Settings: () => <svg className="icon-settings" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  Pip: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4" /><rect x="13" y="11" width="7" height="5" /></svg>,
  Fullscreen: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>,
  Refresh: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  Captions: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" /><line x1="8" y1="15" x2="8" y2="15" /><line x1="16" y1="15" x2="16" y2="15" /></svg>,
  Chapters: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
};

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

interface VideoPlayerProps {
  sources: { quality: string; url: string; subtitles?: ISubtitle[] }[];
  title?: string;
  events?: IInteractiveEvent[];
  videoId?: number;
  userId?: string;
  userRole?: string;
  hideResults?: boolean;
  maxAttempts?: number;
  onResetTest?: () => void;
  onTimeUpdate?: (time: number) => void;
  onRefreshEvents?: () => Promise<IInteractiveEvent[]>;
  isExternalTestMode?: boolean;
  onToggleTestMode?: () => void;
}

interface IAnswerResult {
    event: IInteractiveEvent;
    userAnswer: string;
    isCorrect: boolean;
    similarity?: number | null;
}

export const VideoPlayer = ({ sources, title, events = [], videoId, userId = 'guest', userRole = 'student', hideResults = false, maxAttempts, onResetTest, onTimeUpdate, onRefreshEvents,isExternalTestMode = false,onToggleTestMode }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const [localEvents, setLocalEvents] = useState<IInteractiveEvent[]>(events);    
  const safeSource = (sources && sources.length > 0) ? sources[0] : { quality: 'Error', url: '', subtitles: [] };
  const [currentSource, setCurrentSource] = useState(safeSource);
  const [sessionResults, setSessionResults] = useState<IAnswerResult[]>([]);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hasNewAnswers, setHasNewAnswers] = useState(false);

  const showToast = (msg: string) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 4000);
  }
  // States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  const [isSpeedingUp, setIsSpeedingUp] = useState(false);  // Показывает плашку "2x"
  const longPressTimerRef = useRef<number | null>(null);    // Таймер зажатия
  const wasLongPressRef = useRef(false);                    // Флаг: было ли удержание?
  const originalRateRef = useRef(1);                        // Запоминаем исходную скорость

  const isLongPressActiveRef = useRef(false); // Флаг: сейчас активно удержание?
  const wasPlayingRef = useRef(false);        // Флаг: играло ли видео ДО нажатия?

  const [isFullscreen] = useState(false);
  const [isZoomFill, setIsZoomFill] = useState(false);
  const [currentMenu, setCurrentMenu] = useState<'main' | 'speed' | 'quality' | 'captions' | 'chapters'>('main');
  const [activeSubtitle, setActiveSubtitle] = useState<string>('off');

  // Logic States
  const [activeEvent, setActiveEvent] = useState<IInteractiveEvent | null>(null);
  const [processedEventIds, setProcessedEventIds] = useState<number[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string | string[]>('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [score, setScore] = useState(0);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const lastSavedTimeRef = useRef<number>(0);
  // --- HOVER STATE (Для тултипа и подсветки блоков) ---
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const [hoverChapter, setHoverChapter] = useState<IInteractiveEvent | null>(null);

  // Разделяем события
  const questions = localEvents.filter(e => e.type !== 'chapter');
  const chapters = localEvents.filter(e => e.type === 'chapter').sort((a, b) => a.time - b.time);
  const hasQuestions = events && events.some(e => ['single_choice', 'multiple_choice', 'free_text', 'question'].includes(e.type));
  // --- NEW: Активная глава (для текста внизу) ---
  const activeChapter = chapters.slice().reverse().find(chap => chap.time <= currentTime);
  const totalPossibleScore = questions.reduce((sum, q) => sum + (q.weight || 1), 0);
  // --- ЗАКРЫТИЕ НАСТРОЕК ПО КЛИКУ ВНЕ МЕНЮ ---
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          // Если клик был НЕ по меню настроек и НЕ по кнопке-шестеренке
          if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
              setShowSettings(false);
          }
      };

      // Вешаем слушатель только когда меню открыто
      if (showSettings) {
          document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
      };
  }, [showSettings]);
  useEffect(() => {
        setLocalEvents(events);
    }, [events]);
    
  useEffect(() => {
    const fetchProgress = async () => {
        if (!videoId || !userId) return;
        try {
            const data = await getPlaybackProgress(videoId);
            if (data) {
                // 1. Восстанавливаем время
                if (data.lastTime > 0 && videoRef.current) {
                    videoRef.current.currentTime = data.lastTime;
                    lastSavedTimeRef.current = data.lastTime;
                    setCurrentTime(data.lastTime);
                }
                setAttemptsUsed(data.attemptsUsed || 0);
                // 2. ВОССТАНАВЛИВАЕМ ИСТОРИЮ ОТВЕТОВ
                if (data.responses && data.responses.length > 0) {
                    // Конвертируем данные с сервера в формат нашего стейта
                    const historyResults = data.responses.map((r: any) => ({
                        event: r.event,
                        userAnswer: r.answer,
                        isCorrect: r.isCorrect,
                        similarity: r.similarity
                    }));
                    
                    setSessionResults(historyResults);
                    
                    // Самое главное: закидываем ID решенных вопросов в память, 
                    // чтобы они исчезли с таймлайна и не всплывали!
                    setProcessedEventIds(data.responses.map((r: any) => r.eventId));

                    // Пересчитываем заработанные баллы
                    const restoredScore = historyResults.reduce((sum: number, r: any) => {
                        return r.isCorrect ? sum + (r.event?.weight || 1) : sum;
                    }, 0);
                    setScore(restoredScore);
                }
            }
        } catch (e) {
            console.error("Ошибка загрузки прогресса", e);
        }
    };
    
    fetchProgress();
  }, [videoId, userId]);

  const handleResetAction = async () => {
    if (!videoId) return;

    // Локальная блокировка: если лимит исчерпан — даже не стучимся на сервер
    if (maxAttempts && maxAttempts > 0 && attemptsUsed >= maxAttempts) {
        showToast('❌ Лимит попыток исчерпан!');
        setShowSettings(false);
        return;
    }

    try {
        await resetProgress(videoId, userId);
        setProcessedEventIds([]);
        setSessionResults([]);
        setScore(0);
        setShowEndScreen(false);
        setActiveEvent(null);
        setAttemptsUsed(prev => prev + 1);
        setHasNewAnswers(false);
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play();
        }
        if (onResetTest) onResetTest();
        setShowSettings(false);
        showToast('🔄 Прогресс сброшен. Попытка потрачена!');
        }catch (e: any) {
        const msg = e.response?.data?.message || "Не удалось сбросить прогресс";
        showToast(`❌ ${msg}`);
        setShowSettings(false);
    }
  };
  useEffect(() => {
        if (!onRefreshEvents) return; // Если функцию не передали, не делаем ничего

        const interval = setInterval(async () => {
            try {
                // Тихо скачиваем новые события
                const freshEvents = await onRefreshEvents();
                
                // ИСПОЛЬЗУЕМ JSON.stringify, ЧТОБЫ ЛОВИТЬ НЕ ТОЛЬКО УДАЛЕНИЕ, НО И РЕДАКТИРОВАНИЕ ТЕКСТА
                const currentHash = JSON.stringify(localEvents);
                const freshHash = JSON.stringify(freshEvents);
                
                if (currentHash !== freshHash) {
                    console.log('🔄 Нашли изменения (новые, удаленные или отредактированные вопросы)! Обновляем таймлайн...');
                    setLocalEvents(freshEvents);
                }
            } catch (e) {
                // Игнорируем ошибки сети в фоне
            }
        }, 10000); // Каждые 10 секунд

        return () => clearInterval(interval);
    }, [localEvents, onRefreshEvents]);

  useEffect(() => {
      if (sources && sources.length > 0) {
          setCurrentSource(prev => {
              // Если URL видео не изменился, мы НЕ ПЕРЕЗАГРУЖАЕМ источник,
              // а только аккуратно подмешиваем новые субтитры.
              // Это спасает от сброса плеера и ошибки AbortError!
              if (prev.url === sources[0].url) {
                  // Если субтитры обновились, меняем их
                  if (JSON.stringify(prev.subtitles) !== JSON.stringify(sources[0].subtitles)) {
                      return { ...prev, subtitles: sources[0].subtitles };
                  }
                  return prev; // Вообще ничего не меняем
              }
              return sources[0]; // Если это реально другое видео (следующий урок), тогда грузим
          });
      }
  }, [sources]);

  useEffect(() => {
        if (videoRef.current) {
            const tracks = videoRef.current.textTracks;
            
            // 1. Сначала принудительно переводим ВСЕ дорожки в disabled
            for (let i = 0; i < tracks.length; i++) {
                tracks[i].mode = 'disabled';
            }

            // 2. Только если мы не в режиме "off", включаем конкретную
            if (activeSubtitle !== 'off') {
                const trackToShow = Array.from(tracks).find(t => t.language === activeSubtitle);
                if (trackToShow) {
                    trackToShow.mode = 'showing';
                }
            }
        }
    }, [activeSubtitle, currentSource]);

  useEffect(() => { if (videoRef.current) videoRef.current.volume = volume; }, [volume]);
  useEffect(() => {
        return () => {
            // Сработает, когда компонент удаляется (переход на другую страницу)
            if (videoId && videoRef.current && !videoRef.current.ended) {
            savePlaybackProgress(videoId, videoRef.current.currentTime, false);
            }
        };
    }, [videoId]);

    // --- УМНЫЙ АНТИ-СКИП: Ищет нерешенные вопросы на пути перемотки ---
  const getBlockingEventTime = (fromTime: number, toTime: number) => {
      // Преподы и админы мотают как хотят!
      if (userRole === 'teacher' || userRole === 'admin' || isExternalTestMode) return null; 

      // Ищем все вопросы, которые находятся между текущим временем и куда кликнули, 
      // и на которые студент еще НЕ ответил
      const blockingEvents = questions.filter(ev => 
          ev.time > fromTime && 
          ev.time <= toTime && 
          !processedEventIds.includes(ev.id)
      );

      if (blockingEvents.length > 0) {
          // Возвращаем время самого ПЕРВОГО вопроса на пути
          return Math.min(...blockingEvents.map(ev => ev.time)); 
      }
      return null;
  };

  // --- ЛОГИКА НАЖАТИЯ (Smart Touch/Click) ---
  
  const handlePressStart = () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      
      // Запоминаем состояние (играло или нет), чтобы вернуть его при отмене
      if (videoRef.current) {
          wasPlayingRef.current = !videoRef.current.paused;
      }
      
      isLongPressActiveRef.current = false;

      longPressTimerRef.current = window.setTimeout(() => {
          if (videoRef.current) {
              isLongPressActiveRef.current = true; // Это удержание
              originalRateRef.current = videoRef.current.playbackRate;
              videoRef.current.playbackRate = 2; // Врубаем 2x
              setIsSpeedingUp(true);

              // Если было на паузе - запускаем, чтобы видеть ускорение
              if (videoRef.current.paused) videoRef.current.play();
          }
      }, 300);
  };
  
  // Вызывается ТОЛЬКО когда отпустили кнопку мыши НАД видео (MouseUp / TouchEnd)
  const handlePressEnd = () => {
      // 1. Сбрасываем таймер (если не успел сработать long press)
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }

      // 2. Если было ускорение (2x) -> Выключаем его
      if (isLongPressActiveRef.current) {
          if (videoRef.current) {
              videoRef.current.playbackRate = originalRateRef.current;
              setIsSpeedingUp(false);
              
              // Возвращаем паузу, если видео стояло
              if (!wasPlayingRef.current) videoRef.current.pause();
          }
          isLongPressActiveRef.current = false;
      } 
      // 3. Если ускорения НЕ было -> Значит это обычный КЛИК -> Пауза/Плей
      else {
          if (!activeEvent) {
              togglePlay();
          }
      }
  };

  // Вызывается, если мышь ушла с видео или тач сорвался (MouseLeave / TouchCancel)
  // ОТЛИЧИЕ: Здесь мы НИКОГДА не делаем togglePlay (не ставим на паузу/плей при уходе мыши)
  const handlePressCancel = () => {
      // Сбрасываем таймер
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }

      // Если мы успели войти в режим 2x -> выключаем его
      if (isLongPressActiveRef.current) {
          if (videoRef.current) {
              videoRef.current.playbackRate = originalRateRef.current;
              setIsSpeedingUp(false);
              
              // Возвращаем как было
              if (!wasPlayingRef.current) videoRef.current.pause();
          }
          isLongPressActiveRef.current = false;
      }
      
      // ВАЖНО: Блок else { togglePlay() } здесь отсутствует!
      // Если мы просто провели мышкой и ушли - ничего не произойдет.
  };

  const handleAnswerSubmit = async () => {
      if (!activeEvent) return;
      
      let isCorrectLocally = false;
      let answerString = '';

      // Локальная проверка в зависимости от типа вопроса
      if (activeEvent.type === 'info') {
          handleContinue(true); 
          return;
      } else if (activeEvent.type === 'single_choice') {
          const selectedOpt = activeEvent.options?.find((o: any) => o.text === currentAnswer);
          isCorrectLocally = !!selectedOpt?.isCorrect;
          answerString = currentAnswer as string;
      } else if (activeEvent.type === 'multiple_choice') {
          const selectedArr = currentAnswer as string[];
          const correctOpts = activeEvent.options?.filter((o: any) => o.isCorrect).map((o: any) => o.text) || [];
          isCorrectLocally = selectedArr.length === correctOpts.length && selectedArr.every(v => correctOpts.includes(v));
          answerString = selectedArr.join(', ');
      } else if (activeEvent.type === 'free_text') {
          isCorrectLocally = true; 
          answerString = currentAnswer as string;
      } else {
          isCorrectLocally = activeEvent.correctAnswer === currentAnswer;
          answerString = currentAnswer as string;
      }

      try {
          let serverIsCorrect = isCorrectLocally;
          let similarity = null;

          // 1. Отправляем на сервер и ждем ИИ
          if (videoId) {
              const res = await sendAnswer(videoId, activeEvent.id, answerString);
              serverIsCorrect = res.data.isCorrect; 
              if (res.data.similarity !== undefined) {
                  similarity = res.data.similarity;
              }
          }

          // 2. СОХРАНЯЕМ В ЛОКАЛЬНУЮ ИСТОРИЮ (ВАЖНО: это должно быть ЗДЕСЬ, внутри try)
          setSessionResults(prev => {
              const filtered = prev.filter(r => r.event.id !== activeEvent.id);
              return [...filtered, {
                  event: activeEvent,
                  userAnswer: answerString,
                  isCorrect: serverIsCorrect,
                  similarity: similarity
              }];
          });
          setHasNewAnswers(true);
          // 3. Продолжаем работу плеера
          if (hideResults) {
              handleContinue(serverIsCorrect);
              return;
          }

          setFeedback(serverIsCorrect ? 'correct' : 'incorrect');
          if (serverIsCorrect) {
              setTimeout(() => handleContinue(true), 1500);
          }

      } catch (e) {
          console.error(e);
          handleContinue(false);
      }
  };

  const handleContinue = (wasCorrect: boolean) => {
      // Теперь прибавляем не +1, а вес вопроса (или 1 по умолчанию)
      if (wasCorrect) setScore(s => s + (activeEvent?.weight || 1));
      setFeedback(null);
      // Очищаем поле ответа для следующего вопроса
      setCurrentAnswer(activeEvent?.type === 'multiple_choice' ? [] : '');
      setActiveEvent(null);
      videoRef.current?.play();
  };
  const handleRewind = () => {
      if (activeEvent?.rewindTo !== undefined && videoRef.current) {
          videoRef.current.currentTime = activeEvent.rewindTo;
          // Удаляем из решенных, чтобы вопрос задался снова, когда студент досмотрит
          setProcessedEventIds(prev => prev.filter(id => id !== activeEvent.id));
      }
      setFeedback(null);
      setCurrentAnswer(activeEvent?.type === 'multiple_choice' ? [] : '');
      setActiveEvent(null);
      videoRef.current?.play();
  };
  const handleRetry = () => {
      setFeedback(null);
      setCurrentAnswer(activeEvent?.type === 'multiple_choice' ? [] : '');
  };
// --- Хендлер для ползунка громкости ---
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
  };

  // --- ОБНОВЛЕНО: Сохранение прогресса при обновлении времени ---
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;

    // Защита от читеров, которые меняют время через консоль браузера
    if (time > currentTime + 1.5) { // Если время прыгнуло больше чем на 1.5 секунды
        const blockTime = getBlockingEventTime(currentTime, time);
        if (blockTime !== null) {
            videoRef.current.currentTime = Math.max(currentTime, blockTime - 0.2);
            return; 
        }
    }

    setCurrentTime(time);

    if (onTimeUpdate) onTimeUpdate(time);

    // НОВАЯ ЛОГИКА: Сохраняем каждые 30 секунд (не чаще)
    if (videoId && Math.abs(time - lastSavedTimeRef.current) > 30) {
        savePlaybackProgress(videoId, time, false).catch(e => console.error(e));
        lastSavedTimeRef.current = time;
    }

    if (questions.length > 0 && !activeEvent && !showEndScreen && !isExternalTestMode) {
        const eventToTrigger = questions.find(ev => 
            Math.abs(ev.time - time) < 0.5 && !processedEventIds.includes(ev.id)
        );
        if (eventToTrigger) {
            videoRef.current.pause();
            setIsPlaying(false);
            setActiveEvent(eventToTrigger);
            setCurrentAnswer(eventToTrigger.type === 'multiple_choice' ? [] : '');
            setShowControls(false);
            setProcessedEventIds(prev => [...prev, eventToTrigger.id]);
        }
    }
  };

  const jumpToChapter = (time: number) => {
      if (videoRef.current) {
          videoRef.current.currentTime = time;
          videoRef.current.play();
          setIsPlaying(true);
          setShowSettings(false);
      }
  };

  // --- ОБНОВЛЕНО: Сохранение при завершении ---
  const handleVideoEnd = () => {
      // Сохраняем статус "просмотрено"
      if (videoId) {
          savePlaybackProgress(videoId, duration, true).catch(e => console.error(e));
      }

      setIsPlaying(false); 
      setShowEndScreen(true); 
      setShowControls(false);
      
      if (videoRef.current) videoRef.current.playbackRate = 1;
      setIsSpeedingUp(false);
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }
  };
  
  const replayVideo = () => {
      setShowEndScreen(false); 
      setIsSpeedingUp(false);
      wasLongPressRef.current = false;
      setHasNewAnswers(false);
      if (videoRef.current) { 
          videoRef.current.playbackRate = 1; // 👈 Принудительно 1x
          videoRef.current.currentTime = 0; 
          videoRef.current.play(); 
      }
  };

  const showControlsTemporarily = () => {
    if (activeEvent) return;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setShowControls(true);
    timeoutRef.current = window.setTimeout(() => { if (!showSettings) setShowControls(false); }, 3000);
  };

  const togglePlay = () => { 
      if (wasLongPressRef.current) {
          wasLongPressRef.current = false;
          return;
      }
      
      if (!videoRef.current || activeEvent) return; 

      if (showEndScreen) {
          replayVideo();
          return;
      }

      videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause(); 
      showControlsTemporarily(); 
  };

  const skipTime = (amount: number) => {
    if (videoRef.current && !activeEvent) {
        const currentVideoTime = videoRef.current.currentTime; // Берем самое свежее время
        let targetTime = currentVideoTime + amount;
        
        // Блокируем читерство
        if (targetTime > currentVideoTime) {
            const blockTime = getBlockingEventTime(currentVideoTime, targetTime);
            if (blockTime !== null) {
                targetTime = Math.max(currentVideoTime, blockTime - 0.2);
                showToast('⚠️ Сначала нужно ответить на вопрос!');
            }
        }

        videoRef.current.currentTime = targetTime;
        showControlsTemporarily();

        // 👇 Прячем финальный экран, если перемотали назад стрелками
        if (showEndScreen) {
            setShowEndScreen(false);
            setHasNewAnswers(false);
        }
    }
  };

    const toggleSubtitles = () => {
    setActiveSubtitle(prev => {
        if (prev !== 'off') {
            return 'off';
        } else {
            const firstLang = currentSource.subtitles?.[0]?.lang || 'ru';
            return firstLang;
        }
    });
};

// 2. Добавляем функцию двойного клика
const handleVideoDoubleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        toggleFullscreen();
    };
  const toggleFullscreen = () => { if (!document.fullscreenElement) containerRef.current?.requestFullscreen(); else document.exitFullscreen(); };
  
  // 1. Вычисляем сегменты (Главы)
  const timelineSegments = useMemo(() => {
    if (!duration) return [];
    
    // Собираем точки времени: 0, начала глав, конец видео
    const sortedChapters = [...chapters].sort((a, b) => a.time - b.time);
    const points = [0, ...sortedChapters.map(c => c.time), duration];
    // Убираем дубликаты и сортируем
    const uniquePoints = Array.from(new Set(points)).sort((a, b) => a - b);

    const segs: { index: number; start: number; end: number; duration: number; title: string }[] = [];
    for (let i = 0; i < uniquePoints.length - 1; i++) {
      const start = uniquePoints[i];
      const end = uniquePoints[i + 1];
      const segDuration = end - start;
      
      // Находим название главы для этого куска
      const relatedChapter = sortedChapters.slice().reverse().find(c => c.time <= start);

      segs.push({
        index: i,
        start,
        end,
        duration: segDuration, // Используем duration для flex-grow
        title: relatedChapter ? relatedChapter.question : (i === 0 ? 'Вступление' : `Часть ${i + 1}`)
      });
    }
    return segs;
  }, [chapters, duration]);

  // 2. Хелпер для расчета заливки ВНУТРИ конкретного куска
  const getSegmentProgress = (segStart: number, segEnd: number) => {
    if (currentTime >= segEnd) return 100; // Кусок пройден
    if (currentTime <= segStart) return 0; // Кусок не начался
    // Кусок в процессе
    return ((currentTime - segStart) / (segEnd - segStart)) * 100;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => { 
      if (activeEvent) return; // Убрали блокировку

      const rect = e.currentTarget.getBoundingClientRect(); 
      const pos = (e.clientX - rect.left) / rect.width; 
      let targetTime = pos * duration; 

      if (targetTime > currentTime) {
          const blockTime = getBlockingEventTime(currentTime, targetTime);
          if (blockTime !== null) {
              targetTime = Math.max(currentTime, blockTime - 0.2);
              showToast('⚠️ Сначала нужно ответить на вопрос!');
          }
      }

      if (videoRef.current && duration) {
          videoRef.current.currentTime = targetTime; 
          // Если кликнули по таймлайну - прячем финальный экран!
          if (showEndScreen) {
              setShowEndScreen(false);
              setHasNewAnswers(false);
          }
      }
  };

  // --- NEW: Обработка движения мыши по прогресс-бару (для тултипа и подсветки) ---
  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = e.clientX - rect.left;
      const width = rect.width;
      const time = (pos / width) * duration;
      
      setHoverX(pos);
      setHoverTime(time);

      // Ищем главу под курсором
      const chap = chapters.slice().reverse().find(c => c.time <= time);
      setHoverChapter(chap || null);
  };

  const handleProgressMouseLeave = () => {
      setHoverTime(null);
      setHoverChapter(null);
  };


// Hotkeys
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
      const isInput = 
          target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.tagName === 'SELECT' || 
          target.isContentEditable;

      if (isInput) return;
    if (activeEvent) return;

    const code = e.code;

    // ПРОБЕЛ или K: Пауза/Плей или Ускорение
    if (code === 'Space' || code === 'KeyK') { 
        e.preventDefault(); // Чтобы страница не скроллилась
        if (!e.repeat) { 
            handlePressStart();
        }
    }

    // Перемотка
    if (code === 'KeyJ') skipTime(-10);
    if (code === 'KeyL') skipTime(10);
    if (code === 'ArrowLeft') skipTime(-5);
    if (code === 'ArrowRight') skipTime(5);
    if (code === 'KeyC') {
        e.preventDefault();
        toggleSubtitles();
    }
    // ГРОМКОСТЬ (Стрелки вверх/вниз)
    if (code === 'ArrowUp') { 
        e.preventDefault(); 
        setVolume(v => Math.min(1, v + 0.05)); 
        setIsMuted(false); 
        showControlsTemporarily(); 
    }
    if (code === 'ArrowDown') { 
        e.preventDefault(); 
        setVolume(v => Math.max(0, v - 0.05)); 
        showControlsTemporarily(); 
    }

    // Мут и Фуллскрин
    if (code === 'KeyM') { setIsMuted(prev => !prev); showControlsTemporarily(); }
    if (code === 'KeyF') toggleFullscreen();
    
  };
  
  const handleKeyUp = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
        if (isInput) return;

        if (e.code === 'Space' || e.code === 'KeyK') { e.preventDefault(); handlePressEnd(); }
    };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  
  return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
  };
}, [activeEvent, isSpeedingUp, volume, showEndScreen, processedEventIds, localEvents]);
  
  const hasSubtitles = currentSource.subtitles && currentSource.subtitles.length > 0;
  const hasChapters = chapters.length > 0;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

const renderMainMenu = () => (
  <div className="menu-list">
    {/* 1. Скорость */}
    <div className="menu-item" onClick={() => setCurrentMenu('speed')}>
      <span className="menu-label">Скорость</span>
      <span className="menu-value">{playbackRate}x ›</span>
    </div>

    {/* 2. Субтитры */}
    {hasSubtitles && (
      <div className="menu-item" onClick={() => setCurrentMenu('captions')}>
        <span className="menu-label">Субтитры</span>
        <span className="menu-value">{activeSubtitle === 'off' ? 'Выкл.' : activeSubtitle.toUpperCase()} ›</span>
      </div>
    )}

    {/* 3. Главы */}
    {hasChapters && (
      <div className="menu-item" onClick={() => setCurrentMenu('chapters')}>
        <span className="menu-label">Главы</span>
        <span className="menu-value">{chapters.length} шт ›</span>
      </div>
    )}

    {/* 4. Зум */}
    <div className="menu-item" onClick={() => setIsZoomFill(!isZoomFill)}>
      <span className="menu-label">Заполнить экран</span>
      <span className={`menu-status ${isZoomFill ? 'active' : ''}`}>{isZoomFill ? 'Вкл.' : 'Выкл.'}</span>
    </div>

    {onToggleTestMode && hasQuestions && (
        <TestModeButton 
            isExternalMode={isExternalTestMode} 
            onToggle={() => {
                onToggleTestMode();
                setShowSettings(false); // Закрываем меню настроек
            }} 
        />
    )}

    <div className="menu-divider" />

    {/* 6. КНОПКА СБРОСА (Оставляем одну здесь) */}
    <div 
        className={`menu-item reset-item ${maxAttempts && attemptsUsed >= maxAttempts ? 'disabled' : ''}`} 
        onClick={handleResetAction}
    >
      <span className="menu-label" style={{ color: maxAttempts && attemptsUsed >= maxAttempts ? '#666' : '#ff4d4d' }}>
          Сбросить прогресс 
          {maxAttempts && maxAttempts > 0 ? ` (Осталось: ${Math.max(0, maxAttempts - attemptsUsed)})` : ''}
      </span>
    </div>
   </div>
);

  return (
    <div ref={containerRef} className={`yt-player-container ${isZoomFill ? 'zoom-active' : ''} ${isFullscreen ? 'is-fullscreen' : ''}`} onMouseMove={showControlsTemporarily} onMouseLeave={() => !showSettings && setShowControls(false)}>
      {/* --- ОВЕРЛЕЙ ИНТЕРАКТИВА (ИСПРАВЛЕННЫЙ) --- */}
      {activeEvent && (
        <div 
            className="interaction-overlay"
            style={{ 
                // Динамический отступ: если панель видна, сдвигаем карточку вверх на 90px
                paddingBottom: showControls ? '90px' : '20px',
                paddingTop: '20px',
                boxSizing: 'border-box',
                transition: 'padding 0.3s ease' // Плавная анимация движения
            }}
        >
            <div 
                className={`interaction-card ${feedback ? feedback : ''}`}
                style={{ maxHeight: '100%', overflowY: 'auto' }} // Включаем скролл, если карточка огромная
            >
                
                {/* 1. Блок Успеха: показываем только если ответ верный и результаты не скрыты */}
                {feedback === 'correct' && !hideResults && (
                    <div className="feedback-icon">✅ Верно!</div>
                )}
                
                {/* 2. Блок Ошибки: показываем пояснение и кнопки действий */}
                {feedback === 'incorrect' && !hideResults && (
                    <div>
                        <div className="feedback-icon">❌ Ошибка</div>
                        {activeEvent.explanation && <div className="explanation-box">{activeEvent.explanation}</div>}
                        
                        <div style={{ marginTop: '25px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            {activeEvent.rewindTo !== undefined && activeEvent.rewindTo !== null ? (
                                <button className="primary-btn" onClick={handleRewind}>🔙 Пересмотреть фрагмент</button>
                            ) : activeEvent.isStrict ? (
                                <button className="primary-btn" onClick={handleRetry}>🔄 Попробовать снова</button>
                            ) : (
                                <button className="primary-btn" style={{background: '#444'}} onClick={() => handleContinue(false)}>Пропустить ⏭</button>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Само задание (до ответа) */}
                {!feedback && (
                    <>
                        <h3 style={{color: '#00aeef'}}>
                            {activeEvent.type === 'info' ? '💡 Информация' : '❓ Вопрос'}
                        </h3>
                        <p className="question-text">{activeEvent.question}</p>
                        
                        {/* 1. Один вариант (Radio) или старый тип */}
                        {(activeEvent.type === 'single_choice' || activeEvent.type === 'question') && (
                            <div className="options-list">
                                {activeEvent.options?.map((opt: any, idx: number) => {
                                    // Поддержка и старых строк, и новых объектов
                                    const text = typeof opt === 'string' ? opt : opt.text;
                                    return (
                                        <label key={idx} className={`option-label-interactive ${currentAnswer === text ? 'selected' : ''}`}>
                                            <input type="radio" checked={currentAnswer === text} onChange={() => setCurrentAnswer(text)} />
                                            {text}
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {/* 2. Множественный выбор (Checkbox) */}
                        {activeEvent.type === 'multiple_choice' && (
                            <div className="options-list">
                                {activeEvent.options?.map((opt: any, idx: number) => {
                                    const text = typeof opt === 'string' ? opt : opt.text;
                                    const isChecked = Array.isArray(currentAnswer) && currentAnswer.includes(text);
                                    return (
                                        <label key={idx} className={`option-label-interactive ${isChecked ? 'selected' : ''}`}>
                                            <input 
                                                type="checkbox" 
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    const arr = Array.isArray(currentAnswer) ? [...currentAnswer] : [];
                                                    if (e.target.checked) arr.push(text);
                                                    else {
                                                        const i = arr.indexOf(text);
                                                        if (i > -1) arr.splice(i, 1);
                                                    }
                                                    setCurrentAnswer(arr);
                                                }}
                                            />
                                            {text}
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {/* 3. Открытый вопрос (Textarea) */}
                        {activeEvent.type === 'free_text' && (
                            <textarea 
                                className="modern-textarea"
                                placeholder="Введите ваш ответ..."
                                value={currentAnswer as string}
                                onChange={(e) => setCurrentAnswer(e.target.value)}
                            />
                        )}

                        {/* 4. Инфо-карточка (Пояснение) */}
                        {activeEvent.type === 'info' && activeEvent.explanation && (
                             <div className="explanation-box info-box">{activeEvent.explanation}</div>
                        )}

                        <div style={{ marginTop: '25px' }}>
                            {activeEvent.type === 'info' ? (
                                <button className="primary-btn" onClick={handleAnswerSubmit}>Понятно, продолжить</button>
                            ) : (
                                <button 
                                    className="primary-btn" 
                                    onClick={handleAnswerSubmit}
                                    disabled={
                                        ((activeEvent.type === 'single_choice' || activeEvent.type === 'question') && !currentAnswer) ||
                                        (activeEvent.type === 'multiple_choice' && (currentAnswer as string[]).length === 0) ||
                                        (activeEvent.type === 'free_text' && !(currentAnswer as string).trim())
                                    }
                                >
                                    Ответить
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
      )}

      {showEndScreen && (() => {
          // Вычисляем, нужно ли показывать компактный экран. 
          // Показывать если: в видео вообще нет вопросов ИЛИ это пересмотр старых результатов
          const hasTestQuestions = questions.filter(q => q.type !== 'info').length > 0;
          const isCompactEndScreen = !hasTestQuestions || (sessionResults.length > 0 && !hasNewAnswers);

          return (
            <div 
                className="interaction-overlay"
                style={{ 
                    paddingBottom: showControls ? '90px' : '20px',
                    paddingTop: '20px',
                    boxSizing: 'border-box',
                    transition: 'padding 0.3s ease'
                }}
                onClick={(e) => {
                    // Если юзер кликнул по пустому фону мимо карточки -> Перезапускаем!
                    if (e.target === e.currentTarget) {
                        togglePlay();
                    }
                }}
            >
                <div 
                    className={`interaction-card ${!isCompactEndScreen && !hideResults ? 'end-screen-large' : ''}`}
                    style={{ maxHeight: '100%', overflowY: 'auto' }}
                >
                    <h3 style={{ marginBottom: '20px' }}>Урок завершен! 🎉</h3>
                    
                    {isCompactEndScreen ? (
                        /* МИНИ-ЭКРАН ДЛЯ ПЕРЕСМОТРА */
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <p style={{ color: '#aaa', marginBottom: '20px' }}>
                                {!hasTestQuestions 
                                    ? 'Надеемся, лекция была полезной!' 
                                    : 'Вы уже успешно прошли тестирование к этому уроку.'}
                            </p>
                            <button className="primary-btn" onClick={replayVideo} style={{ padding: '10px 20px' }}>
                                <Icons.Refresh /> Смотреть лекцию заново
                            </button>
                        </div>
                    ) : !hideResults ? (
                        /* ПОЛНЫЙ ЭКРАН С РЕЗУЛЬТАТАМИ (Показывается только сразу после теста) */
                        <div className="results-container">
                            <div className="score-header">
                                <div className="score-circle"><span>{score}</span><small>из {totalPossibleScore}</small></div>
                                <div className="score-stats">
                                    <p>Всего вопросов: <strong>{questions.filter(q => q.type !== 'info').length}</strong></p>
                                    <p style={{color: '#4dff88'}}>Верных ответов: <strong>{sessionResults.filter(r => r.isCorrect).length}</strong></p>
                                    <p style={{color: '#ff4d4d'}}>Ошибок: <strong>{sessionResults.filter(r => !r.isCorrect).length}</strong></p>
                                </div>
                                <div className="score-actions">
                                    <button className="primary-btn" onClick={replayVideo} style={{ padding: '10px 16px', fontSize: '13px' }}>
                                        <Icons.Refresh /> Смотреть лекцию заново
                                    </button>
                                </div>
                            </div>
                            
                            {sessionResults.length > 0 && (
                                <div className="results-list">
                                    {sessionResults.map((res, i) => (
                                        <div key={i} className={`result-row ${res.isCorrect ? 'correct' : 'incorrect'}`}>
                                            <div className="res-q">{res.event.question}</div>
                                            <div className="res-a">Ваш ответ: <span>{res.userAnswer}</span></div>
                                            <div className="res-meta">
                                                <span className="res-status">{res.isCorrect ? '✅ Верно' : '❌ Ошибка'}</span>
                                                {res.event.type === 'free_text' && res.similarity !== null && res.similarity !== undefined && (
                                                    <span className="res-ai">ИИ-Оценка: {res.similarity}%</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                            <p style={{marginTop: '20px', color: '#aaa'}}>Ваши ответы успешно сохранены и отправлены преподавателю.</p>
                            <button className="primary-btn" onClick={replayVideo} style={{marginTop: '20px'}}><Icons.Refresh /> Смотреть заново</button>
                        </div>
                    )}
                </div>
            </div>
          );
      })()}
      
      <div className={`video-title-overlay ${showControls ? 'show' : ''}`}>
        <div className="video-title-text">{title || 'Лекция'}</div>
        {/* Индикатор попыток прямо под названием */}
        {maxAttempts !== undefined && maxAttempts > 0 && (
            <div className="video-attempts-badge">
                Попыток пересдачи: {Math.max(0, maxAttempts - attemptsUsed)} из {maxAttempts}
            </div>
        )}
      </div>

      <video
        ref={videoRef}
        src={currentSource.url}
        className={`yt-video ${showControls ? 'controls-visible' : ''}`}
        playsInline
        onDoubleClick={handleVideoDoubleClick}
        crossOrigin="anonymous"
        onMouseDown={handlePressStart}
        onTouchStart={handlePressStart}
        onMouseUp={handlePressEnd}
        onTouchEnd={handlePressEnd}
        onMouseLeave={handlePressCancel}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
            setIsPlaying(false);
            // Сохраняем сразу, как только юзер нажал паузу
            if (videoId && videoRef.current) {
                savePlaybackProgress(videoId, videoRef.current.currentTime, false);
                lastSavedTimeRef.current = videoRef.current.currentTime;
            }
        }}
        onEnded={handleVideoEnd}
        muted={isMuted}
      >
          {currentSource.subtitles?.map((sub, idx) => (
              <track key={idx} kind="subtitles" src={sub.src} srcLang={sub.lang} label={sub.label} />
          ))}
          {isSpeedingUp && (
          <div className="speed-overlay">
              <span>🚀 2x Скорость</span>
          </div>
      )}
      </video>
      
      {!isPlaying && showControls && !activeEvent && !showEndScreen && (<div className="center-play-overlay-static" onClick={togglePlay}><Icons.Play /></div>)}

      <div className={`yt-controls ${showControls && !activeEvent ? 'show' : ''}`} style={{ zIndex: 100 }}>
        
        {activeChapter && (
            <div className="active-chapter-display">
                <span className="chapter-title">{activeChapter.question}</span>
                <span className="chapter-arrow"> › </span>
            </div>
        )}

        <div 
            className="yt-progress-container" 
            onClick={handleSeek} 
            onMouseMove={handleProgressMouseMove} 
            onMouseLeave={handleProgressMouseLeave}
        >
            {hoverTime !== null && (
                <div className="yt-hover-tooltip" style={{ left: hoverX }}>
                    {hoverChapter && <div className="tooltip-chapter-title">{hoverChapter.question}</div>}
                    <span className="tooltip-time">{formatTime(hoverTime)}</span>
                </div>
            )}

              <div className="yt-progress-track">
                {timelineSegments.map((seg) => (
                  <div 
                    key={seg.index} 
                    className="yt-chapter-segment" 
                    style={{ flexGrow: seg.duration }} 
                  >
                    <div 
                        className="yt-segment-filled" 
                        style={{ width: `${getSegmentProgress(seg.start, seg.end)}%` }} 
                    />
                  </div>
                ))}
              </div>

              <div className="yt-progress-handle" style={{ left: `${(currentTime / duration) * 100}%` }} />
              
              {/* Отрисовываем маркеры ТОЛЬКО для нерешенных вопросов */}
                {!isExternalTestMode && questions.map(ev => {
                    if (processedEventIds.includes(ev.id)) return null; 
                    return (
                        <div key={ev.id} className="yt-event-marker" style={{ left: `${(ev.time / duration) * 100}%` }} />
                    );
                })}
          </div>
        

        <div className="yt-controls-row">
          <div className="yt-left">
            <button className="yt-btn" onClick={togglePlay}>
                {isPlaying ? <Icons.Pause /> : <Icons.Play />}
            </button>
            
            <div className="volume-control-group">
                <button className="yt-btn" onClick={() => setIsMuted(!isMuted)}>
                    {isMuted || volume === 0 ? <Icons.VolumeMuted /> : <Icons.VolumeHigh />}
                </button>
                <div className="volume-slider-container">
                    <input 
                        type="range" 
                        min="0" max="1" step="0.05" 
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="volume-slider"
                        style={{
                            background: `linear-gradient(to right, #fff ${isMuted ? 0 : volume * 100}%, rgba(255,255,255,0.2) ${isMuted ? 0 : volume * 100}%)`
                        }}
                    />
                </div>
            </div>

            <div className="yt-time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="yt-right">
            {hasSubtitles && (
                <button 
                    className={`yt-btn ${activeSubtitle !== 'off' ? 'btn-active' : ''}`} 
                    onClick={toggleSubtitles}
                    title="Субтитры (c)"
                >
                    <Icons.Captions />
                </button>
            )}
            
            <button 
                className="yt-btn" 
                onClick={() => videoRef.current?.requestPictureInPicture()}
                title="Картинка в картинке"
            >
                <Icons.Pip />
            </button>
            
            <div className="settings-wrapper" ref={settingsRef}>
              <button 
                className={`yt-btn ${showSettings ? 'rotate' : ''}`} 
                onClick={() => { setShowSettings(!showSettings); setCurrentMenu('main'); }}
                title="Настройки"
              >
                <Icons.Settings />
              </button>
              
              {showSettings && (
                <div className="yt-settings-menu">
                  {currentMenu === 'main' && renderMainMenu()}
                  {currentMenu === 'speed' && (
                      <div className="menu-list">
                        <div className="menu-header" onClick={() => setCurrentMenu('main')}>‹ Скорость</div>
                        {playbackRates.map(rate => (
                            <div key={rate} className="menu-item" onClick={() => { setPlaybackRate(rate); if(videoRef.current) videoRef.current.playbackRate = rate; setShowSettings(false); }}>
                                <span>{rate}x</span>
                            </div>
                        ))}
                      </div>
                  )}
                  {currentMenu === 'captions' && (
                      <div className="menu-list">
                        <div className="menu-header" onClick={() => setCurrentMenu('main')}>‹ Субтитры</div>
                        <div className="menu-item" onClick={() => setActiveSubtitle('off')}>
                            <span>Выкл.</span>
                            {activeSubtitle === 'off' && <span className="check-mark">●</span>}
                        </div>
                        {currentSource.subtitles?.map(sub => (
                            <div key={sub.lang} className="menu-item" onClick={() => setActiveSubtitle(sub.lang)}>
                                <span>{sub.label}</span>
                                {activeSubtitle === sub.lang && <span className="check-mark">●</span>}
                            </div>
                        ))}
                      </div>
                  )}
                  {currentMenu === 'chapters' && (
                      <div className="menu-list" style={{maxHeight: '300px', overflowY: 'auto'}}>
                        <div className="menu-header" onClick={() => setCurrentMenu('main')}>‹ Главы</div>
                        {chapters.map((chap) => (
                            <div key={chap.id} className="menu-item" onClick={() => jumpToChapter(chap.time)}>
                                <div style={{display: 'flex', gap: '10px', width: '100%'}}>
                                    <span style={{color: '#00aeef', fontWeight: 'bold', minWidth: '40px'}}>{formatTime(chap.time)}</span>
                                    <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px'}}>{chap.question}</span>
                                </div>
                            </div>
                        ))}
                      </div>
                  )}
                </div>
              )}
          </div>
            <button className="yt-btn" onClick={toggleFullscreen} title="Полный экран (f)">
                <Icons.Fullscreen />
            </button>
          </div>
        </div>
      </div>
      {toastMessage && (
          <div className="player-toast">
              {toastMessage}
          </div>
      )}
  </div>
  );
};