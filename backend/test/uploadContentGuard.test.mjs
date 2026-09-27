/**
 * Content validation for uploads, on every storage.
 *
 * The check used to live in multer's `fileFilter`, which runs before the file body is
 * read — `file.buffer` is always undefined there, so it never ran and declaring
 * `image/png` was enough to store arbitrary content. Moving it to the storage only
 * covered `memoryStorage` (which returns a buffer); production uses `CloudinaryStorage`,
 * which pipes `file.stream` to the CDN and returns none.
 *
 * `middleware/fileContentGuard.js` reads the head of the stream instead, so the check
 * runs before the storage is called at all. These tests drive it with stub storages and
 * with multer's real memoryStorage, because the Cloudinary path cannot be exercised
 * without uploading for real — the stream it receives is the same object either way.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Readable, PassThrough } from 'node:stream';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { guardStorage, takeHead, canReplaceStream, replaceStream, HEAD_BYTES } = require('../middleware/fileContentGuard');
const { isClientFacing } = require('../utils/httpError');
const uploadMiddleware = require('../middleware/uploadMiddleware');
const errorHandler = require('../middleware/errorHandler');

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PHP = Buffer.from('<?php system($_GET["c"]); ?>');

/**
 * A storage that records each file it is handed and collects the stream, like a real one.
 * `_removeFile` is part of the contract: multer calls it when it aborts a request (the size
 * limit), and a storage without it throws from multer's own abort path.
 */
function recordingStorage() {
  const files = [];
  const storage = {
    _handleFile(req, file, cb) {
      files.push(file);
      const parts = [];
      file.stream.on('data', chunk => parts.push(Buffer.from(chunk)));
      file.stream.on('end', () => {
        const buffer = Buffer.concat(parts);
        cb(null, { buffer, size: buffer.length, path: 'https://cdn.example/upload.png' });
      });
      file.stream.on('error', cb);
    },
    _removeFile(_req, _file, cb) {
      cb(null);
    },
  };
  return { storage, files };
}

function run(storage, { chunks, stream, originalname = 'photo.png', mimetype = 'image/png' }) {
  const file = { stream: stream || Readable.from(chunks), originalname, mimetype, fieldname: 'file' };
  return new Promise(resolve => {
    guardStorage(storage)._handleFile({}, file, (err, info) => resolve({ err: err || null, info }));
  });
}

describe('uploaded bytes are checked before the storage sees them', () => {
  it('rejects non-image content declared as PNG and never calls the storage', async () => {
    const { storage, files } = recordingStorage();
    const { err } = await run(storage, { chunks: [PHP] });

    expect(err).toBeTruthy();
    expect(err.status).toBe(400);
    expect(isClientFacing(err)).toBe(true);
    expect(err.message).toBe('Unable to determine file type from content');
    // Nothing was written and nothing was uploaded, so there is no orphaned asset to clean up.
    expect(files).toHaveLength(0);
  });

  it('rejects a blocked extension even when the bytes are a valid image', async () => {
    const { storage, files } = recordingStorage();
    const { err } = await run(storage, { chunks: [PNG], originalname: 'payload.php' });

    expect(err.status).toBe(400);
    expect(err.message).toBe('File extension ".php" is not allowed');
    expect(files).toHaveLength(0);
  });

  it('rejects a file too short to identify', async () => {
    const { storage, files } = recordingStorage();
    const { err } = await run(storage, { chunks: [Buffer.from('ab')] });

    expect(err.status).toBe(400);
    expect(err.message).toBe('Unable to determine file type from content');
    expect(files).toHaveLength(0);
  });

  it('hands a genuine image to the storage byte for byte', async () => {
    const payload = Buffer.concat([JPEG, Buffer.from('rest of the file'.repeat(50))]);
    const { storage, files } = recordingStorage();
    const { err, info } = await run(storage, { chunks: [payload], originalname: 'photo.jpg' });

    expect(err).toBeNull();
    expect(files).toHaveLength(1);
    // The head that was inspected is replayed ahead of the rest, so the storage still
    // receives exactly what the client sent.
    expect(Buffer.compare(info.buffer, payload)).toBe(0);
  });

  it('keeps byte order when chunks are smaller than the inspected head', async () => {
    const payload = Buffer.concat([PNG, Buffer.from('x'.repeat(300))]);
    const chunks = [];
    for (let i = 0; i < payload.length; i += 3) chunks.push(payload.subarray(i, i + 3));

    const { storage } = recordingStorage();
    const { err, info } = await run(storage, { chunks });

    expect(err).toBeNull();
    expect(Buffer.compare(info.buffer, payload)).toBe(0);
  });

  it('streams a large file without buffering it in the head', async () => {
    const payload = Buffer.alloc(1024 * 1024, 7);
    JPEG.copy(payload);

    const { head, stream } = await takeHead(Readable.from([payload]));
    expect(head.length).toBe(HEAD_BYTES);

    const parts = [];
    for await (const chunk of stream) parts.push(chunk);
    expect(Buffer.compare(Buffer.concat(parts), payload)).toBe(0);
  });

  it('surfaces an abort that arrives before the head is complete', async () => {
    const stream = new Readable({ read() {} });
    stream.push(Buffer.from([0x89, 0x50]));
    setImmediate(() => stream.destroy(new Error('client aborted mid-upload')));

    const { storage, files } = recordingStorage();
    const { err } = await run(storage, { stream });

    expect(err.message).toBe('client aborted mid-upload');
    // Aborted before the head was readable: the storage is never called, so no partial
    // asset is created in the first place.
    expect(files).toHaveLength(0);
  });

  it('surfaces an abort that arrives after the head was accepted', async () => {
    const stream = new Readable({ read() {} });
    stream.push(PNG);
    setImmediate(() => stream.destroy(new Error('client aborted mid-upload')));

    const { storage } = recordingStorage();
    const { err } = await run(storage, { stream });

    // The bytes were a valid image, so the storage was handed the stream and the abort
    // surfaces from there — the same place it would without the guard.
    expect(err.message).toBe('client aborted mid-upload');
  });

  it('works with multer\u2019s real memoryStorage, both ways', async () => {
    const memory = multer.memoryStorage();

    const rejected = await run(memory, { chunks: [PHP] });
    expect(rejected.err.status).toBe(400);

    const payload = Buffer.concat([PNG, Buffer.from('tail')]);
    const accepted = await run(memory, { chunks: [payload] });
    expect(accepted.err).toBeNull();
    expect(Buffer.compare(accepted.info.buffer, payload)).toBe(0);
  });
});

