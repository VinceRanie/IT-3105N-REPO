const db = require("../config/mysql.js");

// CREATE
exports.createReagent = async (data) => {
  const { name, quantity, unit, threshold } = data;
  const [result] = await db.execute(
    "INSERT INTO reagents_chemicals (name, quantity, unit, threshold, last_updated) VALUES (?, ?, ?, ?, NOW())",
    [name, quantity, unit, threshold]
  );
  return result.insertId;
};

// READ ALL
exports.getAllReagents = async () => {
  const [rows] = await db.execute("SELECT * FROM reagents_chemicals");
  return rows;
};

// READ ONE
exports.getReagentById = async (id) => {
  const [rows] = await db.execute("SELECT * FROM reagents_chemicals WHERE chemical_id = ?", [id]);
  return rows[0];
};

// UPDATE
exports.updateReagent = async (id, data) => {
  const { name, quantity, unit, threshold } = data;
  const [result] = await db.execute(
    "UPDATE reagents_chemicals SET name=?, quantity=?, unit=?, threshold=?, last_updated=NOW() WHERE chemical_id=?",
    [name, quantity, unit, threshold, id]
  );
  return result.affectedRows;
};

// DELETE
exports.deleteReagent = async (id) => {
  const [result] = await db.execute("DELETE FROM reagents_chemicals WHERE chemical_id = ?", [id]);
  return result.affectedRows;
};
