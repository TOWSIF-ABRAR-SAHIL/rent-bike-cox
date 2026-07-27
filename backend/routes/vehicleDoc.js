const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const authorize = require('../security/middleware/authorize');
const ctrl = require('../controllers/vehicleDocController');
const upload = require('../middleware/uploadMiddleware');

router.get('/vehicle-docs/expiring', auth, authorize('Renter', 'Admin'), ctrl.expiring);
router.get('/vehicle-docs/my', auth, authorize('Renter', 'Admin'), ctrl.listMyDocs);
router.get('/vehicle-docs/bike/:bikeId', auth, authorize('Renter', 'Admin'), ctrl.listByBike);
router.post('/vehicle-docs/bike/:bikeId', auth, authorize('Renter', 'Admin'), upload.single('file'), ctrl.upload);
router.put('/vehicle-docs/:id', auth, authorize('Renter', 'Admin'), ctrl.update);
router.patch('/vehicle-docs/:id/verify', auth, authorize('Admin'), ctrl.verify);
router.delete('/vehicle-docs/:id', auth, authorize('Renter', 'Admin'), ctrl.remove);

module.exports = router;
