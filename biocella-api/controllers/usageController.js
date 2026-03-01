const Usage = require("../models/usageModel");

// CREATE
exports.create = async (req, res) => {
  try {
    console.log('Usage log request received:', req.body);
    const id = await Usage.createUsageLog(req.body);
    console.log('Usage log created with ID:', id);
    res.status(201).json({ message: "Usage log created", log_id: id });
  } catch (err) {
    console.error('Error creating usage log:', err);
    res.status(500).json({ error: err.message });
  }
};

// READ ALL
exports.getAll = async (req, res) => {
  try {
    const logs = await Usage.getAllUsageLogs();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ ONE
exports.getById = async (req, res) => {
  try {
    const log = await Usage.getUsageLogById(req.params.id);
    if (!log) return res.status(404).json({ message: "Usage log not found" });
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
exports.update = async (req, res) => {
  try {
    const affected = await Usage.updateUsageLog(req.params.id, req.body);
    if (!affected) return res.status(404).json({ message: "Usage log not found" });
    res.json({ message: "Usage log updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
exports.remove = async (req, res) => {
  try {
    const affected = await Usage.deleteUsageLog(req.params.id);
    if (!affected) return res.status(404).json({ message: "Usage log not found" });
    res.json({ message: "Usage log deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
