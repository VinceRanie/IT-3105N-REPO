const Reagent = require("../models/reagentModel");
const Batch = require("../models/batchModel");
const QRCode = require("qrcode");
const db = require("../config/mysql");

// CREATE
exports.create = async (req, res) => {
  try {
    const { name, type, quantity, unit, threshold, expiration_date, location } = req.body;
    const lot_number = typeof req.body.lot_number === "string" ? req.body.lot_number.trim() : "";
    
    console.log('Creating chemical with data:', { name, type, quantity, unit, threshold, expiration_date, location, lot_number });

    if (!lot_number) {
      return res.status(400).json({ error: "lot_number is required when creating a container" });
    }
    
    // Create the chemical entry (master record)
    const chemicalId = await Reagent.createReagent({
      name,
      type,
      quantity,
      unit,
      threshold
    });
    
    console.log('Chemical created with ID:', chemicalId);
    
    // Create the batch entry (physical container)
    const batchData = {
      chemical_id: chemicalId,
      quantity,
      expiration_date: expiration_date || null,
      location: location || null,
      lot_number,
      qr_code: null
    };
    
    console.log('Creating batch with data:', batchData);
    
    const batchId = await Batch.createBatch(batchData);
    
    console.log('Batch created with ID:', batchId);
    
    // Generate QR code with URL to the batch edit page
    const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/AdminUI/AdminDashBoard/Features/AdminInventory/batch/${batchId}`;
    const qrCodeDataURL = await QRCode.toDataURL(qrUrl);
    
    console.log('QR code generated');
    
    // Update the batch with the QR code (don't change other fields)
    await db.execute(
      "UPDATE chemical_stock_batch SET qr_code=? WHERE batch_id=?",
      [qrCodeDataURL, batchId]
    );
    
    console.log('Batch updated with QR code');
    
    res.status(201).json({ 
      message: "Chemical and batch created", 
      chemical_id: chemicalId,
      batch_id: batchId,
      qr_code: qrCodeDataURL
    });
  } catch (err) {
    console.error('Error creating chemical:', err);
    res.status(500).json({ error: err.message });
  }
};

// READ ALL
exports.getAll = async (req, res) => {
  try {
    const chemicals = await Reagent.getAllReagents();
    res.json(chemicals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ ONE
exports.getById = async (req, res) => {
  try {
    const chemical = await Reagent.getReagentById(req.params.id);
    if (!chemical) return res.status(404).json({ message: "Chemical not found" });
    res.json(chemical);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
exports.update = async (req, res) => {
  try {
    const affected = await Reagent.updateReagent(req.params.id, req.body);
    if (!affected) return res.status(404).json({ message: "Chemical not found" });
    res.json({ message: "Chemical updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
exports.remove = async (req, res) => {
  try {
    console.log('Attempting to delete chemical with ID:', req.params.id);
    
    const db = require('../config/mysql');
    
    // CORRECT ORDER: Delete child records first, then parent
    // 1. Delete usage logs (references batch_id)
    await db.execute('DELETE FROM chemical_usage_log WHERE chemical_id = ?', [req.params.id]);
    console.log('Deleted associated usage logs');
    
    // 2. Delete batches (references chemical_id)
    await db.execute('DELETE FROM chemical_stock_batch WHERE chemical_id = ?', [req.params.id]);
    console.log('Deleted associated batches');
    
    // 3. Now delete the chemical (parent record)
    const affected = await Reagent.deleteReagent(req.params.id);
    console.log('Delete operation affected rows:', affected);
    if (!affected) return res.status(404).json({ message: "Chemical not found" });
    res.json({ message: "Chemical and associated records deleted" });
  } catch (err) {
    console.error('Error deleting chemical:', err);
    res.status(500).json({ error: err.message });
  }
};
