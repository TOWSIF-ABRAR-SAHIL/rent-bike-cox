const express = require('express');
const mongoose = require('mongoose');
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

module.exports = router;
