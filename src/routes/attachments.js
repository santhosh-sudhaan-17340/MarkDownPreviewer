const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const AttachmentController = require('../controllers/attachmentController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Accept images, documents, and common file types
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip|rar/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, documents, and archives are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB default
  },
  fileFilter: fileFilter,
});

// Routes
router.post('/tickets/:ticketId/attachments', upload.single('file'), AttachmentController.uploadAttachment);
router.get('/tickets/:ticketId/attachments', AttachmentController.getTicketAttachments);
router.get('/attachments/:id', AttachmentController.getAttachmentMetadata);
router.get('/attachments/:id/download', AttachmentController.downloadAttachment);
router.delete('/attachments/:id', AttachmentController.deleteAttachment);
router.get('/attachments/stats/storage', AttachmentController.getStorageStatistics);

module.exports = router;
