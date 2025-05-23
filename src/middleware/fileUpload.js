import multer from 'multer';
import path from 'path';
import { fileUploadConfig } from '../config/security.js';
import { logSecurityEvent } from '../services/loggingService.js';

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, fileUploadConfig.destination);
  },
  filename: (req, file, cb) => {
    const sanitizedName = fileUploadConfig.sanitizeFilename(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + sanitizedName);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check mime type
  if (!fileUploadConfig.allowedMimeTypes.includes(file.mimetype)) {
    logSecurityEvent({
      userId: req.user?.id,
      action: 'FILE_UPLOAD_REJECTED',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      success: false,
      details: {
        reason: 'Invalid file type',
        filename: file.originalname,
        mimetype: file.mimetype
      }
    });
    return cb(new Error('Invalid file type'), false);
  }

  // Additional security checks
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png' && ext !== '.pdf' && 
      ext !== '.doc' && ext !== '.docx') {
    logSecurityEvent({
      userId: req.user?.id,
      action: 'FILE_UPLOAD_REJECTED',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      success: false,
      details: {
        reason: 'Invalid file extension',
        filename: file.originalname,
        extension: ext
      }
    });
    return cb(new Error('Invalid file extension'), false);
  }

  cb(null, true);
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: fileUploadConfig.maxFileSize
  }
});

// Middleware for handling file upload errors
export const handleFileUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File too large',
        details: `Maximum file size is ${fileUploadConfig.maxFileSize / (1024 * 1024)}MB`
      });
    }
    return res.status(400).json({ message: err.message });
  }
  
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  
  next();
};

// Export configured upload middleware
export const uploadFile = (fieldName) => {
  return [
    upload.single(fieldName),
    handleFileUploadError
  ];
};

export const uploadFiles = (fieldName, maxCount) => {
  return [
    upload.array(fieldName, maxCount),
    handleFileUploadError
  ];
};
