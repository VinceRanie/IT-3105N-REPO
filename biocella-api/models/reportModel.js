const db = require("../config/mysql");

let reportsTableReady = false;

const ensureReportsTable = async () => {
  if (reportsTableReady) return;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin_reports (
      report_id INT AUTO_INCREMENT PRIMARY KEY,
      report_uuid VARCHAR(36) NOT NULL UNIQUE,
      user_id INT NOT NULL,
      period ENUM('weekly', 'monthly') NOT NULL,
      range_label VARCHAR(120) NOT NULL,
      report_payload LONGTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_admin_reports_user_created (user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
  `);

  reportsTableReady = true;
};

exports.getReportsByUserId = async (userId) => {
  await ensureReportsTable();

  const [rows] = await db.execute(
    `
      SELECT report_uuid, user_id, period, range_label, report_payload, created_at
      FROM admin_reports
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `,
    [userId]
  );

  return rows;
};

exports.createReport = async ({ report_uuid, user_id, period, range_label, report_payload }) => {
  await ensureReportsTable();

  const [result] = await db.execute(
    `
      INSERT INTO admin_reports (report_uuid, user_id, period, range_label, report_payload)
      VALUES (?, ?, ?, ?, ?)
    `,
    [report_uuid, user_id, period, range_label, report_payload]
  );

  return result.insertId;
};

exports.deleteReport = async ({ report_uuid, user_id }) => {
  await ensureReportsTable();

  const [result] = await db.execute(
    `
      DELETE FROM admin_reports
      WHERE report_uuid = ? AND user_id = ?
    `,
    [report_uuid, user_id]
  );

  return result.affectedRows;
};
