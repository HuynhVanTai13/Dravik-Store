// src/backend/middlewares/upload.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Tạo một uploader lưu file vào uploads/<subFolder>
 *  - subFolder: 'products' | 'comments' | ...
 */
export const makeUploader = (subFolder = 'products') => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = `uploads/${subFolder}`;
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, filename.toLowerCase());
    },
  });

  const fileFilter = (req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(
      file.mimetype
    );
    cb(ok ? null : new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'images'), ok);
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024, files: 6 }, // 5MB, tối đa 6 ảnh
  });
};

// Uploader mặc định cho sản phẩm (giữ tương thích cũ)
const upload = makeUploader('products');
export default upload;
