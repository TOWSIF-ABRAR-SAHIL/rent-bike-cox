const express = require('express');
const mongoose = require('mongoose');
const { defaultCache } = require('../utils/cache');
const router = express.Router();

router.get('/liveness', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

router.get('/readiness', async (req, res) => {
  const checks = { database: 'unknown', gateway: 'unknown' };

  try {
    await mongoose.connection.db.admin().ping();
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  try {
    const registry = require('../gateways/GatewayRegistry');
    checks.gateway = registry.has('sslcommerz') ? 'ok' : 'not_configured';
  } catch {
    checks.gateway = 'error';
  }

  const allOk = Object.values(checks).every(v => v === 'ok' || v === 'not_configured');
  res.status(allOk ? 200 : 503).json({ status: allOk ? 'ready' : 'degraded', checks, timestamp: new Date().toISOString() });
});

router.get('/info', (req, res) => {
  const cached = defaultCache.get('health:info');
  if (cached) return res.json(cached);

  const mem = process.memoryUsage();
  const data = {
    status: 'ok',
    uptime: process.uptime(),
    startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      external: Math.round(mem.external / 1024 / 1024),
    },
    pid: process.pid,
    nodeVersion: process.version,
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  };
  defaultCache.set('health:info', data, 10000);
  res.json(data);
});

module.exports = router;
