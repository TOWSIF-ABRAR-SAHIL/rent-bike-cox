const EventEmitter = require('events');
const logger = require('../utils/logger');

const MAX_HISTORY = 100;

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
    this._history = [];
  }

  emit(event, data) {
    this._history.push({ event, data, timestamp: new Date().toISOString() });
    if (this._history.length > MAX_HISTORY) {
      this._history.shift();
    }
    logger.info(`event.${event}`, { eventData: data });
    return super.emit(event, data);
  }

  getHistory() {
    return [...this._history];
  }

  getHistoryFor(event) {
    return this._history.filter(h => h.event === event);
  }

  clearHistory() {
    this._history = [];
  }
}

const bus = new EventBus();

module.exports = bus;
module.exports.EventBus = EventBus;
