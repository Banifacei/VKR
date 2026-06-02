import { useState, useRef, useEffect, useMemo } from 'react';
import Hls from 'hls.js';
import { sendAnswer, resetProgress, savePlaybackProgress, getPlaybackProgress } from '../api/videoApi';
import type { IInteractiveEvent, ISubtitle } from '../types';
import { TestModeButton } from './TestModeButton'; // <--- ИМПОРТ НОВОЙ КНОПКИ
import { Icons } from './Icons';
import { useToast } from '../context/ToastContext';
import { VideoPlayeIcons } from './Icons';
import { normalizeUploadUrl } from '../utils/uploadUrl';

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// --- Определение и конвертация внешних ссылок ---
const getEmbedUrl = (url: string): string | null => {
    // YouTube: watch?v= или youtu.be/
    // youtube-nocookie.com — privacy-enhanced режим, меньше CDN-ограничений у провайдеров РФ
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&enablejsapi=1&controls=0`;

    // Rutube
    const rtMatch = url.match(/rutube\.ru\/video\/([a-f0-9]+)/i);
    if (rtMatch) return `https://rutube.ru/play/embed/${rtMatch[1]}?enableapi=1`;

    // VK Видео
    const vkMatch = url.match(/vk\.com\/video(-?\d+)_(\d+)/);
    if (vkMatch) return `https://vk.com/video_ext.php?oid=${vkMatch[1]}&id=${vkMatch[2]}&js_api=1`;

    // Прямая ссылка — не iframe
    return null;
};

// Типы для YouTube IFrame API
declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

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
  seekRef?: React.MutableRefObject<((t: number) => void) | null>;
  noForwardSeek?: boolean;
}

interface IAnswerResult {
    event: IInteractiveEvent;
    userAnswer: string;
    isCorrect: boolean;
    similarity?: number | null;
}

