const Reagent = require("../models/reagentModel");
const Batch = require("../models/batchModel");
const QRCode = require("qrcode");
const db = require("../config/mysql");

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return NaN;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

// CREATE
exports.create = async (req, res) => {
  try {
    const { name, type, quantity, unit, threshold, expiration_date, location } = req.body;
    const lot_number = typeof req.body.lot_number === "string" ? req.body.lot_number.trim() : "";
    const parsedQuantity = Number(quantity);
    const parsedThreshold = Number(threshold);
    
    console.log('Creating chemical with data:', { name, type, quantity, unit, threshold, expiration_date, location, lot_number });

    if (!lot_number) {
      return res.status(400).json({ error: "lot_number is required when creating a container" });
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ error: "quantity must be greater than 0" });
    }

    if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0) {
      return res.status(400).json({ error: "threshold must be 0 or greater" });
    }

    if (parsedThreshold >= parsedQuantity) {
      return res.status(400).json({ error: "threshold must be less than quantity" });
    }
    
    // Create the chemical entry (master record)
    const chemicalId = await Reagent.createReagent({
      name,
      type,
      quantity: parsedQuantity,
      unit,
      threshold: parsedThreshold
    });
    
    console.log('Chemical created with ID:', chemicalId);
    
    // Create the batch entry (physical container)
    const batchData = {
      chemical_id: chemicalId,
      quantity: parsedQuantity,
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
    const parsedQuantity = toNumber(req.body.quantity);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      return res.status(400).json({ error: "quantity must be 0 or greater" });
    }

    const affected = await Reagent.updateReagent(req.params.id, {
      ...req.body,
      quantity: parsedQuantity,
    });
    if (!affected) return res.status(404).json({ message: "Chemical not found" });

    // Keep batch-backed inventory totals consistent with edited master quantity.
    const batches = await Batch.getAllBatches({ chemical_id: req.params.id });

    if (batches.length) {
      const getRemaining = (batch) => {
        const qty = toNumber(batch.quantity);
        const used = toNumber(batch.used_quantity);
        return Math.max(0, qty - used);
      };

      const currentRemaining = batches.reduce((sum, batch) => sum + getRemaining(batch), 0);
      let delta = parsedQuantity - currentRemaining;

      if (Math.abs(delta) > 0.000001) {
        if (delta > 0) {
          const latestBatch = batches[0];
          const qty = toNumber(latestBatch.quantity);
          const used = toNumber(latestBatch.used_quantity);

          await Batch.updateBatch(latestBatch.batch_id, {
            quantity: qty + delta,
            used_quantity: used,
            expiration_date: latestBatch.expiration_date || null,
            location: latestBatch.location || null,
            lot_number: latestBatch.lot_number || null,
          });
        } else {
          let toReduce = Math.abs(delta);

          for (const batch of batches) {
            if (toReduce <= 0) break;

            const qty = toNumber(batch.quantity);
            const used = toNumber(batch.used_quantity);
            const available = Math.max(0, qty - used);
            const reduction = Math.min(available, toReduce);

            if (reduction <= 0) continue;

            await Batch.updateBatch(batch.batch_id, {
              quantity: qty - reduction,
              used_quantity: used,
              expiration_date: batch.expiration_date || null,
              location: batch.location || null,
              lot_number: batch.lot_number || null,
            });

            toReduce -= reduction;
          }
        }
      }
    }

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
