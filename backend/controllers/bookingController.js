const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const Settings = require('../models/Settings');
const User = require('../models/User');
const { generateInvoiceNumber } = require('../utils/invoiceNumber');

exports.createBooking = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.isVerified) {
      return res.status(403).json({ message: 'Account not verified. Please upload your NID and license for admin verification.' });
    }

    const { bikeId, startTime, endTime, couponCode, packageIndex, destination } = req.body;
    const bike = await Bike.findById(bikeId);
    if (!bike) return res.status(404).json({ message: 'Bike not found' });
    if (!bike.availability) return res.status(409).json({ message: 'Bike is not available for booking' });

    let totalPrice;
    let hours;
    let isShortRental;
    let packageName;

    if (packageIndex !== undefined && packageIndex !== null) {
      const settings = await Settings.findOne();
      if (!settings || !settings.packages[packageIndex]) {
        return res.status(400).json({ message: 'Invalid package selected' });
      }
      const selectedPackage = settings.packages[packageIndex];
      totalPrice = selectedPackage.price;
      packageName = selectedPackage.name;
      const start = new Date(startTime);
      const end = new Date(endTime);
      hours = Math.ceil((end - start) / (1000 * 60 * 60));
      isShortRental = hours <= 24;
    } else {
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (end <= start) return res.status(400).json({ message: 'End time must be after start time' });

      hours = Math.ceil((end - start) / (1000 * 60 * 60));
      if (hours < 1) return res.status(400).json({ message: 'Minimum rental duration is 1 hour' });
      
      totalPrice = hours * bike.pricePerHour;
      isShortRental = hours <= 24;
    }
    
    if (couponCode) {
      const Coupon = require('../models/Coupon');
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon && (!coupon.expiresAt || coupon.expiresAt > new Date()) && (coupon.maxUses === 0 || coupon.usedCount < coupon.maxUses)) {
        totalPrice *= (1 - coupon.discountPercent / 100);
        coupon.usedCount += 1;
        await coupon.save();
      }
    }

    const minAdvance = isShortRental ? totalPrice * 0.5 : totalPrice * 0.3;

    const booking = new Booking({
      user: req.user.id,
      bike: bikeId,
      startTime,
      endTime,
      totalPrice,
      advancePaid: 0,
      destination: destination || '',
      securityDeposit: 2000,
      status: 'Pending',
      packageName: packageName || 'Hourly',
      advancePercent: isShortRental ? 50 : 30,
      termsAccepted: true
    });

    await booking.save();
    res.status(201).json({ booking, minAdvance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const { bookingId, amountPaid } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.advancePaid = amountPaid;
    booking.paymentStatus = amountPaid >= booking.totalPrice ? 'Paid' : 'Partial';
    booking.status = 'Confirmed';
    
    // Generate invoice number if not already set
    if (!booking.invoiceNumber) {
      booking.invoiceNumber = await generateInvoiceNumber();
    }
    
    await booking.save();
    
    await Bike.findByIdAndUpdate(booking.bike, { availability: false });

    res.json({ message: 'Payment confirmed', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBookingDetails = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('user', 'name email nid license phoneNumber address')
            .populate('bike', 'model brand pricePerHour');
        res.json(booking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        if (booking.user.toString() !== req.user.id && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized to cancel this booking' });
        }

        if (booking.status === 'Cancelled') {
            return res.status(400).json({ message: 'Booking is already cancelled' });
        }

        if (booking.status === 'Completed') {
            return res.status(400).json({ message: 'Cannot cancel a completed booking' });
        }

        booking.status = 'Cancelled';
        await booking.save();

        await Bike.findByIdAndUpdate(booking.bike, { availability: true });

        res.json({ message: 'Booking cancelled successfully', booking });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- New Endpoints ---

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('bike', 'model brand pricePerHour images category')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRenterBookings = async (req, res) => {
  try {
    const renterBikes = await Bike.find({ renter: req.user.id }).select('_id');
    const bikeIds = renterBikes.map(b => b._id);
    const bookings = await Booking.find({ bike: { $in: bikeIds } })
      .populate('user', 'name email phoneNumber')
      .populate('bike', 'model brand pricePerHour')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const bookings = await Booking.find()
      .populate('user', 'name email phoneNumber')
      .populate('bike', 'model brand pricePerHour')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (req.user.role !== 'Admin' && req.user.role !== 'Renter') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (booking.status !== 'Confirmed') {
      return res.status(400).json({ message: 'Only confirmed bookings can be completed' });
    }

    booking.status = 'Completed';
    await booking.save();

    await Bike.findByIdAndUpdate(booking.bike, { availability: true });

    res.json({ message: 'Booking completed', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
