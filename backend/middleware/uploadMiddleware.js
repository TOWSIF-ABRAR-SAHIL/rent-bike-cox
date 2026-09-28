const multer = require('multer');
const crypto = require('crypto');
const { HttpError } = require('../utils/httpError');
const { guardStorage } = require('./fileContentGuard');

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

// Content (magic byte) validation is wrapped around the storage, where the bytes exist,
// rather than sitting in `fileFilter`, which multer calls before it has read any of the
// file. See middleware/fileContentGuard.js for why that matters on the Cloudinary path.
const guardedStorage = guardStorage(storage);

const upload = multer({
  storage: guardedStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    // Rejections are HttpError, not Error: these messages are ours and are the only
    // way the caller learns which check failed. As plain Errors they carried no
    // status, so the error handler answered 500 "Internal server error" for what is
    // really a 400 — and the old `message.includes('Only JPG')` sniff in the handler
    // only ever matched the mimetype text, so every magic-byte rejection surfaced as
    // a server fault. The declared type is all this filter can see; the bytes are
    // checked in fileContentGuard.
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(new HttpError(400, 'Only JPG, JPEG, and PNG files are allowed'), false);
    }

    cb(null, true);
  }
});

upload.docUpload = multer({
  storage: guardedStorage,
  limits: { fileSize: MAX_DOC_SIZE },
  fileFilter: upload.fileFilter,
});

module.exports = upload;
