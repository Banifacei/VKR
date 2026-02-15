// Добавим интерфейс для наших новых вариантов ответов
export interface IOption {
    text: string;
    isCorrect: boolean;
}

export interface IInteractiveEvent {
    id: number;
    time: number;
    type: 'single_choice' | 'multiple_choice' | 'free_text' | 'info' | 'chapter' | 'question';
    question: string;
    options?: IOption[]; 
    correctAnswer?: string;
    isStrict?: boolean;
    weight?: number;
    rewindTo?: number;
    explanation?: string;
    aiThreshold?: number;
}

export interface ISubtitle {
    lang: string;
    label: string;
    src: string;
}

export interface IVideo {
    id: number;
    title: string;
    url: string;
    subtitles?: ISubtitle[];
    hideResults: boolean;
    events: IInteractiveEvent[];
    courseId?: number; 
    createdAt?: string;
    updatedAt?: string;
}

export interface ICourse {
    id: number;
    title: string;
    description: string;
    instructor: string;
    videos?: IVideo[];
}