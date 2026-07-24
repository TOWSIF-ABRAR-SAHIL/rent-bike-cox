const https = require('https');
const http = require('http');

const store_passwd = process.env.SSLCOMMERZ_STORE_PASS || process.env.SSLCOMMERZ_STORE_PASSWORD;
const is_live = process.env.SSLCOMMERZ_IS_LIVE === 'true';

const VALIDATION_URL = is_live
  ? 'https://secure.sslcommerz.com/validator/api/validationserver.php'
  : 'https://sandbox.sslcommerz.com/validator/api/validationserver.php';

/**
 * Verify an SSLCommerz IPN by calling their validation API.
 * Returns verified payment data or throws.
 */
function verifyIPN(valId) {
  return new Promise((resolve, reject) => {
    if (!valId) {
      return reject(new Error('Missing val_id for IPN verification'));
    }
    if (!store_passwd) {
      return reject(new Error('SSLCOMMERZ store password not configured'));
    }

    const url = new URL(VALIDATION_URL);
    url.searchParams.set('val_id', valId);
    url.searchParams.set('store_id', process.env.SSLCOMMERZ_STORE_ID);
    url.searchParams.set('store_passwd', store_passwd);

    const transport = url.protocol === 'https:' ? https : http;

    const req = transport.get(url.toString(), { timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.status === 'VALID' || data.status === 'VALIDATED') {
            resolve(data);
          } else {
            reject(new Error(`IPN verification failed: status=${data.status}, reason=${data.reason || 'unknown'}`));
          }
        } catch (err) {
          reject(new Error(`IPN verification failed: invalid JSON response — ${body.substring(0, 200)}`));
        }
      });
    });

    req.on('error', (err) => reject(new Error(`IPN verification network error: ${err.message}`)));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('IPN verification timed out (10s)'));
    });
  });
}

module.exports = { verifyIPN };
