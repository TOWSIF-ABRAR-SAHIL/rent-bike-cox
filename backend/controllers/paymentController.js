const SSLCommerzPayment = require('sslcommerz-lts');
const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const User = require('../models/User');
const mongoose = require('mongoose');

const store_id = process.env.SSLCOMMERZ_STORE_ID;
const store_passwd = process.env.SSLCOMMERZ_STORE_PASS;
const is_live = process.env.SSLCOMMERZ_IS_LIVE === 'true';

exports.initPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await Booking.findById(bookingId).populate('user').populate('bike');
        
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        const tran_id = new mongoose.Types.ObjectId().toString();
        const amount = booking.totalPrice * 0.5; // Rules: 50% advance

        const data = {
            total_amount: amount,
            currency: 'BDT',
            tran_id: tran_id,
            success_url: `http://localhost:5000/api/payment/success/${bookingId}/${tran_id}`,
            fail_url: `http://localhost:5000/api/payment/fail`,
            cancel_url: `http://localhost:5000/api/payment/cancel`,
            ipn_url: `http://localhost:5000/api/payment/ipn`,
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
        const { bookingId, tranId } = req.params;
        const booking = await Booking.findById(bookingId);
        
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        booking.status = 'Confirmed';
        booking.paymentStatus = 'Partial'; // 50% advance
        booking.advancePaid = booking.totalPrice * 0.5;
        
        await booking.save();
        
        // Update bike availability
        await Bike.findByIdAndUpdate(booking.bike, { availability: false });

        // Redirect to frontend invoice page
        res.redirect(`http://localhost:5173/invoice/${bookingId}`);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.paymentFail = async (req, res) => {
    res.redirect('http://localhost:5173/payment-failed');
};

exports.paymentCancel = async (req, res) => {
    res.redirect('http://localhost:5173/payment-cancelled');
};
