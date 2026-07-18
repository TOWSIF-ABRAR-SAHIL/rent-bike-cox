const multer = require('multer');

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

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
        public_id: `${Date.now()}-${file.originalname.split('.')[0]}`
      };
    },
  });
} else {
  storage = multer.memoryStorage();
}

const upload = multer({ storage: storage });

module.exports = upload;
