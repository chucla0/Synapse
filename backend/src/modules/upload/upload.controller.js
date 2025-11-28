const multer = require('multer');
const path = require('path');

// Set up storage engine
const storage = multer.diskStorage({
  destination: './public/uploads/avatars',
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Error: Solo se permiten imágenes (jpeg, jpg, png, gif)!'), false);
  }
};

// Initialize upload middleware
const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Limit file size to 2MB
  fileFilter: fileFilter
}).single('avatar'); // 'avatar' is the name of the form field

/**
 * Handle avatar upload
 */
function uploadAvatar(req, res) {
  upload(req, res, (err) => {
    if (err) {
      // Handle Multer errors (e.g., file size limit)
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: 'Upload Error', message: err.message });
      }
      // Handle file filter errors
      return res.status(400).json({ error: 'File Type Error', message: err.message });
    }
    
    // Check if file was uploaded
    if (req.file == undefined) {
      return res.status(400).json({ error: 'Upload Error', message: 'No se ha seleccionado ningún archivo.' });
    }

    // Return the path to the file
    // The path should be relative to the server's public URL
    const filePath = `/uploads/avatars/${req.file.filename}`;
    res.json({
      message: 'Avatar subido correctamente!',
      filePath: filePath
    });
  });
}

// Storage for event attachments
const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fs = require('fs');
    const dir = './public/uploads/attachments';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'attachment-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Generic file filter (allow images, pdf, docs)
const attachmentFilter = (req, file, cb) => {
  // Allow images, pdf, doc, docx, xls, xlsx, txt
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
  const mimetype = allowedTypes.test(file.mimetype) || 
                   file.mimetype === 'application/pdf' ||
                   file.mimetype === 'application/msword' ||
                   file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (extname) { // Relying mostly on extension for simplicity in this context
    return cb(null, true);
  } else {
    cb(new Error('Error: Tipo de archivo no permitido!'), false);
  }
};

// Middleware for attachments
const uploadAttachmentMiddleware = multer({
  storage: attachmentStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: attachmentFilter
}).single('file');

/**
 * Handle attachment upload
 */
function uploadAttachment(req, res) {
  uploadAttachmentMiddleware(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: 'Upload Error', message: err.message });
      }
      return res.status(400).json({ error: 'File Type Error', message: err.message });
    }
    
    if (req.file == undefined) {
      return res.status(400).json({ error: 'Upload Error', message: 'No se ha seleccionado ningún archivo.' });
    }

    const filePath = `/uploads/attachments/${req.file.filename}`;
    res.json({
      message: 'Archivo subido correctamente!',
      file: {
        url: filePath,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size
      }
    });
  });
}

module.exports = {
  uploadAvatar,
  uploadAttachment
};
