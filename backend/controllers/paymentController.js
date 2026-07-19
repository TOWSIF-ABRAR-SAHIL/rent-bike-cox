const SSLCommerzPayment = require('sslcommerz-lts');
const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const mongoose = require('mongoose');

const store_id = process.env.SSLCOMMERZ_STORE_ID;
const store_passwd = process.env.SSLCOMMERZ_STORE_PASS || process.env.SSLCOMMERZ_STORE_PASSWORD;
const is_live = process.env.SSLCOMMERZ_IS_LIVE === 'true';
const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

exports.initPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await Booking.findById(bookingId).populate('user').populate('bike');

        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        const tran_id = new mongoose.Types.ObjectId().toString();

        const hours = Math.ceil((new Date(booking.endTime) - new Date(booking.startTime)) / (1000 * 60 * 60));
        const isShortRental = hours <= 24;
        const advancePercent = isShortRental ? 0.5 : 0.3;
        const amount = booking.totalPrice * advancePercent;

        const data = {
            total_amount: amount,
            currency: 'BDT',
            tran_id: tran_id,
            success_url: `${backendUrl}/api/payment/success/${bookingId}/${tran_id}`,
            fail_url: `${backendUrl}/api/payment/fail`,
            cancel_url: `${backendUrl}/api/payment/cancel`,
            ipn_url: `${backendUrl}/api/payment/ipn`,
            shipping_method: 'No',
            product_name: booking.bike.model,
            product_category: 'Rental',
            product_profile: 'general',
            cus_name: booking.user.name,
            cus_email: booking.user.email,
            cus_add1: booking.user.address || 'Cox\'s Bazar',
            cus_city: 'Cox\'s Bazar',
            cus_postcode: '4700',
            cus_country: 'Bangladesh',
            cus_phone: booking.user.phoneNumber,
            cus_fax: booking.user.phoneNumber,
            ship_name: booking.user.name,
            ship_add1: booking.user.address || 'Cox\'s Bazar',
            ship_city: 'Cox\'s Bazar',
            ship_state: 'Cox\'s Bazar',
            ship_postcode: '4700',
            ship_country: 'Bangladesh',
        };

        const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
        sslcz.init(data).then(apiResponse => {
            let GatewayPageURL = apiResponse.GatewayPageURL;
            res.send({ url: GatewayPageURL });
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.paymentSuccess = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findById(bookingId);

        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        const hours = Math.ceil((new Date(booking.endTime) - new Date(booking.startTime)) / (1000 * 60 * 60));
        const isShortRental = hours <= 24;
        const advancePercent = isShortRental ? 0.5 : 0.3;

        booking.status = 'Confirmed';
        booking.paymentStatus = 'Partial';
        booking.advancePaid = booking.totalPrice * advancePercent;

        await booking.save();

        await Bike.findByIdAndUpdate(booking.bike, { availability: false });

        res.redirect(`${frontendUrl}/invoice/${bookingId}`);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.paymentFail = async (req, res) => {
    res.redirect(`${frontendUrl}/payment-failed`);
};

exports.paymentCancel = async (req, res) => {
    res.redirect(`${frontendUrl}/payment-cancelled`);
};
