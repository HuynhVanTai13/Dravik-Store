'use client';

import React from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

// URL upload của BE
const UPLOAD_URL =
  process.env.NEXT_PUBLIC_UPLOAD_URL || 'http://localhost:5000/api/uploads/ckeditor';

/** Kiểu tối thiểu để tránh any */
type CKFileLoader = { file: Promise<File> };
type CKUploadResult = { default: string };
interface CKUploadAdapter { upload(): Promise<CKUploadResult>; abort?(): void; }
interface CKEditorWithRepo {
  plugins: {
    get: (name: 'FileRepository') => {
      createUploadAdapter: (loader: CKFileLoader) => CKUploadAdapter;
    };
    has: (name: string) => boolean;
  };
}

/** Upload adapter */
class MyUploadAdapter implements CKUploadAdapter {
  constructor(private loader: CKFileLoader) {}
  async upload(): Promise<CKUploadResult> {
    const file = await this.loader.file;
    const form = new FormData();
    form.append('upload', file);
    const res = await fetch(UPLOAD_URL, { method: 'POST', body: form, credentials: 'include' });
    if (!res.ok) throw new Error((await res.text().catch(() => '')) || `Upload failed: ${res.status}`);
    const data: { url?: string } = await res.json();
    if (!data.url) throw new Error('Invalid upload response: missing url');
    return { default: data.url };
  }
  abort(): void {}
}

function MyCustomUploadAdapterPlugin(editor: unknown) {
  (editor as CKEditorWithRepo).plugins.get('FileRepository').createUploadAdapter = (loader: CKFileLoader) =>
    new MyUploadAdapter(loader);
}

type Props = { value: string; onChange: (html: string) => void };

export default function CKEditorWrapper({ value, onChange }: Props) {
  return (
    <CKEditor
      editor={ClassicEditor}
      data={value || ''}
      config={{
        extraPlugins: [MyCustomUploadAdapterPlugin],

        // Ảnh: đủ style & resize (nếu build có ImageResize)
        image: {
          toolbar: [
            'imageStyle:full', 'imageStyle:side',
            '|', 'imageStyle:alignLeft', 'imageStyle:alignCenter', 'imageStyle:alignRight',
            '|', 'resizeImage',
            '|', 'linkImage', 'toggleImageCaption', 'imageTextAlternative',
          ],
          // Lưu ý: 'full' & 'side' hữu ích nhất khi build thiếu ImageResize
          styles: ['full', 'side', 'alignLeft', 'alignCenter', 'alignRight'],
          resizeUnit: '%',
          resizeOptions: [
            { name: 'resizeImage:original', value: null, label: '100%' },
            { name: 'resizeImage:75', value: '75', label: '75%' },
            { name: 'resizeImage:50', value: '50', label: '50%' },
            { name: 'resizeImage:25', value: '25', label: '25%' },
          ],
        },

        alignment: { options: ['left', 'center', 'right', 'justify'] },
        mediaEmbed: { previewsInData: true },
        htmlSupport: { allow: [{ name: /.*/, attributes: true, classes: true, styles: true }] },

        toolbar: {
          shouldNotGroupWhenFull: true,
          items: [
            'heading', '|',
            'bold', 'italic', 'underline', 'link',
            'bulletedList', 'numberedList', '|',
            'alignment', '|',
            'insertImage', 'imageUpload', 'mediaEmbed', '|',
            'insertTable', '|',
            'undo', 'redo',
          ],
        },
      }}
      onReady={(editor) => {
        // Kiểm tra build hiện có plugin gì
        const has = (n: string) => (editor as CKEditorWithRepo).plugins.has(n);
        console.log('Plugins -> ImageStyle:', has('ImageStyle'),
          ' ImageResize:', has('ImageResize'),
          ' ImageUpload:', has('ImageUpload'),
          ' ImageToolbar:', has('ImageToolbar'),
          ' MediaEmbed:', has('MediaEmbed'));
      }}
      onChange={(_, editor) => onChange(editor.getData())}
    />
  );
}
