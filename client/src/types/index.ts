export interface IInteractiveEvent {
    id: number;
    time: number;
    type: 'question' | 'info' | 'chapter';
    question: string;
    options?: string[];
    correctAnswer?: string;
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