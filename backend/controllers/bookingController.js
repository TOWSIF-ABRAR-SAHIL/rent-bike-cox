const Booking = require('../models/Booking');
const Bike = require('../models/Bike');

exports.createBooking = async (req, res) => {
  try {
    const { bikeId, startTime, endTime, couponCode } = req.body;
    const bike = await Bike.findById(bikeId);
    if (!bike) return res.status(404).json({ message: 'Bike not found' });

    const start = new Date(startTime);
    const end = new Date(endTime);
    const hours = Math.ceil((end - start) / (1000 * 60 * 60));
    
    let totalPrice = hours * bike.pricePerHour;
    
    // Simple coupon logic
    if (couponCode === 'WELCOME10') {
      totalPrice *= 0.9;
    }

    // 50% Advance Rule for short rentals (<= 24 hours)
    const isShortRental = hours <= 24;
    const minAdvance = isShortRental ? totalPrice * 0.5 : totalPrice * 0.3; // Example: 30% for long term

    const booking = new Booking({
      user: req.user.id,
      bike: bikeId,
      startTime,
      endTime,
      totalPrice,
      advancePaid: 0, // Will be updated after payment
      status: 'Pending'
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
    
    await booking.save();
    
    // Update bike availability
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
