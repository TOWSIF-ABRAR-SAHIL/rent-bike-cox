const multer = require('multer');
const crypto = require('crypto');
const { validateFile } = require('../security/utils/fileMagicBytes');

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_DOC_SIZE = 1 * 1024 * 1024;

let storage;

if (cloudName && apiKey && apiSecret && !cloudName.startsWith('your-')) {
  const cloudinary = require('cloudinary').v2;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  });

  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      let folderName = 'general';
      if (req.path.includes('register')) {
        folderName = file.fieldname === 'nidImage' ? 'nids' : 'licenses';
      } else if (req.path.includes('bikes')) {
        folderName = 'bikes';
      }

      return {
        folder: `rent-bike-cox/${folderName}`,
        allowed_formats: ['jpg', 'png', 'jpeg'],
        public_id: crypto.createHash('sha256').update(`${Date.now()}-${crypto.randomBytes(8).toString('hex')}`).digest('hex').slice(0, 20),
        type: 'upload',
      };
    },
  });
} else {
  storage = multer.memoryStorage();
}

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(new Error('Only JPG, JPEG, and PNG files are allowed'), false);
    }

    if (file.buffer) {
      const result = validateFile(file.buffer, file.originalname);
      if (!result.valid) {
        return cb(new Error(result.reason), false);
      }
    }

    const isDoc = file.fieldname === 'nidImage' || file.fieldname === 'licenseImage';
    cb(null, true);
  }
});

upload.docUpload = multer({
  storage,
  limits: { fileSize: MAX_DOC_SIZE },
  fileFilter: upload.fileFilter,
});

module.exports = upload;
