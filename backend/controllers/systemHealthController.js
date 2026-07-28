const mongoose = require('mongoose');
const os = require('os');
const { defaultCache } = require('../utils/cache');
const logger = require('../utils/logger');

exports.getSystemHealth = async (req, res) => {
  try {
    const serverUptime = process.uptime();
    const memUsage = process.memoryUsage();

    let dbStatus = 'disconnected';
    let dbResponseTime = 0;
    let collections = 0;
    let totalDocuments = 0;

    if (mongoose.connection.readyState === 1) {
      const dbStart = Date.now();
      await mongoose.connection.db.admin().ping();
      dbResponseTime = Date.now() - dbStart;
      dbStatus = 'connected';

      const colls = await mongoose.connection.db.listCollections().toArray();
      collections = colls.length;
      for (const coll of colls) {
        const count = await mongoose.connection.db.collection(coll.name).countDocuments();
        totalDocuments += count;
      }
    }

    const cpuInfo = os.cpus();
    const cpuUsage = os.loadavg()[0] / cpuInfo.length * 100;

    const health = {
      server: {
        status: 'online',
        uptime: Math.floor(serverUptime),
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          percentage: Math.round(memUsage.heapUsed / memUsage.heapTotal * 100)
        },
        cpu: {
          usage: Math.round(cpuUsage * 100) / 100,
          cores: cpuInfo.length
        },
        nodeVersion: process.version
      },
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
        collections,
        totalDocuments
      },
      cache: {
        status: 'active',
        type: 'in-memory',
        ...defaultCache.stats()
      },
      timestamp: new Date().toISOString()
    };

    res.json(health);
  } catch (error) {
    logger.error('System health error:', error.message);
    res.status(500).json({ message: 'Failed to get system health' });
  }
};
