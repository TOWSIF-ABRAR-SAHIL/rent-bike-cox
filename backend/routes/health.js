const express = require('express');
const mongoose = require('mongoose');
const { defaultCache } = require('../utils/cache');
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const router = express.Router();

// The two probes stay public — a load balancer or uptime monitor has to be able to call
// them — but they answer with the status of the process, not its internals. Reported
// fields used to include the process pid, NODE_ENV, node version, heap sizes and start
// time on endpoints that needed no session at all. `uptime` is gone from /liveness too:
// a monitor only needs the status code and a timestamp.
router.get('/liveness', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

// Process internals (pid, env, node version, heap detail, start time). The only consumer
// is the admin dashboard's Command Center, so this requires an Admin session; anything
// that just needs "is it up" uses /liveness or /readiness.
router.get('/info', auth, authorize('Admin'), (req, res) => {
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