describe('replacing the stream multer put on the file', () => {
  it('rewrites the non-writable property multer defines', () => {
    // multer: Object.defineProperty(file, 'stream', { configurable: true, value: fileStream })
    // — no `writable`, so `file.stream = other` is silently ignored. That is how the first
    // version of this guard left the storage reading a stream it had already drained.
    const original = Readable.from([PNG]);
    const file = {};
    Object.defineProperty(file, 'stream', { configurable: true, enumerable: false, value: original });

    expect(canReplaceStream(file)).toBe(true);
    const replacement = Readable.from([JPEG]);
    replaceStream(file, replacement);
    expect(file.stream).toBe(replacement);
    expect(Object.getOwnPropertyDescriptor(file, 'stream').enumerable).toBe(false);
  });

  it('refuses to touch a stream it could not put back', () => {
    const file = {};
    Object.defineProperty(file, 'stream', { configurable: false, writable: false, value: Readable.from([PNG]) });
    // Reading the head is only safe because the stream can be replaced afterwards.
    expect(canReplaceStream(file)).toBe(false);
  });

  it('fails closed rather than uploading bytes it could not validate', async () => {
    // The bypass branch: if the stream cannot be replaced, the content would reach the
    // storage unchecked. A security control refuses instead of allowing it with a warning.
    const { storage, files } = recordingStorage();
    const file = { originalname: 'photo.png', mimetype: 'image/png', fieldname: 'file' };
    Object.defineProperty(file, 'stream', {
      configurable: false,
      writable: false,
      value: Readable.from([PNG]),
    });

    const { err } = await new Promise(resolve => {
      guardStorage(storage)._handleFile({}, file, (e, info) => resolve({ err: e || null, info }));
    });

    expect(err).toBeTruthy();
    // Not isClientFacing: the caller gets a generic 500, not a server-side detail.
    expect(isClientFacing(err)).toBe(false);
    expect(files).toHaveLength(0);
  });
});

