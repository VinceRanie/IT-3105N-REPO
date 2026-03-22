const db = require("../config/mysql.js");

// CREATE
exports.createUsageLog = async (data) => {
  const { chemical_id, user_id, amount_used, purpose, batch_id } = data;
  console.log('Usage model createUsageLog called with:', { chemical_id, user_id, amount_used, purpose, batch_id });
  
  try {
    const [result] = await db.execute(
      "INSERT INTO chemical_usage_log (chemical_id, user_id, date_used, amount_used, purpose, batch_id) VALUES (?, ?, NOW(), ?, ?, ?)",
      [chemical_id, user_id, amount_used, purpose, batch_id]
    );
    console.log('Usage log created with ID:', result.insertId);
    return result.insertId;
  } catch (err) {
    console.error('Usage model insert SQL error:', err.message, err.code, err.sqlState);
    throw err;
  }
};

// READ ALL
exports.getAllUsageLogs = async () => {
  const [rows] = await db.execute(`
    SELECT l.*, r.name AS chemical_name
    FROM chemical_usage_log l
    JOIN reagents_chemicals r ON l.chemical_id = r.chemical_id
  `);
  return rows;
};

// READ ONE
exports.getUsageLogById = async (id) => {
  const [rows] = await db.execute("SELECT * FROM chemical_usage_log WHERE log_id = ?", [id]);
  return rows[0];
};

// UPDATE
exports.updateUsageLog = async (id, data) => {
  const { chemical_id, user_id, amount_used, purpose, batch_id } = data;
  const [result] = await db.execute(
    "UPDATE chemical_usage_log SET chemical_id=?, user_id=?, amount_used=?, purpose=?, batch_id=? WHERE log_id=?",
    [chemical_id, user_id, amount_used, purpose, batch_id, id]
  );
  return result.affectedRows;
};

// DELETE
exports.deleteUsageLog = async (id) => {
  const [result] = await db.execute("DELETE FROM chemical_usage_log WHERE log_id = ?", [id]);
  return result.affectedRows;
};
