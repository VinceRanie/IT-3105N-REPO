const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directories if they don't exist
const uploadDirs = {
  specimens: path.join(__dirname, '../uploads/specimens'),
  fasta: path.join(__dirname, '../uploads/fasta')
};

Object.values(uploadDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage for specimens (images)
const specimenStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'fasta_file') {
      cb(null, uploadDirs.fasta);
    } else {
      cb(null, uploadDirs.specimens);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  }
});

// File filter - accept images and FASTA files
const fileFilter = (req, file, cb) => {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const textTypes = ['text/plain', 'application/octet-stream']; // FASTA files
  
  if (file.fieldname === 'image' || file.fieldname === 'custom_images') {
    if (imageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
    }
  } else if (file.fieldname === 'fasta_file') {
    const ext = path.extname(file.originalname).toLowerCase();
    if (textTypes.includes(file.mimetype) || ext === '.fasta' || ext === '.fa' || ext === '.txt') {
      cb(null, true);
    } else {
      cb(new Error('Invalid FASTA file type. Only .fasta, .fa, or .txt files are allowed.'), false);
    }
  } else {
    cb(new Error('Unexpected field name'), false);
  }
};

// Configure multer
const upload = multer({
  storage: specimenStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size (increased for FASTA files)
  }
});

module.exports = upload;
