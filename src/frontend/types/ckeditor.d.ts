declare module '@ckeditor/ckeditor5-react' {
  import * as React from 'react';
  import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

  export interface CKEditorProps {
    editor: typeof ClassicEditor;
    data?: string;
    config?: object;
    disabled?: boolean;
    id?: string;
    name?: string;
    onReady?: (editor: ClassicEditor) => void;
    onChange?: (event: unknown, editor: ClassicEditor) => void;
    onBlur?: (event: unknown, editor: ClassicEditor) => void;
    onFocus?: (event: unknown, editor: ClassicEditor) => void;
  }

  export class CKEditor extends React.Component<CKEditorProps> {}
}

declare module '@ckeditor/ckeditor5-build-classic' {
  import { Editor } from '@ckeditor/ckeditor5-core';
  export default class ClassicEditor extends Editor {
    getData(): string;
    setData(data: string): void;
    // Bạn có thể thêm các phương thức khác nếu dùng
  }
}
