const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Rent Bike Cox\'s Bazar API',
      version: '1.0.0',
      description: 'REST API for bike, car, and jeep rental platform in Cox\'s Bazar, Bangladesh',
      contact: { name: 'Support', email: 'support@rentbikecox.com' },
    },
    servers: [
      { url: 'https://rent-bike-backend.onrender.com', description: 'Production' },
      { url: 'http://localhost:5000', description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['Admin', 'Renter', 'User'] },
          },
        },
        Bike: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            brand: { type: 'string' },
            model: { type: 'string' },
            category: { type: 'string' },
            renter: { type: 'string' },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            invoiceNumber: { type: 'string' },
            user: { type: 'string' },
            bike: { type: 'string' },
            status: { type: 'string', enum: ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'] },
            totalPrice: { type: 'number' },
            advancePaid: { type: 'number' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication & registration' },
      { name: 'Dashboard', description: 'Bikes, categories, settings' },
      { name: 'Booking', description: 'Booking management' },
      { name: 'Payment', description: 'SSLCommerz payment flow' },
      { name: 'Admin Refunds', description: 'Admin refund management' },
      { name: 'Notifications', description: 'In-app notifications' },
      { name: 'Push', description: 'Browser push notifications' },
      { name: 'Reviews', description: 'Bike reviews' },
      { name: 'Coupons', description: 'Admin coupon management' },
      { name: 'Policies', description: 'Platform policies' },
      { name: 'Financial', description: 'Admin financial overview' },
      { name: 'Fleet', description: 'Fleet management' },
      { name: 'Analytics', description: 'Admin analytics' },
      { name: 'Health', description: 'Health checks' },
    ],
  },
  apis: ['./routes/*.js', './server.js'],
};

module.exports = swaggerJsdoc(options);
