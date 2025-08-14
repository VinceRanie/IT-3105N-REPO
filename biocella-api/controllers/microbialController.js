const MicrobialInfo = require('../models/MicrobialInfo');

// CREATE
exports.createMicrobial = async (req, res) => {
  try {
    const microbial = new MicrobialInfo(req.body);
    await microbial.save();
    res.status(201).json(microbial);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create microbial info' });
  }
};

// READ ALL
exports.getMicrobials = async (req, res) => {
  try {
    const microbials = await MicrobialInfo.find();
    res.json(microbials);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch microbial info' });
  }
};

// READ ONE
exports.getMicrobialById = async (req, res) => {
  try {
    const microbial = await MicrobialInfo.findById(req.params.id);
    if (!microbial) return res.status(404).json({ error: 'Not found' });
    res.json(microbial);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch microbial info' });
  }
};

// UPDATE
exports.updateMicrobial = async (req, res) => {
  try {
    const updated = await MicrobialInfo.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
};

// DELETE
exports.deleteMicrobial = async (req, res) => {
  try {
    const deleted = await MicrobialInfo.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
};