describe('real multipart traffic through a guarded storage', () => {
  let server;
  let base;
  let received;

  beforeAll(async () => {
    received = [];
    const storage = guardStorage({
      _handleFile(req, file, cb) {
        const parts = [];
        file.stream.on('data', chunk => parts.push(Buffer.from(chunk)));
        file.stream.on('end', () => {
          const buffer = Buffer.concat(parts);
          received.push(buffer);
          cb(null, { buffer, size: buffer.length });
        });
        file.stream.on('error', cb);
      },
      _removeFile(_req, _file, cb) {
        cb(null);
      },
    });
    const app = express();
    app.post('/upload', multer({ storage, limits: { fileSize: 1024 * 1024 } }).single('file'), (req, res) => {
      res.json({ size: req.file.size });
    });
    app.use(errorHandler);
    server = await new Promise(resolve => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
  });

  async function post(payload, type = 'image/png', name = 'photo.png') {
    const form = new FormData();
    form.append('file', new Blob([payload], { type }), name);
    const res = await fetch(`${base}/upload`, { method: 'POST', body: form });
    return { status: res.status, body: await res.json() };
  }

  it('delivers every byte of a real upload to the storage', async () => {
    const payload = Buffer.concat([PNG, Buffer.from('b'.repeat(200000))]);
    const res = await post(payload);

    expect(res.status).toBe(200);
    expect(res.body.size).toBe(payload.length);
    expect(Buffer.compare(received[received.length - 1], payload)).toBe(0);
  });

  it('still answers 400 on the size limit, and does not stall', async () => {
    // Regression: with the stream replacement silently ignored, multer waited forever for a
    // storage callback that never came and this request hung instead of answering.
    const oversized = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]);
    const res = await post(oversized);

    expect(res.status).toBe(400);
    // The wording is errorHandler's constant for LIMIT_FILE_SIZE, not this fixture's limit.
    expect(res.body.message).toBe('File too large. Maximum size is 5MB.');
  }, 10000);

  it('rejects content over real multipart parsing too', async () => {
    const res = await post(Buffer.from('<?php system($_GET["c"]); ?>'));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Unable to determine file type from content');
  });
});

describe('the composition production runs (CloudinaryStorage inside the guard)', () => {
  /** The real storage class, with a fake CDN client so nothing leaves the process. */
  function cloudinaryStorageStub() {
    const sent = [];
    let calls = 0;
    const cloudinary = {
      uploader: {
        upload_stream: (options, cb) => {
          calls += 1;
          const sink = new PassThrough();
          sink.on('data', chunk => sent.push(Buffer.from(chunk)));
          sink.on('end', () => cb(null, {
            secure_url: 'https://res.cloudinary.com/demo/image/upload/probe.png',
            bytes: Buffer.concat(sent).length,
            public_id: options.public_id || 'probe',
          }));
          return sink;
        },
      },
    };
    return { storage: guardStorage(new CloudinaryStorage({ cloudinary, params: {} })), sent, calls: () => calls };
  }

  it('reaches the CDN with every byte of a valid image', async () => {
    const { storage, sent, calls } = cloudinaryStorageStub();
    const payload = Buffer.concat([PNG, Buffer.from('c'.repeat(100000))]);
    const { err, info } = await run(storage, { chunks: [payload] });

    expect(err).toBeNull();
    expect(calls()).toBe(1);
    expect(info.path).toBe('https://res.cloudinary.com/demo/image/upload/probe.png');
    // The head was inspected before the upload began; the CDN still receives all of it.
    expect(Buffer.compare(Buffer.concat(sent), payload)).toBe(0);
  });

  it('never opens an upload for content that is not an image', async () => {
    const { storage, calls } = cloudinaryStorageStub();
    const { err } = await run(storage, { chunks: [PHP] });

    expect(err.status).toBe(400);
    expect(err.message).toBe('Unable to determine file type from content');
    expect(calls()).toBe(0);
  });
});

describe('the exported upload middleware is built with a guarded storage', () => {
  it('guards both the image and document instances', () => {
    // A regression here means someone built a storage without the guard — which is
    // exactly how the Cloudinary path ended up unchecked in the first place.
    expect(uploadMiddleware.storage.contentGuarded).toBe(true);
    expect(uploadMiddleware.docUpload.storage.contentGuarded).toBe(true);
  });
});

describe('an upload rejected on content answers 400 over HTTP', () => {
  let server;
  let base;

  beforeAll(async () => {
    const app = express();
    app.post('/upload', uploadMiddleware.single('file'), (_req, res) => res.json({ ok: true }));
    app.use(errorHandler);
    server = await new Promise(resolve => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
  });

  it('rejects PHP declared as image/png before any upload happens', async () => {
    const form = new FormData();
    form.append('file', new Blob([PHP], { type: 'image/png' }), 'evil.png');

    const res = await fetch(`${base}/upload`, { method: 'POST', body: form });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toBe('Unable to determine file type from content');
    expect(JSON.stringify(body)).not.toContain('<?php');
  });
});
