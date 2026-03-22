const Batch = require("../models/batchModel");
const QRCode = require("qrcode");

// CREATE
exports.create = async (req, res) => {
  try {
    console.log('Batch create request received:', req.body);
    
    // First create the batch to get the ID
    const tempData = {
      ...req.body,
      qr_code: null
    };
    const batchId = await Batch.createBatch(tempData);
    console.log('Batch created with ID:', batchId);
    
    // Generate QR code with URL to the batch edit page
    const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/AdminUI/AdminDashBoard/Features/AdminInventory/batch/${batchId}`;
    const qrCodeDataURL = await QRCode.toDataURL(qrUrl);
    
    // Update the batch with the QR code
    await Batch.updateBatch(batchId, {
      ...req.body,
      qr_code: qrCodeDataURL
    });
    console.log('QR code added to batch:', batchId);
    
    res.status(201).json({ 
      message: "Batch created", 
      batch_id: batchId,
      qr_code: qrCodeDataURL
    });
  } catch (err) {
    console.error('Error creating batch:', err);
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
    console.log('Batch update request received:', { id: req.params.id, data: req.body });
    
    const affected = await Batch.updateBatch(req.params.id, req.body);
    
    console.log('Batch update result - affected rows:', affected);
    
    if (!affected) {
      console.warn('No batch found with ID:', req.params.id);
      return res.status(404).json({ message: "Batch not found" });
    }
    
    console.log('Batch updated successfully - ID:', req.params.id);
    res.json({ message: "Batch updated" });
  } catch (err) {
    console.error('Error updating batch:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: err.message, details: err.sqlMessage || 'No SQL details' });
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
