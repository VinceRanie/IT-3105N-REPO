const db = require("../config/mysql.js");

// CREATE
exports.createBatch = async (data) => {
  const { chemical_id, quantity, expiration_date, location, qr_code } = data;
  const [result] = await db.execute(
    "INSERT INTO chemical_stock_batch (chemical_id, quantity, used_quantity, date_received, expiration_date, location, qr_code) VALUES (?, ?, 0, NOW(), ?, ?, ?)",
    [chemical_id, quantity, expiration_date || null, location || null, qr_code || null]
  );
  return result.insertId;
};

// READ ALL
exports.getAllBatches = async () => {
  const [rows] = await db.execute(`
    SELECT b.*, r.name AS chemical_name
    FROM chemical_stock_batch b
    JOIN reagents_chemicals r ON b.chemical_id = r.chemical_id
  `);
  return rows;
};

// READ ONE
exports.getBatchById = async (id) => {
  const [rows] = await db.execute(`
    SELECT b.*, r.name AS chemical_name
    FROM chemical_stock_batch b
    JOIN reagents_chemicals r ON b.chemical_id = r.chemical_id
    WHERE b.batch_id = ?
  `, [id]);
  return rows[0];
};

// UPDATE
exports.updateBatch = async (id, data) => {
  const { quantity, used_quantity, expiration_date, location } = data;
  const [result] = await db.execute(
    "UPDATE chemical_stock_batch SET quantity=?, used_quantity=?, expiration_date=?, location=? WHERE batch_id=?",
    [quantity, used_quantity, expiration_date, location || null, id]
  );
  return result.affectedRows;
};

// DELETE
exports.deleteBatch = async (id) => {
  const [result] = await db.execute("DELETE FROM chemical_stock_batch WHERE batch_id = ?", [id]);
  return result.affectedRows;
};
