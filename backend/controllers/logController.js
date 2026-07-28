const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const LOG_DIR = process.cwd();
const MAX_LINES = 5000;

function tailFile(filePath, lines = 200) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) return resolve([]);
    const stat = fs.statSync(filePath);
    if (stat.size === 0) return resolve([]);

    const chunkSize = Math.min(stat.size, 1024 * 64);
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(chunkSize);
    const readStart = Math.max(0, stat.size - chunkSize);
    fs.readSync(fd, buffer, 0, chunkSize, readStart);
    fs.closeSync(fd);

    const text = buffer.toString('utf-8');
    const allLines = text.split('\n').filter(Boolean);
    const result = allLines.slice(-Math.min(lines, MAX_LINES));
    resolve(result.map((line, i) => {
      try { return { line: readStart > 0 ? i + 1 : i + 1, content: JSON.parse(line) }; }
      catch { return { line: i + 1, content: line }; }
    }));
  });
}

exports.getLogs = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });

    const type = req.query.type || 'app';
    const lines = Math.min(1000, Math.max(10, parseInt(req.query.lines) || 200));
    const logFile = type === 'error' ? 'server-error.log' : 'server.log';
    const filePath = path.join(LOG_DIR, logFile);

    const entries = await tailFile(filePath, lines);
    res.json({ type, file: logFile, total: entries.length, entries });
  } catch (error) {
    logger.error('getLogs error', { message: error.message });
    res.status(500).json({ message: 'Failed to read logs' });
  }
};
