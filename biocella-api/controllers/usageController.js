const Usage = require("../models/usageModel");
const db = require("../config/mysql");

// CREATE
exports.create = async (req, res) => {
  try {
    console.log('Usage log request received:', req.body);
    
    const { chemical_id, user_id, amount_used, purpose, batch_id } = req.body;
    
    // Validate required fields
    if (!chemical_id || !user_id || !amount_used || !purpose || !batch_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: chemical_id, user_id, amount_used, purpose, batch_id' 
      });
    }
    
    // Validate that the user exists before creating usage log
    const [userRows] = await db.execute('SELECT user_id FROM user WHERE user_id = ?', [user_id]);
    if (userRows.length === 0) {
      return res.status(404).json({ 
        error: `User with ID ${user_id} not found in the system`,
        details: 'Foreign key constraint: user_id must exist in user table'
      });
    }
    
    // Validate that the chemical exists
    const [chemicalRows] = await db.execute('SELECT chemical_id FROM reagents_chemicals WHERE chemical_id = ?', [chemical_id]);
    if (chemicalRows.length === 0) {
      return res.status(404).json({ 
        error: `Chemical with ID ${chemical_id} not found` 
      });
    }
    
    // Validate that the batch exists and belongs to the same chemical.
    const [batchRows] = await db.execute(
      'SELECT batch_id, chemical_id FROM chemical_stock_batch WHERE batch_id = ?',
      [batch_id]
    );
    if (batchRows.length === 0) {
      return res.status(404).json({ 
        error: `Batch with ID ${batch_id} not found` 
      });
    }

    if (Number(batchRows[0].chemical_id) !== Number(chemical_id)) {
      return res.status(400).json({
        error: `Batch ${batch_id} does not belong to chemical ${chemical_id}`,
      });
    }
    
    const id = await Usage.createUsageLog(req.body);
    console.log('Usage log created with ID:', id);
    res.status(201).json({ message: "Usage log created", log_id: id });
  } catch (err) {
    console.error('Error creating usage log:', err);
    
    // Handle foreign key constraint errors
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ 
        error: 'Foreign key constraint error - one of the referenced IDs (user_id, chemical_id, batch_id) does not exist',
        details: err.sqlMessage
      });
    }
    
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
