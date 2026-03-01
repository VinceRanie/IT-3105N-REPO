const Batch = require("../models/batchModel");
const QRCode = require("qrcode");

// CREATE
exports.create = async (req, res) => {
  try {
    // First create the batch to get the ID
    const tempData = {
      ...req.body,
      qr_code: null
    };
    const batchId = await Batch.createBatch(tempData);
    
    // Generate QR code with URL to the batch edit page
    const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/AdminUI/AdminDashBoard/Features/AdminInventory/batch/${batchId}`;
    const qrCodeDataURL = await QRCode.toDataURL(qrUrl);
    
    // Update the batch with the QR code
    await Batch.updateBatch(batchId, {
      ...req.body,
      qr_code: qrCodeDataURL
    });
    
    res.status(201).json({ 
      message: "Batch created", 
      batch_id: batchId,
      qr_code: qrCodeDataURL
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ ALL
exports.getAll = async (req, res) => {
  try {
    const batches = await Batch.getAllBatches();
    res.json(batches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ ONE
exports.getById = async (req, res) => {
  try {
    const batch = await Batch.getBatchById(req.params.id);
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    res.json(batch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
exports.update = async (req, res) => {
  try {
    const affected = await Batch.updateBatch(req.params.id, req.body);
    if (!affected) return res.status(404).json({ message: "Batch not found" });
    res.json({ message: "Batch updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
exports.remove = async (req, res) => {
  try {
    const affected = await Batch.deleteBatch(req.params.id);
    if (!affected) return res.status(404).json({ message: "Batch not found" });
    res.json({ message: "Batch deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
