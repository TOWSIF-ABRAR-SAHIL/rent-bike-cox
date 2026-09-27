import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A job module that exports startX and is never referenced from server.js does
// nothing at all, forever, and no unit test notices — that is exactly how the
// payout job came to have zero callers while the renter-payout feature looked
// implemented. These tests read server.js as text and check the wiring.
const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(here, '..');
const jobsDir = path.join(backendRoot, 'jobs');
const serverSource = fs.readFileSync(path.join(backendRoot, 'server.js'), 'utf8');

function exportedNames(source) {
  const match = source.match(/module\.exports\s*=\s*\{([\s\S]*?)\}/);
  if (!match) return [];
  return match[1]
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => entry.split(':')[0].trim());
}

const jobs = fs
  .readdirSync(jobsDir)
  .filter(file => file.endsWith('.js') && file !== 'logger.js')
  .map(file => ({ file, names: exportedNames(fs.readFileSync(path.join(jobsDir, file), 'utf8')) }))
  .filter(job => job.names.length > 0);

describe('background job wiring', () => {
  it('finds job modules that export a start function', () => {
    // Guards the test itself: if the export style changes, this fails loudly
    // instead of silently passing over zero jobs.
    const starters = jobs.filter(job => job.names.some(name => name.startsWith('start')));
    expect(starters.length).toBeGreaterThanOrEqual(8);
  });

  it('starts every exported job from server.js', () => {
    const unwired = [];
    for (const job of jobs) {
      for (const name of job.names.filter(n => n.startsWith('start'))) {
        if (!serverSource.includes(name)) unwired.push(`${job.file}: ${name}`);
      }
    }
    expect(unwired, `exported but never started:\n${unwired.join('\n')}`).toEqual([]);
  });

  it('stops every job that it starts and that exposes a stop function', () => {
    const missing = [];
    for (const job of jobs) {
      const start = job.names.find(n => n.startsWith('start'));
      const stop = job.names.find(n => n.startsWith('stop'));
      if (start && stop && serverSource.includes(start) && !serverSource.includes(stop)) {
        missing.push(`${job.file}: ${start} is started but ${stop} is never called`);
      }
    }
    expect(missing, `started without a shutdown:\n${missing.join('\n')}`).toEqual([]);
  });

  it('gives the shutdown hook something to run', () => {
    expect(serverSource).toMatch(/gracefulShutdown\(server, mongoose, \{\s*onShutdown/);
  });
});

describe('rate limiter mounts', () => {
  // A limiter mounted with app.use('/api/x', …) also counts every GET under that
  // prefix. Mounted on '/api/dashboard/bikes' it silently capped the public
  // storefront reads (bikes/available, bikes/:id) at ten an hour with the message
  // "Too many file uploads"; on '/api/vehicle-docs' it capped the document lists.
  it('never mounts the upload limiter on a path prefix', () => {
    expect(serverSource).not.toMatch(/app\.use\([^\n]*uploadLimiter/);
  });

  it('still counts real uploads', () => {
    const mounts = [...serverSource.matchAll(/app\.(post|put|patch)\([^\n]*uploadLimiter\)/g)];
    expect(mounts.length).toBe(3);
  });

  it('does not rate-limit the type-ahead suggestions as a search', () => {
    const searchBlock = serverSource.slice(serverSource.indexOf('const searchLimiter'));
    const skip = searchBlock.slice(0, searchBlock.indexOf('});') + 3);
    expect(skip).toMatch(/skip:/);
  });
});
