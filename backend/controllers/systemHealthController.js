const mongoose = require('mongoose');
const os = require('os');
const { getSharedCache, sharedBackendName } = require('../utils/redisCache');
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

    // Field names match what the System Health tab reads *and* what the public
    // /api/health/info reports (heapUsed/heapTotal/rss in bytes), instead of the
    // rounded megabyte `{used, total}` pair that made the tab show "Heap Used 0 B"
    // for every value plus "Cores 0" and "Environment Unknown".
    const health = {
      server: {
        status: 'online',
        uptime: Math.floor(serverUptime),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      },
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        percentage: Math.round(memUsage.heapUsed / memUsage.heapTotal * 100)
      },
      cpu: {
        model: (cpuInfo[0]?.model || '').trim() || 'Unknown',
        cores: cpuInfo.length,
        usage: Math.round(cpuUsage * 100) / 100
      },
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
        collections,
        totalDocuments
      },
      cache: {
        status: 'active',
        type: sharedBackendName(),
        ...await (await getSharedCache()).stats()
      },
      timestamp: new Date().toISOString()
    };

    res.json(health);
  } catch (error) {
    logger.error('System health error:', error.message);
    res.status(500).json({ message: 'Failed to get system health' });
  }
};
