import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const NotificationTemplate = require('../models/NotificationTemplate');
const Announcement = require('../models/Announcement');
const FAQ = require('../models/FAQ');
const ContactMessage = require('../models/ContactMessage');
const EmailCampaign = require('../models/EmailCampaign');
const AdminNotification = require('../models/AdminNotification');

describe('NotificationTemplate model', () => {
  it('validates required fields', async () => {
    try {
      const doc = new NotificationTemplate({});
      await doc.validate();
      expect.fail('Should throw');
    } catch (err) {
      expect(err.errors.key).toBeDefined();
    }
  });

  it('validates channel enum', async () => {
    try {
      const doc = new NotificationTemplate({ key: 'test.ch', title: 'T', body: 'B', channel: 'invalid' });
      await doc.validate();
      expect.fail('Should throw');
    } catch (err) {
      expect(err.errors.channel).toBeDefined();
    }
  });

  it('defaults isActive to true', () => {
    const doc = new NotificationTemplate({ key: 'test.a', title: 'T', body: 'B' });
    expect(doc.isActive).toBe(true);
  });

  it('supports template variables', () => {
    const doc = new NotificationTemplate({ key: 'test.v', title: 'T', body: 'Hi {{name}}', variables: ['name'] });
    expect(doc.variables).toContain('name');
  });
});

describe('Announcement model', () => {
  it('validates required fields', async () => {
    try {
      const doc = new Announcement({});
      await doc.validate();
      expect.fail('Should throw');
    } catch (err) {
      expect(err.errors.title).toBeDefined();
      expect(err.errors.message).toBeDefined();
    }
  });

  it('validates type enum', async () => {
    try {
      const doc = new Announcement({ title: 'T', message: 'M', type: 'invalid' });
      await doc.validate();
      expect.fail('Should throw');
    } catch (err) {
      expect(err.errors.type).toBeDefined();
    }
  });

  it('defaults viewCount and clickCount to 0', () => {
    const doc = new Announcement({ title: 'T', message: 'M' });
    expect(doc.viewCount).toBe(0);
    expect(doc.clickCount).toBe(0);
  });
});

describe('FAQ model', () => {
  it('validates required fields', async () => {
    try {
      const doc = new FAQ({});
      await doc.validate();
      expect.fail('Should throw');
    } catch (err) {
      expect(err.errors.question).toBeDefined();
      expect(err.errors.answer).toBeDefined();
      expect(err.errors.category).toBeDefined();
    }
  });

  it('defaults helpful counts to 0', () => {
    const doc = new FAQ({ question: 'Q?', answer: 'A', category: 'Test' });
    expect(doc.helpfulCount).toBe(0);
    expect(doc.notHelpfulCount).toBe(0);
  });
});

describe('ContactMessage model', () => {
  it('validates required fields', async () => {
    try {
      const doc = new ContactMessage({});
      await doc.validate();
      expect.fail('Should throw');
    } catch (err) {
      expect(err.errors.name).toBeDefined();
      expect(err.errors.email).toBeDefined();
      expect(err.errors.message).toBeDefined();
    }
  });

  it('validates category enum', async () => {
    try {
      const doc = new ContactMessage({ name: 'N', email: 'e@e.com', message: 'M', category: 'invalid' });
      await doc.validate();
      expect.fail('Should throw');
    } catch (err) {
      expect(err.errors.category).toBeDefined();
    }
  });

  it('defaults status to new', () => {
    const doc = new ContactMessage({ name: 'N', email: 'e@e.com', subject: 'S', message: 'M' });
    expect(doc.status).toBe('new');
  });
});

describe('EmailCampaign model', () => {
  it('validates required fields', async () => {
    try {
      const doc = new EmailCampaign({});
      await doc.validate();
      expect.fail('Should throw');
    } catch (err) {
      expect(err.errors.name).toBeDefined();
      expect(err.errors.subject).toBeDefined();
      expect(err.errors.body).toBeDefined();
    }
  });

  it('validates status enum', async () => {
    try {
      const doc = new EmailCampaign({ name: 'N', subject: 'S', body: 'B', status: 'invalid' });
      await doc.validate();
      expect.fail('Should throw');
    } catch (err) {
      expect(err.errors.status).toBeDefined();
    }
  });

  it('defaults to draft status', () => {
    const doc = new EmailCampaign({ name: 'N', subject: 'S', body: 'B', createdBy: '000000000000000000000001' });
    expect(doc.status).toBe('draft');
  });
});

describe('AdminNotification model', () => {
  it('validates required fields', async () => {
    try {
      const doc = new AdminNotification({});
      await doc.validate();
      expect.fail('Should throw');
    } catch (err) {
      expect(err.errors.type).toBeDefined();
      expect(err.errors.title).toBeDefined();
      expect(err.errors.message).toBeDefined();
    }
  });

  it('validates severity enum', async () => {
    try {
      const doc = new AdminNotification({ type: 'system', title: 'T', message: 'M', severity: 'invalid' });
      await doc.validate();
      expect.fail('Should throw');
    } catch (err) {
      expect(err.errors.severity).toBeDefined();
    }
  });

  it('defaults isRead to false', () => {
    const doc = new AdminNotification({ type: 'system', title: 'T', message: 'M' });
    expect(doc.isRead).toBe(false);
  });
});
