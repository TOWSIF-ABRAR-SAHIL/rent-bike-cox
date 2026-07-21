const SSLCommerzPayment = require('sslcommerz-lts');
const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const mongoose = require('mongoose');
const { generateInvoiceNumber } = require('../utils/invoiceNumber');

const store_id = process.env.SSLCOMMERZ_STORE_ID;
const store_passwd = process.env.SSLCOMMERZ_STORE_PASS || process.env.SSLCOMMERZ_STORE_PASSWORD;
const is_live = process.env.SSLCOMMERZ_IS_LIVE === 'true';
const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

exports.initPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;
        if (!bookingId) return res.status(400).json({ message: 'Booking ID is required' });

        const booking = await Booking.findById(bookingId).populate('user').populate('bike');

        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        if (booking.user._id.toString() !== req.user.id && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized to pay for this booking' });
        }

        if (booking.status === 'Confirmed' || booking.status === 'Completed') {
            return res.status(400).json({ message: 'Booking is already paid for' });
        }

        if (!store_id || !store_passwd) {
            return res.status(500).json({ message: 'Payment gateway not configured' });
        }

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
            cus_phone: booking.user.phoneNumber || '01700000000',
            cus_fax: booking.user.phoneNumber || '01700000000',
            ship_name: booking.user.name,
            ship_add1: booking.user.address || 'Cox\'s Bazar',
            ship_city: 'Cox\'s Bazar',
            ship_state: 'Cox\'s Bazar',
            ship_postcode: '4700',
            ship_country: 'Bangladesh',
        };

        console.log('[SSLCommerz] Initializing payment:', { store_id, is_live, amount, tran_id });

        const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
        sslcz.init(data).then(apiResponse => {
            console.log('[SSLCommerz] Response:', JSON.stringify(apiResponse, null, 2));

            if (apiResponse.GatewayPageURL) {
                res.json({ url: apiResponse.GatewayPageURL });
            } else if (apiResponse.no_session_key || apiResponse.status === 'FAILED') {
                console.error('[SSLCommerz] Payment init failed:', apiResponse);
                res.status(400).json({ message: 'Payment gateway rejected the request' });
            } else {
                const redirectUrl = apiResponse.GatewayPageURL || apiResponse.redirectGatewayURL;
                if (redirectUrl) {
                    res.json({ url: redirectUrl });
                } else {
                    console.error('[SSLCommerz] No gateway URL in response');
                    res.status(400).json({ message: 'Payment gateway did not return a URL' });
                }
            }
        }).catch(err => {
            console.error('[SSLCommerz] init() error:', err.message || err);
            res.status(500).json({ message: 'Payment initialization failed' });
        });
    } catch (error) {
        console.error('[Payment] initPayment error:', error.message);
        res.status(500).json({ message: 'Payment initialization failed' });
    }
};

exports.paymentSuccess = async (req, res) => {
    try {
        const { bookingId, tranId } = req.params;
        console.log('[SSLCommerz] Success callback hit:', { bookingId, tranId, method: req.method, body: req.body });

        if (!bookingId || !tranId) {
            console.error('[SSLCommerz] Missing bookingId or tranId');
            return res.redirect(`${frontendUrl}/payment-failed`);
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            console.error('[SSLCommerz] Booking not found:', bookingId);
            return res.redirect(`${frontendUrl}/payment-failed`);
        }

        const hours = Math.ceil((new Date(booking.endTime) - new Date(booking.startTime)) / (1000 * 60 * 60));
        const isShortRental = hours <= 24;
        const advancePercent = isShortRental ? 0.5 : 0.3;

        booking.status = 'Confirmed';
        booking.paymentStatus = 'Partial';
        booking.advancePaid = booking.totalPrice * advancePercent;
        booking.tranId = tranId;
        booking.paymentMethod = 'SSLCommerz';

        if (!booking.invoiceNumber) {
            booking.invoiceNumber = await generateInvoiceNumber();
        }

        await booking.save();
        await Bike.findByIdAndUpdate(booking.bike, { availability: false });

        console.log('[SSLCommerz] Payment confirmed for booking:', bookingId);
        return res.redirect(`${frontendUrl}/invoice/${bookingId}`);
    } catch (error) {
        console.error('[Payment] success error:', error.message, error.stack);
        try {
            return res.redirect(`${frontendUrl}/payment-failed`);
        } catch (redirectError) {
            console.error('[Payment] redirect error:', redirectError.message);
            return res.status(500).json({ message: 'Payment processing failed' });
        }
    }
};

exports.paymentFail = async (req, res) => {
    res.redirect(`${frontendUrl}/payment-failed`);
};

exports.paymentCancel = async (req, res) => {
    res.redirect(`${frontendUrl}/payment-cancelled`);
};

exports.paymentIPN = async (req, res) => {
    try {
        const { val_id } = req.body;
        console.log('[SSLCommerz] IPN received:', req.body);
        res.json({ status: 'OK' });
    } catch (error) {
        console.error('[Payment] IPN error:', error.message);
        res.status(500).json({ message: 'IPN processing failed' });
    }
};