export const VideoPlayer = ({ sources, title, events = [], videoId, userId = 'guest', userRole = 'student', hideResults = false, maxAttempts, onResetTest, onTimeUpdate, onRefreshEvents, isExternalTestMode = false, onToggleTestMode, seekRef, noForwardSeek = false }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [localEvents, setLocalEvents] = useState<IInteractiveEvent[]>(events);    
  const safeSource = (sources && sources.length > 0) ? sources[0] : { quality: 'Error', url: '', subtitles: [] };
  const [currentSource, setCurrentSource] = useState(safeSource);
  const [sessionResults, setSessionResults] = useState<IAnswerResult[]>([]);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const { showToast } = useToast();
  const [hasNewAnswers, setHasNewAnswers] = useState(false);

  // --- Внешние плееры (YouTube / Rutube / VK) ---
  const currentEmbedUrl = getEmbedUrl(currentSource.url);
  const isYouTube = !!currentEmbedUrl && /youtube\.com|youtu\.be|youtube-nocookie\.com/.test(currentSource.url);
  const isRutube  = !!currentEmbedUrl && /rutube\.ru/.test(currentSource.url);
  const ytPlayerRef = useRef<any>(null);
  const externalIframeRef = useRef<HTMLIFrameElement>(null);
  // Для Rutube: время приходит через postMessage
  const externalTimeRef = useRef<number>(0);

  const safePlay = () => {
      if (currentEmbedUrl) {
          if (isYouTube && ytPlayerRef.current?.playVideo) {
              ytPlayerRef.current.playVideo();
          } else if (externalIframeRef.current?.contentWindow) {
              externalIframeRef.current.contentWindow.postMessage(
                  JSON.stringify({ type: 'player:play', data: {} }), '*'
              );
          }
          setIsPlaying(true);
          return;
      }
      if (!videoRef.current) return;
      const p = videoRef.current.play();
      if (p !== undefined) p.catch(e => { if (e.name !== 'AbortError') console.error(e); });
  };

  const safePause = () => {
      if (currentEmbedUrl) {
          if (isYouTube && ytPlayerRef.current?.pauseVideo) {
              ytPlayerRef.current.pauseVideo();
          } else if (externalIframeRef.current?.contentWindow) {
              externalIframeRef.current.contentWindow.postMessage(
                  JSON.stringify({ type: 'player:pause', data: {} }), '*'
              );
          }
          setIsPlaying(false);
          return;
      }
      videoRef.current?.pause();
  };

  // States
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  const showControlsRef = useRef(true);
  showControlsRef.current = showControls;
  const controlsVisibleOnPressRef = useRef(false); // showControls на момент нажатия

  const [isSpeedingUp, setIsSpeedingUp] = useState(false);  // Показывает плашку "2x"
  const longPressTimerRef = useRef<number | null>(null);    // Таймер зажатия
  const wasLongPressRef = useRef(false);                    // Флаг: было ли удержание?
  const originalRateRef = useRef(1);                        // Запоминаем исходную скорость

  const isLongPressActiveRef = useRef(false); // Флаг: сейчас активно удержание?
  const isTouchPressRef = useRef(false);      // Флаг: текущий press начался с touch (не mouse)?
  const wasPlayingRef = useRef(false);        // Флаг: играло ли видео ДО нажатия?
  const isSeekingRef = useRef(false);         // Флаг: идёт перемотка
  const lastTouchTimeRef = useRef(0);         // Время последнего touch — для игнора синтетического mouseleave
  const pressStartedRef = useRef(false);      // Флаг: был ли валидный handlePressStart (не синтетический mouse после touch)
  const lastQualitySwitchRef = useRef(0);     // Время последнего авто-переключения качества
  const tapXRef = useRef(0);                  // X позиция последнего тапа (для определения стороны двойного тапа)
  const lastTapTimeRef = useRef(0);           // Время последнего одиночного тапа (для детекции двойного)
  const lastTapSideRef = useRef<'left' | 'right' | null>(null); // Сторона последнего тапа

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCSSFullscreen, setIsCSSFullscreen] = useState(false);
  const [isZoomFill, setIsZoomFill] = useState(false);
  const [currentMenu, setCurrentMenu] = useState<'main' | 'speed' | 'quality' | 'captions' | 'chapters'>('main');
  const [activeSubtitle, setActiveSubtitle] = useState<string>('off');
  const [subtitleSize, setSubtitleSize] = useState<number>(16);
  const [subtitlePos, setSubtitlePos] = useState({ x: 50, y: 88 }); // % от размеров плеера
  const [currentCueText, setCurrentCueText] = useState<string>('');

  // Logic States
  const [activeEvent, setActiveEvent] = useState<IInteractiveEvent | null>(null);
  const [processedEventIds, setProcessedEventIds] = useState<number[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string | string[]>('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [score, setScore] = useState(0);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [seekFeedback, setSeekFeedback] = useState<{ direction: 'left' | 'right'; key: number } | null>(null);
  const lastSavedTimeRef = useRef<number>(0);
  const maxReachedTimeRef = useRef<number>(0); // Максимум просмотренного времени (для noForwardSeek)
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
    
  const pendingSeekRef = useRef<number | null>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const subtitleDragRef = useRef<{ pointerId: number; startX: number; startY: number; startPosX: number; startPosY: number; curX: number; curY: number } | null>(null);
  // Ref для античита — не залежить від циклу рендерів React
  const anticheatTimeRef = useRef<number>(0);
  const progressLoadedRef = useRef<boolean>(false);
  const processedEventIdsRef = useRef<number[]>([]);

  useEffect(() => {
    const fetchProgress = async () => {
        if (!videoId || !userId) return;
        try {
            const data = await getPlaybackProgress(videoId);
            if (data) {
                // 1. Сохраняем нужное время — применим его после loadedmetadata
                if (data.lastTime > 0) {
                    anticheatTimeRef.current = data.lastTime;
                    lastSavedTimeRef.current = data.lastTime;
                    maxReachedTimeRef.current = data.lastTime; // Инициализируем предел перемотки
                    setCurrentTime(data.lastTime);
                    // Если метаданные видео уже загружены — сразу перематываем.
                    // Если нет — pendingSeekRef применится в onLoadedMetadata.
                    if (videoRef.current && videoRef.current.readyState >= 1) {
                        videoRef.current.currentTime = data.lastTime;
                    } else {
                        pendingSeekRef.current = data.lastTime;
                    }
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
                    const ids = data.responses.map((r: any) => r.eventId);
                    processedEventIdsRef.current = ids; // синхронно оновлюємо ref
                    setProcessedEventIds(ids);

                    // Пересчитываем заработанные баллы
                    const restoredScore = historyResults.reduce((sum: number, r: any) => {
                        return r.isCorrect ? sum + (r.event?.weight || 1) : sum;
                    }, 0);
                    setScore(restoredScore);
                }
            }
        } catch (e) {
            console.error("Ошибка загрузки прогресса", e);
        } finally {
            progressLoadedRef.current = true;
        }
    };

    progressLoadedRef.current = false;
    anticheatTimeRef.current = 0;
    processedEventIdsRef.current = [];
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
        processedEventIdsRef.current = [];
        anticheatTimeRef.current = 0;
        setProcessedEventIds([]);
        setSessionResults([]);
        setScore(0);
        setShowEndScreen(false);
        setActiveEvent(null);
        setAttemptsUsed(prev => prev + 1);
        setHasNewAnswers(false);
        if (currentEmbedUrl) {
            seekExternal(0);
            safePlay();
        } else if (videoRef.current) {
            videoRef.current.currentTime = 0;
            safePlay();
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
  // SSE: мгновенное обновление событий видео когда препод вносит изменения
  useEffect(() => {
        if (!videoId || !onRefreshEvents) return;
        let es: EventSource | null = null;
        let active = true;
        import('../utils/sseTicket').then(({ sseQuery }) => sseQuery()).then(q => {
            if (!active || !q) return;
            es = new EventSource(`/api/videos/${videoId}/events/stream?${q}`);
            es.onmessage = async ({ data }) => {
                try {
                    const d = JSON.parse(data);
                    if (d.type !== 'events_updated') return;
                    const freshEvents = await onRefreshEvents();
                    setLocalEvents(prev => {
                        if (JSON.stringify(prev) === JSON.stringify(freshEvents)) return prev;
                        return freshEvents;
                    });
                } catch { /* игнорируем */ }
            };
            es.onerror = () => es?.close();
        });
        return () => { active = false; es?.close(); };
    }, [videoId, onRefreshEvents]);

  // videoIdentityRef хранит sources[0].url при последнем реальном переключении видео.
  // Это позволяет отличить "другое видео" от "тот же видео, родитель перерендерился".
  const videoIdentityRef = useRef(safeSource.url);

  useEffect(() => {
      if (!sources || sources.length === 0) return;
      const newIdentity = sources[0].url;
      if (newIdentity === videoIdentityRef.current) {
          // Тот же видео (или смена качества) — обновляем только субтитры текущего источника
          setCurrentSource(prev => {
              const matchInSources = sources.find(s => s.url === prev.url) ?? sources[0];
              if (JSON.stringify(prev.subtitles) !== JSON.stringify(matchInSources.subtitles)) {
                  return { ...prev, subtitles: matchInSources.subtitles };
              }
              return prev;
          });
      } else {
          // Новое видео → сброс авто-режима
          videoIdentityRef.current = newIdentity;
          setIsAutoMode(true);
          isAutoModeRef.current = true;
          autoIdxRef.current = 0;
          setCurrentSource(sources[0]);
      }
  }, [sources]);

  useEffect(() => {
        if (!videoRef.current) return;
        const tracks = videoRef.current.textTracks;

        // Отключаем все треки
        for (let i = 0; i < tracks.length; i++) {
            tracks[i].mode = 'disabled';
        }
        setCurrentCueText('');

        if (activeSubtitle === 'off') return;

        const track = Array.from(tracks).find(t => t.language === activeSubtitle);
        if (!track) return;

        // hidden — браузер парсит кью, но не отображает нативно
        track.mode = 'hidden';

        const onCueChange = () => {
            const cues = track.activeCues;
            if (!cues || cues.length === 0) { setCurrentCueText(''); return; }
            const text = Array.from(cues)
                .map(c => (c as VTTCue).text.replace(/<[^>]+>/g, ''))
                .join('\n');
            setCurrentCueText(text);
        };

        track.addEventListener('cuechange', onCueChange);
        return () => { track.removeEventListener('cuechange', onCueChange); };
    }, [activeSubtitle, currentSource]);

  // HLS: инициализируем hls.js если источник — .m3u8
  useEffect(() => {
      const video = videoRef.current;
      if (!video || currentEmbedUrl) return;

      const url = normalizeUploadUrl(currentSource.url);
      if (!url.endsWith('.m3u8')) {
          // обычный MP4 — уничтожаем hls если был
          if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
          return;
      }

      if (Hls.isSupported()) {
          if (hlsRef.current) hlsRef.current.destroy();
          const hls = new Hls({ startLevel: -1, maxBufferLength: 30 });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
              const d = video.duration;
              if (d && isFinite(d) && d > 0) setDuration(d);
              if (pendingSeekRef.current !== null) {
                  video.currentTime = pendingSeekRef.current;
                  anticheatTimeRef.current = pendingSeekRef.current;
                  pendingSeekRef.current = null;
              }
              if (pendingPlayRef.current) {
                  pendingPlayRef.current = false;
                  safePlay();
              }
          });
          hls.on(Hls.Events.ERROR, (_e, data) => {
              if (data.fatal) console.error('[HLS] fatal error:', data.type, data.details);
          });
          return () => { hls.destroy(); hlsRef.current = null; };
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari — нативная поддержка HLS
          video.src = url;
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSource.url, currentEmbedUrl]);

  useEffect(() => {
      if (currentEmbedUrl) {
          if (isYouTube && ytPlayerRef.current) {
              if (isMuted) ytPlayerRef.current.mute?.();
              else { ytPlayerRef.current.unMute?.(); ytPlayerRef.current.setVolume?.(volume * 100); }
          }
          // Rutube/VK — API громкости не поддерживается через postMessage
      } else if (videoRef.current) {
          videoRef.current.volume = volume;
      }
  }, [volume, isMuted]);

  useEffect(() => {
        return () => {
            // Сработает, когда компонент удаляется (переход на другую страницу)
            if (videoId && videoRef.current && !videoRef.current.ended) {
                savePlaybackProgress(videoId, videoRef.current.currentTime, false);
            }
        };
    }, [videoId]);

  // Экспортируем функцию seek для внешнего управления (например, из закладок)
  useEffect(() => {
      if (!seekRef) return;
      seekRef.current = (t: number) => {
          if (currentEmbedUrl) {
              seekExternal(t);
          } else if (videoRef.current) {
              videoRef.current.currentTime = t;
              anticheatTimeRef.current = t;
              setCurrentTime(t);
          }
      };
      return () => { seekRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEmbedUrl, seekRef]);

  // --- YouTube IFrame API: инициализация ---
  useEffect(() => {
      if (!isYouTube || !externalIframeRef.current) return;

      const initPlayer = () => {
          if (!externalIframeRef.current) return;
          ytPlayerRef.current = new window.YT.Player(externalIframeRef.current, {
              events: {
                  onReady: (event: any) => {
                      const dur = event.target.getDuration();
                      if (dur > 0) setDuration(dur);
                  },
                  onStateChange: (event: any) => {
                      const YTState = window.YT?.PlayerState;
                      if (!YTState) return;
                      if (event.data === YTState.PLAYING) {
                          setIsPlaying(true);
                      } else if (event.data === YTState.PAUSED) {
                          setIsPlaying(false);
                          if (videoId) {
                              const t = ytPlayerRef.current?.getCurrentTime?.() ?? externalTimeRef.current;
                              savePlaybackProgress(videoId, t, false).catch(() => {});
                          }
                      } else if (event.data === YTState.ENDED) {
                          handleVideoEnd();
                      }
                  },
              },
          });
      };

      if (window.YT?.Player) {
          initPlayer();
      } else {
          const prevCallback = window.onYouTubeIframeAPIReady;
          window.onYouTubeIframeAPIReady = () => {
              prevCallback?.();
              initPlayer();
          };
          if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
              const tag = document.createElement('script');
              tag.src = 'https://www.youtube.com/iframe_api';
              document.head.appendChild(tag);
          }
      }

      return () => {
          ytPlayerRef.current?.destroy?.();
          ytPlayerRef.current = null;
      };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEmbedUrl]);

  // --- Rutube / VK: слушаем postMessage для времени и состояния ---
  useEffect(() => {
      if (!isRutube && !(!isYouTube && currentEmbedUrl)) return;

      const onMessage = (e: MessageEvent) => {
          try {
              const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
              if (!data?.type) return;
              if (data.type === 'player:currentTime' || data.type === 'currentTime') {
                  const t = data.data?.time ?? data.time ?? 0;
                  externalTimeRef.current = t;
              }
              if (data.type === 'player:durationChange' || data.type === 'durationChange') {
                  const d = data.data?.duration ?? data.duration ?? 0;
                  if (d > 0) setDuration(d);
              }
              if (data.type === 'player:play' || data.type === 'play') setIsPlaying(true);
              if (data.type === 'player:pause' || data.type === 'pause') setIsPlaying(false);
              if (data.type === 'player:stop' || data.type === 'stop') handleVideoEnd();
          } catch { /* ignore */ }
      };

      window.addEventListener('message', onMessage);
      return () => window.removeEventListener('message', onMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEmbedUrl]);

  // --- Polling времени для внешних плееров (нужен для interactive events) ---
  useEffect(() => {
      if (!currentEmbedUrl) return;

      const interval = setInterval(() => {
          let time = externalTimeRef.current;

          // YouTube: берём актуальное время напрямую из API
          if (isYouTube && ytPlayerRef.current?.getCurrentTime) {
              time = ytPlayerRef.current.getCurrentTime() || 0;
              externalTimeRef.current = time;
              const dur = ytPlayerRef.current.getDuration?.() || 0;
              if (dur > 0 && dur !== duration) setDuration(dur);
          }

          anticheatTimeRef.current = time;
          setCurrentTime(time);

          if (onTimeUpdate) onTimeUpdate(time);

          if (videoId && Math.abs(time - lastSavedTimeRef.current) > 30) {
              savePlaybackProgress(videoId, time, false).catch(() => {});
              lastSavedTimeRef.current = time;
          }

          if (questions.length > 0 && !activeEvent && !showEndScreen && !isExternalTestMode && isPlaying) {
              const eventToTrigger = questions.find(ev =>
                  Math.abs(ev.time - time) < 0.8 && !processedEventIdsRef.current.includes(ev.id)
              );
              if (eventToTrigger) {
                  safePause();
                  setActiveEvent(eventToTrigger);
                  setCurrentAnswer(eventToTrigger.type === 'multiple_choice' ? [] : '');
                  setShowControls(false);
                  processedEventIdsRef.current = [...processedEventIdsRef.current, eventToTrigger.id];
                  setProcessedEventIds(prev => [...prev, eventToTrigger.id]);
              }
          }
      }, 500);

      return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEmbedUrl, activeEvent, showEndScreen, isExternalTestMode, isPlaying, questions, duration]);

    // --- УМНЫЙ АНТИ-СКИП: Ищет нерешенные вопросы на пути перемотки ---
  const getBlockingEventTime = (fromTime: number, toTime: number) => {
      // Преподы и админы мотают как хотят!
      if (userRole === 'teacher' || userRole === 'admin' || isExternalTestMode) return null; 

      // Ищем все вопросы, которые находятся между текущим временем и куда кликнули,
      // и на которые студент еще НЕ ответил (використовуємо ref для актуальних даних)
      const processedIds = processedEventIdsRef.current;
      const blockingEvents = questions.filter(ev =>
          ev.time > fromTime &&
          ev.time <= toTime &&
          !processedIds.includes(ev.id)
      );

      if (blockingEvents.length > 0) {
          // Возвращаем время самого ПЕРВОГО вопроса на пути
          return Math.min(...blockingEvents.map(ev => ev.time)); 
      }
      return null;
  };

  // --- ЛОГИКА НАЖАТИЯ (Smart Touch/Click) ---
  
  const handlePressStart = (e?: React.TouchEvent<any> | React.MouseEvent<any>) => {
      const isTouch = !!(e && 'touches' in e);
      // Игнорируем синтетические mouse-события которые браузер стреляет после touch
      if (!isTouch && Date.now() - lastTouchTimeRef.current < 600) {
          pressStartedRef.current = false;
          return;
      }
      pressStartedRef.current = true;
      isTouchPressRef.current = isTouch;
      if (isTouch) lastTouchTimeRef.current = Date.now();
      controlsVisibleOnPressRef.current = showControlsRef.current;
      if (e && 'touches' in e && e.touches.length > 0) tapXRef.current = e.touches[0].clientX;
      else if (e && 'clientX' in e) tapXRef.current = (e as React.MouseEvent).clientX;
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

      // Запоминаем состояние (играло или нет), чтобы вернуть его при отмене
      wasPlayingRef.current = currentEmbedUrl ? isPlaying : !videoRef.current?.paused;

      isLongPressActiveRef.current = false;

      longPressTimerRef.current = window.setTimeout(() => {
          isLongPressActiveRef.current = true;
          wasLongPressRef.current = true;
          if (currentEmbedUrl) {
              // Внешние плееры: YouTube API или postMessage
              originalRateRef.current = playbackRate;
              if (isYouTube && ytPlayerRef.current?.setPlaybackRate) {
                  ytPlayerRef.current.setPlaybackRate(2);
              } else if (externalIframeRef.current?.contentWindow) {
                  externalIframeRef.current.contentWindow.postMessage(
                      JSON.stringify({ type: 'player:setPlaybackRate', data: { rate: 2 } }), '*'
                  );
              }
              setIsSpeedingUp(true);
              if (!isPlaying) safePlay();
          } else if (videoRef.current) {
              originalRateRef.current = videoRef.current.playbackRate;
              videoRef.current.playbackRate = 2;
              setIsSpeedingUp(true);
              if (videoRef.current.paused) safePlay();
          }
      }, 300);
  };
  
  // Вызывается ТОЛЬКО когда отпустили кнопку мыши НАД видео (MouseUp / TouchEnd)
  const handlePressEnd = () => {
      // Игнорируем если handlePressStart был пропущен (синтетический mouse после touch)
      if (!pressStartedRef.current) return;
      pressStartedRef.current = false;

      // 1. Сбрасываем таймер (если не успел сработать long press)
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }

      // 2. Если было ускорение (2x) -> Выключаем его
      if (isLongPressActiveRef.current) {
          if (currentEmbedUrl) {
              const rate = originalRateRef.current;
              if (isYouTube && ytPlayerRef.current?.setPlaybackRate) {
                  ytPlayerRef.current.setPlaybackRate(rate);
              } else if (externalIframeRef.current?.contentWindow) {
                  externalIframeRef.current.contentWindow.postMessage(
                      JSON.stringify({ type: 'player:setPlaybackRate', data: { rate } }), '*'
                  );
              }
              setIsSpeedingUp(false);
              if (!wasPlayingRef.current) safePause();
          } else if (videoRef.current) {
              videoRef.current.playbackRate = originalRateRef.current;
              setIsSpeedingUp(false);
              if (!wasPlayingRef.current) videoRef.current.pause();
          }
          isLongPressActiveRef.current = false;
          wasLongPressRef.current = false;
      }
      // 3. Если ускорения НЕ было -> Значит это обычный КЛИК
      else {
          if (!activeEvent && !wasLongPressRef.current) {
              if (isTouchPressRef.current) {
                  // Мобайл: определяем одиночный или двойной тап
                  const now = Date.now();
                  const rect = containerRef.current?.getBoundingClientRect();
                  const side = rect && (tapXRef.current - rect.left) / rect.width < 0.5 ? 'left' : 'right';

                  if (now - lastTapTimeRef.current < 300 && lastTapSideRef.current === side) {
                      // Двойной тап — перемотка как на YouTube
                      lastTapTimeRef.current = 0;
                      lastTapSideRef.current = null;
                      skipTime(side === 'left' ? -10 : 10);
                      setSeekFeedback({ direction: side, key: now });
                  } else {
                      // Одиночный тап — показать/скрыть интерфейс
                      lastTapTimeRef.current = now;
                      lastTapSideRef.current = side;
                      if (controlsVisibleOnPressRef.current) {
                          if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
                          setShowControls(false);
                      } else {
                          showControlsTemporarily();
                      }
                  }
              } else {
                  // Десктоп: клик мышью — пауза/плей
                  togglePlay();
              }
          }
          wasLongPressRef.current = false;
      }
  };

  // Вызывается, если мышь ушла с видео или тач сорвался (MouseLeave / TouchCancel)
  // ОТЛИЧИЕ: Здесь мы НИКОГДА не делаем togglePlay (не ставим на паузу/плей при уходе мыши)
  const handlePressCancel = () => {
      if (!pressStartedRef.current) return;
      pressStartedRef.current = false;
      // Сбрасываем таймер
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }

      // Если мы успели войти в режим 2x -> выключаем его
      if (isLongPressActiveRef.current) {
          if (currentEmbedUrl) {
              const rate = originalRateRef.current;
              if (isYouTube && ytPlayerRef.current?.setPlaybackRate) {
                  ytPlayerRef.current.setPlaybackRate(rate);
              } else if (externalIframeRef.current?.contentWindow) {
                  externalIframeRef.current.contentWindow.postMessage(
                      JSON.stringify({ type: 'player:setPlaybackRate', data: { rate } }), '*'
                  );
              }
              setIsSpeedingUp(false);
              if (!wasPlayingRef.current) safePause();
          } else if (videoRef.current) {
              videoRef.current.playbackRate = originalRateRef.current;
              setIsSpeedingUp(false);
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
      safePlay();
  };
  const handleRewind = () => {
      if (activeEvent?.rewindTo !== undefined) {
          const rewindTime = activeEvent.rewindTo;
          if (currentEmbedUrl) {
              seekExternal(rewindTime);
          } else if (videoRef.current) {
              videoRef.current.currentTime = rewindTime;
              anticheatTimeRef.current = rewindTime;
          }
          // Удаляем из решенных, чтобы вопрос задался снова, когда студент досмотрит
          processedEventIdsRef.current = processedEventIdsRef.current.filter(id => id !== activeEvent.id);
          setProcessedEventIds(prev => prev.filter(id => id !== activeEvent.id));
      }
      setFeedback(null);
      setCurrentAnswer(activeEvent?.type === 'multiple_choice' ? [] : '');
      setActiveEvent(null);
      safePlay();
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

    // Защита от читеров: використовуємо ref (не stale React state!)
    // Також чекаємо поки прогрес завантажиться, щоб не блокувати відновлення позиції
    if (progressLoadedRef.current && time > anticheatTimeRef.current + 1.5) {
        const blockTime = getBlockingEventTime(anticheatTimeRef.current, time);
        if (blockTime !== null) {
            const bounceTime = Math.max(anticheatTimeRef.current, blockTime - 0.2);
            videoRef.current.currentTime = bounceTime;
            anticheatTimeRef.current = bounceTime;
            return;
        }
    }

    anticheatTimeRef.current = time;
    setCurrentTime(time);
    if (time > maxReachedTimeRef.current) maxReachedTimeRef.current = time;

    // Обновляем буфер
    if (videoRef.current) {
        const vid = videoRef.current;
        if (vid.buffered.length > 0 && vid.duration > 0) {
            setBufferedPercent((vid.buffered.end(vid.buffered.length - 1) / vid.duration) * 100);
        }
    }

    if (onTimeUpdate) onTimeUpdate(time);

    // НОВАЯ ЛОГИКА: Сохраняем каждые 30 секунд (не чаще)
    if (videoId && Math.abs(time - lastSavedTimeRef.current) > 30) {
        savePlaybackProgress(videoId, time, false).catch(e => console.error(e));
        lastSavedTimeRef.current = time;
    }

    if (questions.length > 0 && !activeEvent && !showEndScreen && !isExternalTestMode) {
        const eventToTrigger = questions.find(ev =>
            Math.abs(ev.time - time) < 0.5 && !processedEventIdsRef.current.includes(ev.id)
        );
        if (eventToTrigger) {
            videoRef.current.pause();
            setIsPlaying(false);
            setActiveEvent(eventToTrigger);
            setCurrentAnswer(eventToTrigger.type === 'multiple_choice' ? [] : '');
            setShowControls(false);
            processedEventIdsRef.current = [...processedEventIdsRef.current, eventToTrigger.id];
            setProcessedEventIds(prev => [...prev, eventToTrigger.id]);
        }
    }
  };

  const jumpToChapter = (time: number) => {
      if (currentEmbedUrl) {
          seekExternal(time);
          safePlay();
          setShowSettings(false);
          return;
      }
      if (videoRef.current) {
          videoRef.current.currentTime = time;
          anticheatTimeRef.current = time;
          safePlay();
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
      anticheatTimeRef.current = 0;
      if (currentEmbedUrl) {
          seekExternal(0);
          safePlay();
          return;
      }
      if (videoRef.current) {
          videoRef.current.playbackRate = 1;
          videoRef.current.currentTime = 0;
          safePlay();
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

      if (activeEvent) return;

      if (showEndScreen) {
          replayVideo();
          return;
      }

      if (currentEmbedUrl) {
          isPlaying ? safePause() : safePlay();
          showControlsTemporarily();
          return;
      }

      if (!videoRef.current) return;
      videoRef.current.paused ? safePlay() : safePause();
      showControlsTemporarily();
  };

  const seekExternal = (targetTime: number) => {
      anticheatTimeRef.current = targetTime;
      externalTimeRef.current = targetTime;
      setCurrentTime(targetTime);
      if (isYouTube && ytPlayerRef.current?.seekTo) {
          ytPlayerRef.current.seekTo(targetTime, true);
      } else if (externalIframeRef.current?.contentWindow) {
          externalIframeRef.current.contentWindow.postMessage(
              JSON.stringify({ type: 'player:setCurrentTime', data: { time: targetTime } }), '*'
          );
      }
  };

  const skipTime = (amount: number) => {
      if (activeEvent) return;

      const currentVideoTime = currentEmbedUrl
          ? externalTimeRef.current
          : (videoRef.current?.currentTime ?? 0);

      let targetTime = currentVideoTime + amount;

      if (targetTime > currentVideoTime) {
          if (noForwardSeek && targetTime > maxReachedTimeRef.current + 1) {
              showToast('⏩ Преподаватель запретил перемотку вперёд');
              return;
          }
          const blockTime = getBlockingEventTime(currentVideoTime, targetTime);
          if (blockTime !== null) {
              targetTime = Math.max(currentVideoTime, blockTime - 0.2);
              showToast('⚠️ Сначала нужно ответить на вопрос!');
          }
      }

      if (currentEmbedUrl) {
          seekExternal(targetTime);
      } else if (videoRef.current) {
          videoRef.current.currentTime = targetTime;
          anticheatTimeRef.current = targetTime;
      }

      showControlsTemporarily();

      if (showEndScreen) {
          setShowEndScreen(false);
          setHasNewAnswers(false);
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
  const toggleFullscreen = () => {
      const container = containerRef.current;
      const isNativeFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);

      if (!isNativeFs && !isCSSFullscreen) {
          const fallbackCSS = () => {
              setIsCSSFullscreen(true);
              document.body.style.overflow = 'hidden';
          };
          if (container?.requestFullscreen) {
              container.requestFullscreen()
                  .then(() => {
                      setTimeout(() => {
                          if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
                              fallbackCSS();
                          }
                      }, 400);
                  })
                  .catch(fallbackCSS);
          } else if ((container as any)?.webkitRequestFullscreen) {
              try { (container as any).webkitRequestFullscreen(); }
              catch { fallbackCSS(); }
          } else {
              fallbackCSS();
          }
      } else {
          if (isNativeFs) {
              if (document.exitFullscreen) document.exitFullscreen();
              else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
          }
          setIsCSSFullscreen(false);
          document.body.style.overflow = '';
      }
  };

  // CSS fullscreen: динамически подгоняем высоту под реальный window.innerHeight
  // В ландшафте на iPhone url бар сам схлопывается — innerHeight увеличивается → плеер заполняет экран
  useEffect(() => {
      if (!isCSSFullscreen || !containerRef.current) return;
      const update = () => {
          if (containerRef.current) containerRef.current.style.height = `${window.innerHeight}px`;
      };
      update();
      window.addEventListener('resize', update);
      window.addEventListener('orientationchange', update);
      return () => {
          window.removeEventListener('resize', update);
          window.removeEventListener('orientationchange', update);
          if (containerRef.current) containerRef.current.style.height = '';
      };
  }, [isCSSFullscreen]);

  // Синхронизируем isFullscreen с реальным состоянием браузера
  useEffect(() => {
      const onFsChange = () => {
          setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
      };
      document.addEventListener('fullscreenchange', onFsChange);
      document.addEventListener('webkitfullscreenchange', onFsChange);
      return () => {
          document.removeEventListener('fullscreenchange', onFsChange);
          document.removeEventListener('webkitfullscreenchange', onFsChange);
          document.body.style.overflow = ''; // cleanup если компонент умер в CSS fullscreen
      };
  }, []);
  
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
      if (activeEvent) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      let targetTime = pos * duration;

      const actualNow = currentEmbedUrl
          ? externalTimeRef.current
          : (videoRef.current?.currentTime ?? anticheatTimeRef.current);

      if (targetTime > actualNow) {
          // Блокируем перемотку вперёд дальше просмотренного (если включен noForwardSeek)
          if (noForwardSeek && targetTime > maxReachedTimeRef.current + 1) {
              showToast('⏩ Преподаватель запретил перемотку вперёд');
              return;
          }
          const blockTime = getBlockingEventTime(actualNow, targetTime);
          if (blockTime !== null) {
              targetTime = Math.max(actualNow, blockTime - 0.2);
              showToast('⚠️ Сначала нужно ответить на вопрос!');
          }
      }

      if (currentEmbedUrl && duration) {
          seekExternal(targetTime);
          if (showEndScreen) {
              setShowEndScreen(false);
              setHasNewAnswers(false);
          }
      } else if (videoRef.current && duration) {
          videoRef.current.currentTime = targetTime;
          anticheatTimeRef.current = targetTime;
          if (showEndScreen) {
              setShowEndScreen(false);
              setHasNewAnswers(false);
          }
      }
      showControlsTemporarily();
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
}, [activeEvent, isSpeedingUp, volume, showEndScreen, localEvents, isPlaying]);
  
  const handleSubtitlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      subtitleDragRef.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          startPosX: subtitlePos.x,
          startPosY: subtitlePos.y,
          curX: subtitlePos.x,
          curY: subtitlePos.y,
      };
  };

  const handleSubtitlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!subtitleDragRef.current) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dx = ((e.clientX - subtitleDragRef.current.startX) / rect.width) * 100;
      const dy = ((e.clientY - subtitleDragRef.current.startY) / rect.height) * 100;
      const newX = Math.max(5, Math.min(95, subtitleDragRef.current.startPosX + dx));
      const newY = Math.max(5, Math.min(95, subtitleDragRef.current.startPosY + dy));
      subtitleDragRef.current.curX = newX;
      subtitleDragRef.current.curY = newY;
      // Двигаем DOM напрямую — без ре-рендера React → идеально плавно
      if (subtitleRef.current) {
          subtitleRef.current.style.left = `${newX}%`;
          subtitleRef.current.style.top = `${newY}%`;
      }
  };

  const handleSubtitlePointerUp = () => {
      if (subtitleDragRef.current) {
          // Фиксируем финальную позицию в state после отпускания
          setSubtitlePos({ x: subtitleDragRef.current.curX, y: subtitleDragRef.current.curY });
      }
      subtitleDragRef.current = null;
  };

  const hasSubtitles = currentSource.subtitles && currentSource.subtitles.length > 0;
  const hasChapters = chapters.length > 0;
  const hasQualities = sources && sources.length > 1;

  // --- Авто-качество ---
  const [isAutoMode, setIsAutoMode] = useState(true);
  // Индекс в массиве sources, который сейчас играет в авто-режиме
  const autoIdxRef = useRef(0);
  // Ref для чтения isAutoMode внутри интервала без пересоздания
  const isAutoModeRef = useRef(true);
  useEffect(() => { isAutoModeRef.current = isAutoMode; }, [isAutoMode]);

  // Переключение качества с сохранением позиции
  const switchQuality = (newSource: typeof safeSource, auto = false) => {
      if (newSource.url === currentSource.url) return; // то же качество — ничего не делаем
      const savedTime = videoRef.current?.currentTime || 0;
      const wasPlaying = !videoRef.current?.paused;
      if (!auto) {
          setIsAutoMode(false);
          isAutoModeRef.current = false; // сразу, чтобы onWaiting не переключил обратно
      }
      setIsBuffering(true);
      setCurrentSource(newSource);
      setShowSettings(false);
      // Используем pendingSeekRef — восстановим время в onLoadedMetadata, надёжнее чем setTimeout
      pendingSeekRef.current = savedTime;
      if (wasPlaying) {
          // После loadedmetadata safePlay будет вызван через pendingPlay
          pendingPlayRef.current = true;
      }
  };
  const pendingPlayRef = useRef(false);

  // Авто-снижение качества при буферизации (с защитой от seek и частых переключений)
  const handleVideoWaiting = () => {
      setIsBuffering(true);
      if (!isAutoModeRef.current || !hasQualities) return;
      if (isSeekingRef.current) return; // при перемотке не переключаем
      if (Date.now() - lastQualitySwitchRef.current < 5000) return; // cooldown 5 секунд
      const currentIdx = sources.findIndex(s => s.url === currentSource.url);
      const nextIdx = currentIdx + 1;
      if (nextIdx < sources.length) {
          lastQualitySwitchRef.current = Date.now();
          autoIdxRef.current = nextIdx;
          switchQuality(sources[nextIdx], true);
          showToast(`Авто: качество снижено до ${sources[nextIdx].quality}`, 'info');
      }
  };

  // Авто-повышение качества когда буфер здоровый (>= 20 сек вперёд)
  useEffect(() => {
      const id = setInterval(() => {
          if (!isAutoModeRef.current || !videoRef.current) return;
          if (autoIdxRef.current === 0) return; // уже лучшее качество
          if (Date.now() - lastQualitySwitchRef.current < 30_000) return; // cooldown 30с после любого переключения
          const video = videoRef.current;
          const ahead = video.buffered.length > 0
              ? video.buffered.end(video.buffered.length - 1) - video.currentTime
              : 0;
          if (ahead >= 20) {
              const nextIdx = autoIdxRef.current - 1;
              lastQualitySwitchRef.current = Date.now();
              autoIdxRef.current = nextIdx;
              switchQuality(sources[nextIdx], true);
              showToast(`Авто: качество повышено до ${sources[nextIdx].quality}`, 'info');
          }
      }, 10_000);
      return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources]);

  // Отображение текущего качества в меню
  const qualityLabel = isAutoMode
      ? `Авто · ${currentSource.quality}`
      : currentSource.quality;

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

    {/* 2. Качество */}
    {hasQualities && (
      <div className="menu-item" onClick={() => setCurrentMenu('quality')}>
        <span className="menu-label">Качество</span>
        <span className="menu-value">{qualityLabel} ›</span>
      </div>
    )}

    {/* 3. Субтитры */}
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
    <div ref={containerRef} tabIndex={0} style={{ outline: 'none' }} className={`yt-player-container ${isZoomFill ? 'zoom-active' : ''} ${(isFullscreen || isCSSFullscreen) ? 'is-fullscreen' : ''} ${isCSSFullscreen ? 'is-css-fullscreen' : ''}`} onMouseMove={showControlsTemporarily} onTouchStart={showControlsTemporarily} onMouseLeave={() => {
        if (Date.now() - lastTouchTimeRef.current < 500) return;
        if (!showSettings) setShowControls(false);
      }}>
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
                    <div className="feedback-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Icons.LogSuccess size={20}/> Верно!</div>
                )}
                
                {/* 2. Блок Ошибки: показываем пояснение и кнопки действий */}
                {feedback === 'incorrect' && !hideResults && (
                    <div>
                        <div className="feedback-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Icons.Fail size={20}/> Ошибка</div>
                        {activeEvent.explanation && <div className="explanation-box">{activeEvent.explanation}</div>}
                        
                        <div style={{ marginTop: '25px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            {activeEvent.rewindTo !== undefined && activeEvent.rewindTo !== null ? (
                                <button className="primary-btn" onClick={handleRewind} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><Icons.Back size={14}/> Пересмотреть фрагмент</button>
                            ) : activeEvent.isStrict ? (
                                <button className="primary-btn" onClick={handleRetry} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><Icons.Refresh size={14}/> Попробовать снова</button>
                            ) : (
                                <button className="primary-btn" style={{background: 'var(--bg-input)'}} onClick={() => handleContinue(false)}>Пропустить ⏭</button>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Само задание (до ответа) */}
                {!feedback && (
                    <>
                        <h3 style={{color: 'var(--primary)'}}>
                            {activeEvent.type === 'info' ? <><Icons.Lightbulb size={16}/> Информация</> : <><Icons.HelpCircle size={16}/> Вопрос</>}
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
                            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                                {!hasTestQuestions 
                                    ? 'Надеемся, лекция была полезной!' 
                                    : 'Вы уже успешно прошли тестирование к этому уроку.'}
                            </p>
                            <button className="primary-btn" onClick={replayVideo} style={{ padding: '10px 20px' }}>
                                <VideoPlayeIcons.Refresh /> Смотреть лекцию заново
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
                                        <VideoPlayeIcons.Refresh /> Смотреть лекцию заново
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
                                                <span className="res-status" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{res.isCorrect ? <><Icons.LogSuccess size={13}/> Верно</> : <><Icons.Fail size={13}/> Ошибка</>}</span>
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
                            <p style={{marginTop: '20px', color: 'var(--text-muted)'}}>Ваши ответы успешно сохранены и отправлены преподавателю.</p>
                            <button className="primary-btn" onClick={replayVideo} style={{marginTop: '20px'}}><VideoPlayeIcons.Refresh /> Смотреть заново</button>
                        </div>
                    )}
                </div>
            </div>
          );
      })()}
      
      <div className={`video-title-overlay ${showControls ? 'show' : ''}`}>
        <div className="video-title-text">{title || 'Лекция'}</div>
        {maxAttempts !== undefined && maxAttempts > 0 && hasQuestions && (
            <div className="video-attempts-badge">
                Попыток пересдачи: {Math.max(0, maxAttempts - attemptsUsed)} из {maxAttempts}
            </div>
        )}
      </div>

      {currentEmbedUrl && (
          <>
              <iframe
                  ref={externalIframeRef}
                  src={currentEmbedUrl}
                  className="yt-video"
                  style={{ border: 'none', width: '100%', height: isRutube ? 'calc(100% + 120px)' : '100%', position: 'absolute', top: isRutube ? '-4px' : 0, left: 0, zIndex: 1 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  loading="lazy"
                  tabIndex={-1}
                  title={title || 'Видео'}
              />
              {/* Прозрачный оверлей: перехватывает клики, чтобы они попадали в кастомные контролы, а не в iframe */}
              <div
                  style={{ position: 'absolute', inset: 0, zIndex: 2, cursor: 'pointer', outline: 'none' }}
                  tabIndex={0}
                  onDoubleClick={toggleFullscreen}
                  onMouseDown={() => { containerRef.current?.focus(); handlePressStart(); }}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressCancel}
                  onTouchStart={handlePressStart}
                  onTouchEnd={handlePressEnd}
              />
          </>
      )}
      <video
        ref={videoRef}
        src={currentEmbedUrl ? '' : currentSource.url.endsWith('.m3u8') ? undefined : normalizeUploadUrl(currentSource.url)}
        style={currentEmbedUrl ? { display: 'none' } : { pointerEvents: 'none' }}
        className={`yt-video ${showControls ? 'controls-visible' : ''}`}
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
            setDuration(videoRef.current?.duration || 0);
            if (pendingSeekRef.current !== null && videoRef.current) {
                videoRef.current.currentTime = pendingSeekRef.current;
                anticheatTimeRef.current = pendingSeekRef.current;
                pendingSeekRef.current = null;
            }
            if (pendingPlayRef.current) {
                pendingPlayRef.current = false;
                safePlay();
            }
        }}
        onDurationChange={() => {
            const d = videoRef.current?.duration;
            if (d && isFinite(d) && d > 0) setDuration(d);
        }}
        onLoadStart={() => { setIsBuffering(true); isSeekingRef.current = false; }}
        onLoadedData={() => setIsBuffering(false)}
        onPlay={() => setIsPlaying(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
        onStalled={() => setIsBuffering(true)}
        onPause={() => {
            setIsPlaying(false);
            if (videoId && videoRef.current) {
                savePlaybackProgress(videoId, videoRef.current.currentTime, false);
                lastSavedTimeRef.current = videoRef.current.currentTime;
            }
        }}
        onError={() => {
            const code = videoRef.current?.error?.code;
            const msgs: Record<number, string> = {
                1: 'Загрузка видео прервана',
                2: 'Видеофайл не найден (404)',
                3: 'Ошибка декодирования видео',
                4: 'Формат видео не поддерживается',
            };
            const msg = (code && msgs[code]) || 'Не удалось загрузить видео';
            showToast(msg, 'error');
            console.error('[VideoPlayer] mediaError code:', code, 'src:', currentSource.url);
        }}
        onSeeking={() => { isSeekingRef.current = true; }}
        onSeeked={() => { isSeekingRef.current = false; }}
        onEnded={handleVideoEnd}
        onWaiting={handleVideoWaiting}
        muted={isMuted}
      >
          {currentSource.subtitles?.map((sub, idx) => (
              <track key={idx} kind="subtitles" src={normalizeUploadUrl(sub.src)} srcLang={sub.lang} label={sub.label} />
          ))}
      </video>

      {/* Прозрачный overlay для нативного видео — перехватывает touch/click до браузера,
          чтобы iOS Safari не мог перехватить тап для нативных видео-контролов */}
      {!currentEmbedUrl && (
          <div
              style={{ position: 'absolute', inset: 0, zIndex: 2, cursor: 'pointer', touchAction: 'manipulation', background: 'rgba(0,0,0,0.001)' }}
              onDoubleClick={handleVideoDoubleClick}
              onMouseDown={(e) => { containerRef.current?.focus(); handlePressStart(e); }}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressCancel}
              onTouchStart={handlePressStart}
              onTouchEnd={handlePressEnd}
              onTouchCancel={handlePressCancel}
          />
      )}

      {isBuffering && !currentEmbedUrl && (
          <div style={{
              position: 'absolute', inset: 0, zIndex: 20,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '12px', pointerEvents: 'none',
          }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: '36px' }}>
                  {[0, 1, 2, 3, 4].map(i => (
                      <div key={i} style={{
                          width: '5px',
                          borderRadius: '3px',
                          background: 'var(--primary)',
                          boxShadow: '0 0 8px var(--primary)',
                          animation: `lumeo-bar 0.9s ease-in-out infinite`,
                          animationDelay: `${i * 0.15}s`,
                      }} />
                  ))}
              </div>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  загрузка
              </span>
              <style>{`
                  @keyframes lumeo-bar {
                      0%, 100% { height: 6px; opacity: 0.4; }
                      50%       { height: 32px; opacity: 1; }
                  }
              `}</style>
          </div>
      )}

      {isSpeedingUp && (
          <div className="speed-overlay" style={{ position: 'absolute', zIndex: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.Rocket size={16}/> 2x Скорость</span>
          </div>
      )}

      {/* Кастомные субтитры с позиционированием */}
      {currentCueText && (
          <div
              ref={subtitleRef}
              style={{
                  position: 'absolute',
                  left: `${subtitlePos.x}%`,
                  top: `${subtitlePos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 30,
                  pointerEvents: 'auto',
                  maxWidth: '80%',
                  textAlign: 'center',
                  cursor: 'move',
                  userSelect: 'none',
                  touchAction: 'none',
              }}
              onPointerDown={handleSubtitlePointerDown}
              onPointerMove={handleSubtitlePointerMove}
              onPointerUp={handleSubtitlePointerUp}
              onPointerCancel={handleSubtitlePointerUp}
          >
              {currentCueText.split('\n').map((line, i) => (
                  <div key={i} style={{
                      display: 'inline-block',
                      background: 'rgba(0,0,0,0.75)',
                      color: '#fff',
                      fontSize: `${subtitleSize}px`,
                      lineHeight: 1.4,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      marginBottom: '2px',
                      whiteSpace: 'pre-wrap',
                      width: '100%',
                  }}>{line}</div>
              ))}
          </div>
      )}

      {seekFeedback && (
          <div key={seekFeedback.key} className={`seek-feedback seek-feedback-${seekFeedback.direction}`}
              onAnimationEnd={() => setSeekFeedback(null)}>
              {seekFeedback.direction === 'left' ? '« 10с' : '10с »'}
          </div>
      )}

      {!isPlaying && !isBuffering && !activeEvent && !showEndScreen && (
        <div
          className="center-play-overlay-static"
          style={{ zIndex: 5, opacity: showControls ? 1 : 0, transition: 'opacity 0.3s', pointerEvents: showControls ? 'auto' : 'none' }}
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); lastTouchTimeRef.current = Date.now(); togglePlay(); }}
          onClick={togglePlay}
        >
          <VideoPlayeIcons.Play />
        </div>
      )}

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

            {!currentEmbedUrl && bufferedPercent > 0 && (
                <div className="yt-buffer-bar" style={{ width: `${bufferedPercent}%` }} />
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
                {isPlaying ? <VideoPlayeIcons.Pause /> : <VideoPlayeIcons.Play />}
            </button>
            
            <div className="volume-control-group">
                <button className="yt-btn" onClick={() => setIsMuted(!isMuted)}>
                    {isMuted || volume === 0 ? <VideoPlayeIcons.VolumeMuted /> : <VideoPlayeIcons.VolumeHigh />}
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
                    <VideoPlayeIcons.Captions />
                </button>
            )}
            
            {!currentEmbedUrl && document.pictureInPictureEnabled && (
            <button
                className="yt-btn"
                onClick={() => videoRef.current?.requestPictureInPicture().catch(() => {})}
                title="Картинка в картинке"
            >
                <VideoPlayeIcons.Pip />
            </button>
            )}
            
            <div className="settings-wrapper" ref={settingsRef}>
              <button 
                className={`yt-btn ${showSettings ? 'rotate' : ''}`} 
                onClick={() => { setShowSettings(!showSettings); setCurrentMenu('main'); }}
                title="Настройки"
              >
                <VideoPlayeIcons.Settings />
              </button>
              
              {showSettings && (
                <div className="yt-settings-menu">
                  {currentMenu === 'main' && renderMainMenu()}
                  {currentMenu === 'speed' && (
                      <div className="menu-list">
                        <div className="menu-header" onClick={() => setCurrentMenu('main')}>‹ Скорость</div>
                        {playbackRates.map(rate => (
                            <div key={rate} className="menu-item" onClick={() => {
                                setPlaybackRate(rate);
                                if (currentEmbedUrl) {
                                    if (isYouTube && ytPlayerRef.current?.setPlaybackRate) {
                                        ytPlayerRef.current.setPlaybackRate(rate);
                                    } else if (externalIframeRef.current?.contentWindow) {
                                        externalIframeRef.current.contentWindow.postMessage(
                                            JSON.stringify({ type: 'player:setPlaybackRate', data: { rate } }), '*'
                                        );
                                    }
                                } else if (videoRef.current) {
                                    videoRef.current.playbackRate = rate;
                                }
                                setShowSettings(false);
                            }}>
                                <span>{rate}x</span>
                            </div>
                        ))}
                      </div>
                  )}
                  {currentMenu === 'quality' && (
                      <div className="menu-list">
                        <div className="menu-header" onClick={() => setCurrentMenu('main')}>‹ Качество</div>
                        {/* Авто — тумблер */}
                        <div className="menu-item" onClick={e => {
                            e.stopPropagation();
                            const next = !isAutoMode;
                            setIsAutoMode(next);
                            isAutoModeRef.current = next;
                            if (next) { autoIdxRef.current = 0; switchQuality(sources[0], true); }
                        }}>
                            <span className="menu-label">Авто</span>
                            <div className={`quality-auto-toggle ${isAutoMode ? 'on' : ''}`}>
                                <div className="quality-auto-toggle-knob" />
                            </div>
                        </div>
                        <div className="menu-divider" />
                        {sources.map(src => (
                            <div key={src.quality} className={`menu-item ${isAutoMode ? 'menu-item-disabled' : ''}`} onClick={() => !isAutoMode && switchQuality(src)}>
                                <span>{src.quality}</span>
                                {!isAutoMode && currentSource.quality === src.quality && <span className="check-mark">●</span>}
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
                        <div className="menu-divider" />
                        <div className="menu-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }} onClick={e => e.stopPropagation()}>
                            <span className="menu-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Размер: {subtitleSize}px</span>
                            <input type="range" min={10} max={36} step={1} value={subtitleSize}
                                onChange={e => setSubtitleSize(Number(e.target.value))}
                                style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                        </div>
                        <div className="menu-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }} onClick={e => e.stopPropagation()}>
                            <span className="menu-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>По вертикали: {subtitlePos.y}%</span>
                            <input type="range" min={5} max={95} step={1} value={subtitlePos.y}
                                onChange={e => setSubtitlePos(p => ({ ...p, y: Number(e.target.value) }))}
                                style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                        </div>
                        <div className="menu-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }} onClick={e => e.stopPropagation()}>
                            <span className="menu-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>По горизонтали: {subtitlePos.x}%</span>
                            <input type="range" min={5} max={95} step={1} value={subtitlePos.x}
                                onChange={e => setSubtitlePos(p => ({ ...p, x: Number(e.target.value) }))}
                                style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                        </div>
                        <div className="menu-item" onClick={() => setSubtitlePos({ x: 50, y: 88 })} style={{ justifyContent: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Сбросить позицию</span>
                        </div>
                      </div>
                  )}
                  {currentMenu === 'chapters' && (
                      <div className="menu-list" style={{maxHeight: '300px', overflowY: 'auto'}}>
                        <div className="menu-header" onClick={() => setCurrentMenu('main')}>‹ Главы</div>
                        {chapters.map((chap) => (
                            <div key={chap.id} className="menu-item" onClick={() => jumpToChapter(chap.time)}>
                                <div style={{display: 'flex', gap: '10px', width: '100%'}}>
                                    <span style={{color: 'var(--primary)', fontWeight: 'bold', minWidth: '40px'}}>{formatTime(chap.time)}</span>
                                    <span style={{whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px'}}>{chap.question}</span>
                                </div>
                            </div>
                        ))}
                      </div>
                  )}
                </div>
              )}
          </div>
            <button className="yt-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Выйти из полного экрана (f)' : 'Полный экран (f)'}>
                {(isFullscreen || isCSSFullscreen) ? <VideoPlayeIcons.FullscreenExit /> : <VideoPlayeIcons.Fullscreen />}
            </button>
          </div>
        </div>
      </div>
  </div>
  );
};