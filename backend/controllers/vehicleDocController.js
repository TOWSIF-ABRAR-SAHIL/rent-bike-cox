const VehicleDocument = require('../models/VehicleDocument');
const Bike = require('../models/Bike');
const logger = require('../utils/logger');
const { clientMessage } = require('../utils/httpError');

exports.listByBike = async (req, res) => {
  try {
    const { bikeId } = req.params;
    // Documents carry scan URLs and registration numbers, so they are limited to
    // the vehicle's owner (or an admin). Every sibling handler here already checked
    // ownership; this one did not, so any Renter could read any vehicle's papers.
    const bike = await Bike.findById(bikeId).select('renter').lean();
    if (!bike) return res.status(404).json({ message: 'Bike not found' });
    if (bike.renter && bike.renter.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized to view this vehicle\u2019s documents' });
    }

    const docs = await VehicleDocument.find({ bike: bikeId }).sort({ type: 1, createdAt: -1 }).lean();
    res.json(docs);
  } catch (err) {
    logger.error('listByBike (vehicle documents) error', { bikeId: req.params.bikeId, error: err.message });
    res.status(500).json({ message: 'Failed to load vehicle documents' });
  }
};

exports.listMyDocs = async (req, res) => {
  try {
    const docs = await VehicleDocument.find({ renter: req.user.id })
      .populate('bike', 'model brand')
      .sort({ expiryDate: 1 })
      .lean();
    res.json(docs);
  } catch (err) {
    logger.error('listMyDocs error', { userId: req.user.id, error: err.message });
    res.status(500).json({ message: 'Failed to load your documents' });
  }
};

exports.upload = async (req, res) => {
  try {
    const { bikeId } = req.params;
    const bike = await Bike.findById(bikeId).lean();
    if (!bike) return res.status(404).json({ message: 'Bike not found' });
    if (bike.renter && bike.renter.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    let fileUrl = req.file?.path || req.file?.url;
    if (!fileUrl && req.body.fileUrl) {
      try {
        const parsed = new URL(req.body.fileUrl);
        if (parsed.protocol !== 'https:' || !parsed.hostname.includes('cloudinary')) {
          return res.status(400).json({ message: 'Invalid file URL' });
        }
        fileUrl = req.body.fileUrl;
      } catch {
        return res.status(400).json({ message: 'Invalid file URL' });
      }
    }
    if (!fileUrl) return res.status(400).json({ message: 'File is required' });

    const doc = new VehicleDocument({
      bike: bikeId,
      renter: req.user.id,
      type: req.body.type,
      name: req.body.name,
      fileUrl,
      fileName: req.file?.originalname,
      issueDate: req.body.issueDate,
      expiryDate: req.body.expiryDate,
      issuingAuthority: req.body.issuingAuthority,
      documentNumber: req.body.documentNumber,
      notes: req.body.notes,
    });

    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    logger.error('upload vehicle document error', { bikeId: req.params.bikeId, error: err.message });
    res.status(400).json({ message: clientMessage(err, 'Could not save the document') });
  }
};

exports.update = async (req, res) => {
  try {
    const doc = await VehicleDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.renter && doc.renter.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { type, name, issueDate, expiryDate, issuingAuthority, documentNumber, notes } = req.body;
    const allowed = { type, name, issueDate, expiryDate, issuingAuthority, documentNumber, notes };
    Object.assign(doc, allowed);
    await doc.save();
    res.json(doc);
  } catch (err) {
    logger.error('update vehicle document error', { documentId: req.params.id, error: err.message });
    res.status(400).json({ message: clientMessage(err, 'Could not update the document') });
  }
};

exports.verify = async (req, res) => {
  try {
    const doc = await VehicleDocument.findByIdAndUpdate(
      req.params.id,
      { verified: true, verifiedBy: req.user.id, verifiedAt: new Date() },
      { new: true },
    );
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    res.json(doc);
  } catch (err) {
    logger.error('verify vehicle document error', { documentId: req.params.id, error: err.message });
    res.status(500).json({ message: 'Failed to verify the document' });
  }
};

exports.remove = async (req, res) => {
  try {
    const doc = await VehicleDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.renter && doc.renter.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await doc.deleteOne();
    res.json({ message: 'Document deleted' });
  } catch (err) {
    logger.error('remove vehicle document error', { documentId: req.params.id, error: err.message });
    res.status(500).json({ message: 'Failed to delete the document' });
  }
};

exports.expiring = async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, parseInt(req.query.days) || 30));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    // A Renter sees only their own fleet. This returned every expiring document on
    // the platform — including document numbers and scan URLs for other operators'
    // vehicles — to any authenticated Renter.
    const filter = { expiryDate: { $lte: cutoff, $gte: new Date() } };
    if (req.user.role !== 'Admin') filter.renter = req.user.id;

    const docs = await VehicleDocument.find(filter)
      .populate('bike', 'model brand')
      .populate('renter', 'name')
      .sort({ expiryDate: 1 })
      .lean();

    res.json(docs);
  } catch (err) {
    logger.error('expiring vehicle documents error', { userId: req.user.id, error: err.message });
    res.status(500).json({ message: 'Failed to load expiring documents' });
  }
};
