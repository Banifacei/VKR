declare module '@monaco-editor/react' {
    import * as React from 'react';
    interface EditorProps {
        height?: string | number;
        width?: string | number;
        language?: string;
        value?: string;
        defaultValue?: string;
        theme?: string;
        options?: Record<string, any>;
        onChange?: (value: string | undefined) => void;
        onMount?: (editor: any, monaco: any) => void;
        beforeMount?: (monaco: any) => void;
        loading?: React.ReactNode;
        className?: string;
    }
    const Editor: React.FC<EditorProps>;
    export default Editor;
}
