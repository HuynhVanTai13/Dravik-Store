// routes/upload.routes.js
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Dùng path.resolve() để có root dir trong ESM
const ROOT_DIR = path.resolve();
// Lưu file CKEditor vào /uploads/ckeditor (cùng cấp server.js)
const CK_DIR = path.join(ROOT_DIR, 'uploads', 'ckeditor');

// Tạo thư mục nếu chưa tồn tại
if (!fs.existsSync(CK_DIR)) {
    fs.mkdirSync(CK_DIR, { recursive: true });
}

// Cấu hình Multer
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, CK_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '');
        const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, name);
    }
});
const upload = multer({ storage });

const router = express.Router();

/**
 * CKEditor 5 SimpleUploadAdapter mặc định gửi field 'upload'
 * Trả về JSON { url: 'http://host/uploads/ckeditor/xxx.jpg' }
 */
router.post('/ckeditor', upload.single('upload'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file' });
        const port = process.env.PORT || 5000;
        const fileUrl = `http://localhost:${port}/uploads/ckeditor/${req.file.filename}`;
        return res.json({ url: fileUrl });
    } catch (err) {
        console.error('CKEditor upload error:', err);
        return res.status(500).json({ error: 'Upload failed' });
    }
});

export default router;