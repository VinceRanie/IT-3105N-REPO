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
  const [rows] = await db.execute(
    "SELECT * FROM appointment WHERE deleted_at IS NULL ORDER BY date DESC"
  );
  return rows;
};

// READ BY STATUS
exports.getAppointmentsByStatus = async (status) => {
  const [rows] = await db.execute(
    "SELECT * FROM appointment WHERE status = ? AND deleted_at IS NULL ORDER BY date DESC",
    [status]
  );
  return rows;
};

// CHECK FOR SCHEDULE CONFLICTS
exports.checkScheduleConflict = async (date, excludeId = null) => {
  let query = "SELECT * FROM appointment WHERE date = ? AND status IN ('approved', 'ongoing') AND deleted_at IS NULL";
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
  const [rows] = await db.execute(
    "SELECT * FROM appointment WHERE appointment_id = ? AND deleted_at IS NULL",
    [id]
  );
  return rows[0];
};

// READ ONE WITH USER EMAIL
exports.getAppointmentWithUserEmail = async (id) => {
  const [rows] = await db.execute(
    `SELECT a.*, u.email as user_email 
     FROM appointment a 
     LEFT JOIN user u ON a.user_id = u.user_id 
     WHERE a.appointment_id = ? AND a.deleted_at IS NULL`,
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
    "SELECT * FROM appointment WHERE qr_code = ? AND status = 'ongoing' AND deleted_at IS NULL",
    [qrCode]
  );
  return rows[0];
};

// GET APPOINTMENTS FOR DATE RANGE (for calendar view)
exports.getAppointmentsByDateRange = async (startDate, endDate, userId = null) => {
  let query = "SELECT * FROM appointment WHERE date >= ? AND date <= ? AND deleted_at IS NULL AND status != 'denied'";
  const params = [startDate, endDate];
  
  if (userId) {
    query += " AND user_id = ?";
    params.push(userId);
  }
  
  const [rows] = await db.execute(query, params);
  return rows;
};

// GET APPOINTMENTS FOR SPECIFIC DATE
exports.getAppointmentsByDate = async (date) => {
  const [rows] = await db.execute(
    "SELECT * FROM appointment WHERE DATE(date) = DATE(?) AND deleted_at IS NULL AND status IN ('approved', 'ongoing')",
    [date]
  );
  return rows;
};

// SOFT DELETE (Mark as no-show)
exports.softDeleteAppointment = async (id) => {
  const [result] = await db.execute(
    "UPDATE appointment SET deleted_at = NOW() WHERE appointment_id = ? AND deleted_at IS NULL",
    [id]
  );
  return result.affectedRows;
};

// AUTO-EXPIRE ONGOING APPOINTMENTS (cron job)
exports.expireOldAppointments = async () => {
  const [result] = await db.execute(
    "UPDATE appointment SET deleted_at = NOW() WHERE status = 'ongoing' AND date < NOW() AND deleted_at IS NULL"
  );
  return result.affectedRows;
};
