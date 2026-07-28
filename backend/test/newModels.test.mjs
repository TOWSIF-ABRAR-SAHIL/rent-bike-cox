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

  it('validates category enum', async () => {
    try {
      const doc = new NotificationTemplate({ key: 'test.ch', name: 'T', category: 'invalid' });
      await doc.validate();
      expect.fail('Should throw');
    } catch (err) {
      expect(err.errors.category).toBeDefined();
    }
  });

  it('defaults isActive to true', () => {
    const doc = new NotificationTemplate({ key: 'test.a', name: 'T' });
    expect(doc.isActive).toBe(true);
  });

  it('supports template variables as objects', () => {
    const doc = new NotificationTemplate({
      key: 'test.v',
      name: 'T',
      variables: [{ name: 'userName', description: 'User name' }]
    });
    expect(doc.variables[0].name).toBe('userName');
    expect(doc.variables[0].description).toBe('User name');
  });

  it('has channels sub-document with defaults', () => {
    const doc = new NotificationTemplate({ key: 'test.ch', name: 'T' });
    expect(doc.channels).toBeDefined();
    expect(doc.channels.email).toBeDefined();
    expect(doc.channels.inApp).toBeDefined();
    expect(doc.channels.sms).toBeDefined();
    expect(doc.channels.push).toBeDefined();
    expect(doc.channels.email.isActive).toBe(true);
    expect(doc.channels.sms.body).toBe('');
    expect(doc.channels.sms.isActive).toBe(true);
    expect(doc.channels.push.body).toBe('');
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

  it('defaults analytics counters to 0', () => {
    const doc = new Announcement({ title: 'T', message: 'M' });
    expect(doc.analytics.impressions).toBe(0);
    expect(doc.analytics.clicks).toBe(0);
    expect(doc.analytics.dismissals).toBe(0);
  });

  it('has style and actions sub-documents', () => {
    const doc = new Announcement({ title: 'T', message: 'M' });
    expect(doc.style).toBeDefined();
    expect(doc.style.bgColor).toBe('#f59e0b');
    expect(doc.actions).toBeDefined();
    expect(doc.actions.ctaNewTab).toBe(false);
  });

  it('has schedule sub-document', () => {
    const doc = new Announcement({ title: 'T', message: 'M' });
    expect(doc.schedule).toBeDefined();
    expect(doc.schedule.frequency).toBe('always');
    expect(doc.schedule.showOnce).toBe(false);
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

  it('supports tags and isPinned', () => {
    const doc = new FAQ({ question: 'Q?', answer: 'A', category: 'Test', tags: ['test'], isPinned: true });
    expect(doc.tags).toContain('test');
    expect(doc.isPinned).toBe(true);
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

  it('defaults status to new and priority to medium', () => {
    const doc = new ContactMessage({ name: 'N', email: 'e@e.com', subject: 'S', message: 'M' });
    expect(doc.status).toBe('new');
    expect(doc.priority).toBe('medium');
  });

  it('supports conversation array', () => {
    const doc = new ContactMessage({
      name: 'N', email: 'e@e.com', subject: 'S', message: 'M',
      conversation: [{ sender: 'customer', message: 'Hello' }]
    });
    expect(doc.conversation.length).toBe(1);
    expect(doc.conversation[0].sender).toBe('customer');
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

  it('has progress sub-document and batch settings', () => {
    const doc = new EmailCampaign({ name: 'N', subject: 'S', body: 'B', createdBy: '000000000000000000000001' });
    expect(doc.progress).toBeDefined();
    expect(doc.batchSize).toBe(50);
    expect(doc.batchDelay).toBe(5000);
  });

  it('has scheduling sub-document with timezone', () => {
    const doc = new EmailCampaign({ name: 'N', subject: 'S', body: 'B', createdBy: '000000000000000000000001' });
    expect(doc.scheduling).toBeDefined();
    expect(doc.scheduling.timezone).toBe('Asia/Dhaka');
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
