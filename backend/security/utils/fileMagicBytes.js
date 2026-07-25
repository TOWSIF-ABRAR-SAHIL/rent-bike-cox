const MAGIC_BYTES = {
  jpeg: {
    bytes: [0xff, 0xd8, 0xff],
    mime: 'image/jpeg',
    extensions: ['.jpg', '.jpeg'],
  },
  png: {
    bytes: [0x89, 0x50, 0x4e, 0x47],
    mime: 'image/png',
    extensions: ['.png'],
  },
  gif: {
    bytes: [0x47, 0x49, 0x46, 0x38],
    mime: 'image/gif',
    extensions: ['.gif'],
  },
  webp: {
    bytes: [0x52, 0x49, 0x46, 0x46],
    mime: 'image/webp',
    extensions: ['.webp'],
  },
  pdf: {
    bytes: [0x25, 0x50, 0x44, 0x46],
    mime: 'application/pdf',
    extensions: ['.pdf'],
  },
};

const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.php', '.php3', '.php4', '.php5', '.phtml',
  '.js', '.vbs', '.vbe', '.ws', '.wsh',
  '.sh', '.bash', '.csh', '.ksh',
  '.py', '.pl', '.rb',
  '.jsp', '.jspx', '.asp', '.aspx',
  '.svg', '.html', '.htm', '.shtml',
  '.jar', '.class', '.war',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
];

const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png'];

function getMagicBytes(buffer) {
  if (!buffer || buffer.length < 4) return null;
  const bytes = Array.from(buffer.slice(0, 8));

  for (const [name, info] of Object.entries(MAGIC_BYTES)) {
    const match = info.bytes.every((b, i) => bytes[i] === b);
    if (match) return { type: name, ...info };
  }
  return null;
}

function validateFile(buffer, originalName) {
  const ext = getExtension(originalName);

  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      reason: `File extension "${ext}" is not allowed`,
    };
  }

  const magic = getMagicBytes(buffer);
  if (!magic) {
    return {
      valid: false,
      reason: 'Unable to determine file type from content',
    };
  }

  if (!ALLOWED_MIMES.includes(magic.mime)) {
    return {
      valid: false,
      reason: `File content is "${magic.mime}", only JPEG and PNG are allowed`,
    };
  }

  return {
    valid: true,
    detectedMime: magic.mime,
    detectedType: magic.type,
  };
}

function getExtension(filename) {
  if (!filename) return '';
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? '' : filename.slice(lastDot).toLowerCase();
}

function isImageBuffer(buffer) {
  const magic = getMagicBytes(buffer);
  return magic !== null && ALLOWED_MIMES.includes(magic.mime);
}

module.exports = {
  validateFile,
  getMagicBytes,
  getExtension,
  isImageBuffer,
  MAGIC_BYTES,
  BLOCKED_EXTENSIONS,
  ALLOWED_MIMES,
};
