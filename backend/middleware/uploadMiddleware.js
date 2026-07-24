const multer = require('multer');
const crypto = require('crypto');

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const MAGIC_BYTES = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
};

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
      const expected = MAGIC_BYTES[file.mimetype];
      if (expected) {
        const header = Array.from(file.buffer.slice(0, expected.length));
        const valid = header.every((byte, i) => byte === expected[i]);
        if (!valid) {
          return cb(new Error('File content does not match its type'), false);
        }
      }
    }

    cb(null, true);
  }
});

module.exports = upload;
