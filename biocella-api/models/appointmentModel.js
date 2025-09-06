const db = require("../config/mysql.js");

// CREATE
exports.createAppointment = async (data) => {
  const { user_id, student_id, department, purpose, date, status, qr_code } = data;
  const [result] = await db.execute(
    "INSERT INTO appointment (user_id, student_id, department, purpose, date, status, qr_code) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [user_id, student_id, department, purpose, date, status, qr_code]
  );
  return result.insertId;
};

// READ ALL
exports.getAllAppointments = async () => {
  const [rows] = await db.execute("SELECT * FROM appointment");
  return rows;
};

// READ ONE
exports.getAppointmentById = async (id) => {
  const [rows] = await db.execute("SELECT * FROM appointment WHERE appointment_id = ?", [id]);
  return rows[0];
};

// UPDATE
exports.updateAppointment = async (id, data) => {
  const { user_id, student_id, department, purpose, date, status, qr_code } = data;
  const [result] = await db.execute(
    "UPDATE appointment SET user_id=?, student_id=?, department=?, purpose=?, date=?, status=?, qr_code=? WHERE appointment_id=?",
    [user_id, student_id, department, purpose, date, status, qr_code, id]
  );
  return result.affectedRows;
};

// DELETE
exports.deleteAppointment = async (id) => {
  const [result] = await db.execute("DELETE FROM appointment WHERE appointment_id = ?", [id]);
  return result.affectedRows;
};
