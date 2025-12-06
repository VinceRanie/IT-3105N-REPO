const Reagent = require("../models/reagentModel");

// CREATE
exports.create = async (req, res) => {
  try {
    const id = await Reagent.createReagent(req.body);
    res.status(201).json({ message: "Chemical created", chemical_id: id });
  } catch (err) {
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
    const affected = await Reagent.deleteReagent(req.params.id);
    console.log('Delete operation affected rows:', affected);
    if (!affected) return res.status(404).json({ message: "Chemical not found" });
    res.json({ message: "Chemical deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
