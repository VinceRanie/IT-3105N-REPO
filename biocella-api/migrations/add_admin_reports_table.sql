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
