const { Readable } = require('stream');
const { HttpError } = require('../utils/httpError');
const { validateFile } = require('../security/utils/fileMagicBytes');
const logger = require('../utils/logger');

/**
 * Content validation for uploads, at the point where the bytes exist.
 *
 * Two ways this used to be wrong:
 *
 *  1. The check lived in multer's `fileFilter`, which runs **before** the file body is
 *     read — `file.buffer` is always undefined there, so the check never executed and
 *     declaring `image/png` was enough to get arbitrary content through.
 *  2. Moving it to the storage only worked for `memoryStorage`, which hands back a
 *     buffer. Production uses `CloudinaryStorage`, which pipes `file.stream` straight to
 *     the CDN and never returns a buffer, so the bytes were validated nowhere.
 *
 * This wraps the storage instead, for every storage: read the first few bytes of the
 * incoming stream, decide, and only then hand the storage a stream that replays those
 * bytes followed by the rest. A rejected upload is stopped before the storage is called
 * at all — nothing is written and nothing is uploaded, so there is no orphaned asset to
 * clean up afterwards.
 */

// MAGIC_BYTES signatures are at most 4 bytes; 8 is enough for every one of them (the
// PNG signature itself is 8).
const HEAD_BYTES = 8;

/** First `count` bytes of a readable, plus a readable replaying them ahead of the rest. */
async function takeHead(stream, count = HEAD_BYTES) {
  const iterator = stream[Symbol.asyncIterator]();
  const chunks = [];
  let size = 0;

  while (size < count) {
    const { value, done } = await iterator.next();
    if (done) break;
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    chunks.push(chunk);
    size += chunk.length;
  }

  // Exactly `count` bytes: a chunk from the socket is up to a full highWaterMark, and
  // holding that in memory to read eight bytes of it would be pointless.
  const buffered = Buffer.concat(chunks);
  const head = buffered.subarray(0, count);
  const leftover = buffered.subarray(count);

  async function* replay() {
    // The head is inspected, not consumed: the storage must still receive every byte the
    // client sent, in order.
    if (head.length) yield head;
    if (leftover.length) yield leftover;
    for (;;) {
      const { value, done } = await iterator.next();
      if (done) return;
      yield Buffer.isBuffer(value) ? value : Buffer.from(value);
    }
  }

  // objectMode: false — the consumer is a byte stream (pipe to Cloudinary, or concat for
  // memoryStorage) and must see the same chunks it would have without the guard.
  return { head, stream: Readable.from(replay(), { objectMode: false }) };
}

/**
 * Whether we can hand the storage a different stream than the one multer put on the file.
 *
 * multer defines `file.stream` with `Object.defineProperty(file, 'stream', { configurable:
 * true, value: fileStream })` — writable is absent, so `file.stream = other` is silently
 * ignored. Assuming it worked left the storage reading the stream we had just drained the
 * head out of: the upload lost its first bytes, and multer waited forever for a storage
 * callback that never came, so a request over the size limit hung instead of answering 400.
 */
function canReplaceStream(file) {
  const descriptor = Object.getOwnPropertyDescriptor(file, 'stream');
  if (!descriptor) return true;
  return descriptor.writable === true || descriptor.configurable === true;
}

function replaceStream(file, next) {
  const descriptor = Object.getOwnPropertyDescriptor(file, 'stream') || {};
  Object.defineProperty(file, 'stream', {
    configurable: true,
    enumerable: descriptor.enumerable === true,
    writable: true,
    value: next,
  });
}

/**
 * Wraps a multer storage so no file reaches it without its content being checked.
 * Exported for tests, which drive it with a stub storage.
 */
function guardStorage(storage) {
  const handleFile = storage._handleFile.bind(storage);

  // Lets a test prove a multer instance was built with a guarded storage: the Cloudinary
  // path cannot otherwise be exercised without really uploading something.
  Object.defineProperty(storage, 'contentGuarded', { value: true, configurable: true });

  storage._handleFile = (req, file, cb) => {
    (async () => {
      if (file && file.stream && typeof file.stream[Symbol.asyncIterator] === 'function') {
        // Checked before a single byte is read: if the stream cannot be replaced, reading
        // the head would consume bytes the storage is about to be handed, and the content
        // would go to the CDN unchecked. A security control fails closed — an unvalidated
        // upload is refused rather than allowed with a warning nobody reads. A plain Error,
        // not HttpError, so the caller gets a generic 500 with a correlationId instead of
        // this server-side detail. Unreachable with multer (which defines the property
        // `configurable`), but it is the branch that decides whether the guard can be
        // bypassed, so it must not fail open.
        if (!canReplaceStream(file)) {
          logger.error('Upload stream cannot be replaced — refusing unvalidated upload', {
            originalname: file.originalname,
            mimetype: file.mimetype,
          });
          throw new Error('Upload content could not be validated');
        }

        const { head, stream } = await takeHead(file.stream);
        const result = validateFile(head, file.originalname);
        if (!result.valid) throw new HttpError(400, result.reason);
        replaceStream(file, stream);
      }

      return new Promise((resolve, reject) => {
        handleFile(req, file, (err, info) => {
          if (err) return reject(err);
          // memoryStorage returns the assembled buffer; re-checking it guards against the
          // head being the only bytes that were ever inspected.
          const buffer = info && info.buffer;
          if (buffer && buffer.length) {
            const result = validateFile(buffer, file.originalname);
            if (!result.valid) return reject(new HttpError(400, result.reason));
          }
          resolve(info);
        });
      });
    })().then(
      info => cb(null, info),
      err => cb(err),
    );
  };

  return storage;
}

module.exports = { guardStorage, takeHead, canReplaceStream, replaceStream, HEAD_BYTES };
