const Batch = require("../models/batchModel");

// CREATE
exports.create = async (req, res) => {
  try {
    const id = await Batch.createBatch(req.body);
    res.status(201).json({ message: "Batch created", batch_id: id });
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
