const db = require("../config/mysql.js");
const QRCode = require('qrcode');
const crypto = require('crypto');

// CREATE
exports.createAppointment = async (data) => {
  const { user_id, student_id, department, purpose, date } = data;
  const status = 'pending';
  const qr_code = null; // Will be generated upon approval
  
  const [result] = await db.execute(
    "INSERT INTO appointment (user_id, student_id, department, purpose, date, status, qr_code, pending_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
    [user_id, student_id, department, purpose, date, status, qr_code]
  );
  return result.insertId;
};

// READ ALL
exports.getAllAppointments = async () => {
  const [rows] = await db.execute("SELECT * FROM appointment ORDER BY date DESC");
  return rows;
};

// READ BY STATUS
exports.getAppointmentsByStatus = async (status) => {
  const [rows] = await db.execute("SELECT * FROM appointment WHERE status = ? ORDER BY date DESC", [status]);
  return rows;
};

// CHECK FOR SCHEDULE CONFLICTS
exports.checkScheduleConflict = async (date, excludeId = null) => {
  let query = "SELECT * FROM appointment WHERE date = ? AND status IN ('approved', 'ongoing')";
  const params = [date];
  
  if (excludeId) {
    query += " AND appointment_id != ?";
    params.push(excludeId);
  }
  
  const [rows] = await db.execute(query, params);
  return rows.length > 0;
};

// READ ONE By ID
exports.getAppointmentById = async (id) => {
  const [rows] = await db.execute("SELECT * FROM appointment WHERE appointment_id = ?", [id]);
  return rows[0];
};

// READ ONE WITH USER EMAIL
exports.getAppointmentWithUserEmail = async (id) => {
  const [rows] = await db.execute(
    `SELECT a.*, u.email as user_email 
     FROM appointment a 
     LEFT JOIN user u ON a.user_id = u.user_id 
     WHERE a.appointment_id = ?`,
    [id]
  );
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

// UPDATE STATUS
exports.updateAppointmentStatus = async (id, status, remarks = null) => {
  const timestamp_field = `${status}_at`;
  let query = `UPDATE appointment SET status=?, ${timestamp_field}=NOW()`;
  const params = [status];
  
  if (remarks) {
    query += ", admin_remarks=?";
    params.push(remarks);
  }
  
  if (status === 'denied') {
    query += ", denial_reason=?";
    params.push(remarks);
  }
  
  query += " WHERE appointment_id=?";
  params.push(id);
  
  const [result] = await db.execute(query, params);
  return result.affectedRows;
};

// GENERATE QR CODE
exports.generateQRCode = async (appointmentId) => {
  // Generate unique verification token
  const qrData = crypto.randomBytes(16).toString('hex');
  
  // Create verification URL that admin will scan
  const verificationUrl = `https://it-3105-n-repo-sqsf.vercel.app/AdminUI/verify-appointment?token=${qrData}&id=${appointmentId}`;
  
  // Generate QR code with the URL
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl);
  
  // Store the token in database
  await db.execute(
    "UPDATE appointment SET qr_code=? WHERE appointment_id=?",
    [qrData, appointmentId]
  );
  
  return { qrData, qrCodeDataUrl, verificationUrl };
};

// VERIFY QR CODE
exports.verifyQRCode = async (qrCode) => {
  const [rows] = await db.execute(
    "SELECT * FROM appointment WHERE qr_code = ? AND status = 'ongoing'",
    [qrCode]
  );
  return rows[0];
};

// DELETE
exports.deleteAppointment = async (id) => {
  const [result] = await db.execute("DELETE FROM appointment WHERE appointment_id = ?", [id]);
  return result.affectedRows;
};
