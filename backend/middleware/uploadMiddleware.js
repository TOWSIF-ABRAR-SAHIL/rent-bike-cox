const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
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

const upload = multer({ storage: storage });

module.exports = upload;
