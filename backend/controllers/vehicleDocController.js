const VehicleDocument = require('../models/VehicleDocument');
const Bike = require('../models/Bike');

exports.listByBike = async (req, res) => {
  try {
    const { bikeId } = req.params;
    const docs = await VehicleDocument.find({ bike: bikeId }).sort({ type: 1, createdAt: -1 }).lean();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    res.status(500).json({ message: err.message });
  }
};

exports.upload = async (req, res) => {
  try {
    const { bikeId } = req.params;
    const bike = await Bike.findById(bikeId).lean();
    if (!bike) return res.status(404).json({ message: 'Bike not found' });
    if (bike.renter.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const fileUrl = req.file?.path || req.file?.url || req.body.fileUrl;
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
    res.status(400).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const doc = await VehicleDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.renter.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    Object.assign(doc, req.body);
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(400).json({ message: err.message });
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
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const doc = await VehicleDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.renter.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await doc.deleteOne();
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.expiring = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const docs = await VehicleDocument.find({
      expiryDate: { $lte: cutoff, $gte: new Date() },
    }).populate('bike', 'model brand').populate('renter', 'name').lean();

    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
