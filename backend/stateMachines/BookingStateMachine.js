const { BookingState, BookingTransition } = require('../domain/enums');
const bus = require('../events/EventBus');
const logger = require('../utils/logger');

const ENABLED = process.env.STATE_MACHINE_ENABLED !== 'false';

class BookingStateMachine {
  static get transitions() { return BookingTransition; }
  static get states() { return BookingState; }
  static get enabled() { return ENABLED; }

  static canTransition(from, to) {
    const allowed = BookingTransition[from];
    if (!allowed) return false;
    return allowed.includes(to);
  }

  static async transition(booking, toState, { actor, reason, session } = {}) {
    if (!ENABLED) {
      logger.debug('State machine disabled — skipping transition check', { bookingId: booking._id?.toString(), toState });
      return booking;
    }

    const currentState = booking.state || this._inferState(booking.status);

    if (!this.canTransition(currentState, toState)) {
      const err = new Error(`Invalid booking transition: ${currentState} → ${toState}`);
      err.code = 'INVALID_TRANSITION';
      err.from = currentState;
      err.to = toState;
      throw err;
    }

    const prevState = currentState;
    const update = {
      state: toState,
      $push: {
        stateHistory: {
          from: prevState,
          to: toState,
          at: new Date(),
          actor: actor || undefined,
          reason: reason || undefined,
        },
      },
    };

    if (toState === BookingState.CANCELLED) {
      update.$set = { status: 'Cancelled', cancellationAt: new Date() };
      if (reason) update.$set.cancellationReason = reason;
    } else if (toState === BookingState.CONFIRMED) {
      update.$set = { status: 'Confirmed' };
    } else if (toState === BookingState.COMPLETED) {
      update.$set = { status: 'Completed' };
    } else if (toState === BookingState.EXPIRED) {
      update.$set = { status: 'Expired' };
    } else if (toState === BookingState.ACTIVE) {
      update.$set = { pickupConfirmedAt: new Date() };
    }

    const opts = {};
    if (session) opts.session = session;

    const Booking = require('../models/Booking');
    const updated = await Booking.findByIdAndUpdate(booking._id, update, { new: true, ...opts });

    bus.emit('booking.stateChanged', {
      bookingId: booking._id?.toString(),
      from: prevState,
      to: toState,
      actor: actor?.toString(),
      reason,
    });

    logger.info('Booking state transition', {
      bookingId: booking._id?.toString(),
      from: prevState,
      to: toState,
      actor: actor?.toString(),
    });

    return updated;
  }

  static _inferState(status) {
    const map = {
      'Pending': BookingState.PAYMENT_PENDING,
      'Confirmed': BookingState.CONFIRMED,
      'Completed': BookingState.COMPLETED,
      'Cancelled': BookingState.CANCELLED,
      'Expired': BookingState.EXPIRED,
    };
    return map[status] || BookingState.DRAFT;
  }

  static inferStateForExisting(booking) {
    return this._inferState(booking.status);
  }
}

module.exports = BookingStateMachine;
