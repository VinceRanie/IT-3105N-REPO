-- phpMyAdmin SQL Dump
-- version 5.2.1deb1+deb12u1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Mar 22, 2026 at 08:32 PM
-- Server version: 10.11.14-MariaDB-0+deb12u2
-- PHP Version: 8.2.29

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `s22102959_Biocella`
--

-- --------------------------------------------------------

--
-- Table structure for table `appointment`
--

CREATE TABLE `appointment` (
  `appointment_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `student_id` varchar(50) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `purpose` varchar(255) DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `status` enum('pending','approved','denied','ongoing','visited') DEFAULT 'pending',
  `qr_code` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `pending_at` timestamp NULL DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `denied_at` timestamp NULL DEFAULT NULL,
  `ongoing_at` timestamp NULL DEFAULT NULL,
  `visited_at` timestamp NULL DEFAULT NULL,
  `denial_reason` text DEFAULT NULL,
  `admin_remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `appointment`
--

INSERT INTO `appointment` (`appointment_id`, `user_id`, `student_id`, `department`, `purpose`, `date`, `status`, `qr_code`, `created_at`, `pending_at`, `approved_at`, `denied_at`, `ongoing_at`, `visited_at`, `denial_reason`, `admin_remarks`) VALUES
(76, 99, '22102959', 'pls', 'pls', '2026-02-09 15:46:23', 'visited', 'af80dd1954b93f1cc1095c9b5a699fea', '2026-02-07 07:47:26', NULL, '2026-02-07 07:49:09', NULL, '2026-02-07 07:49:09', '2026-02-07 07:51:54', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `chemical_stock_batch`
--

CREATE TABLE `chemical_stock_batch` (
  `batch_id` int(11) NOT NULL,
  `chemical_id` int(11) DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `used_quantity` int(11) DEFAULT 0,
  `date_received` datetime DEFAULT current_timestamp(),
  `expiration_date` date DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `qr_code` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chemical_stock_batch`
--

INSERT INTO `chemical_stock_batch` (`batch_id`, `chemical_id`, `quantity`, `used_quantity`, `date_received`, `expiration_date`, `location`, `qr_code`) VALUES
(4, 8, 0, 0, '2025-12-10 01:53:35', NULL, 'asdsa', 'data:image/png;base64,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'),
(5, 9, 100, 99, '2025-12-10 17:17:12', NULL, 'IDK', 'data:image/png;base64,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'),
(6, 10, 100, 61, '2025-12-10 19:02:04', NULL, 'any where', 'data:image/png;base64,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'),
(7, 11, 2, 0, '2026-03-19 08:10:22', '2026-03-30', 'Ref', 'data:image/png;base64,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');

-- --------------------------------------------------------

--
-- Table structure for table `chemical_usage_log`
--

CREATE TABLE `chemical_usage_log` (
  `log_id` int(11) NOT NULL,
  `chemical_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `date_used` datetime DEFAULT NULL,
  `amount_used` int(11) DEFAULT NULL,
  `purpose` varchar(255) DEFAULT NULL,
  `batch_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `digital_logbook`
--

CREATE TABLE `digital_logbook` (
  `log_id` int(11) NOT NULL,
  `appointment_id` int(11) DEFAULT NULL,
  `student_id` varchar(50) DEFAULT NULL,
  `check_in_time` datetime DEFAULT NULL,
  `check_out_time` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_requests`
--

CREATE TABLE `password_reset_requests` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `request_time` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reagents_chemicals`
--

CREATE TABLE `reagents_chemicals` (
  `chemical_id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `type` varchar(100) DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `threshold` int(11) DEFAULT NULL,
  `last_updated` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reagents_chemicals`
--

INSERT INTO `reagents_chemicals` (`chemical_id`, `name`, `type`, `quantity`, `unit`, `threshold`, `last_updated`) VALUES
(8, 'sdasdas', 'Agar', 0, 'mL', 0, '2025-12-10 01:53:35'),
(9, 'agar', 'Agar', 100, 'kg', 11, '2025-12-10 17:17:12'),
(10, 'asdas', 'Agar', 100, 'L', 0, '2025-12-10 19:02:04'),
(11, 'test 1', 'Protein', 2, 'L', 5, '2026-03-19 08:10:22');

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `user_id` int(11) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `profile_photo` text DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `course` varchar(100) DEFAULT NULL,
  `is_setup_complete` tinyint(1) DEFAULT 0,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` enum('student','staff','faculty','admin') NOT NULL,
  `failed_login_attempts` int(11) DEFAULT 0,
  `lockout_until` datetime DEFAULT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expires` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`user_id`, `first_name`, `last_name`, `profile_photo`, `department`, `course`, `is_setup_complete`, `email`, `password`, `role`, `failed_login_attempts`, `lockout_until`, `reset_token`, `reset_token_expires`) VALUES
(99, NULL, NULL, NULL, NULL, NULL, 0, 'vinsberioso@gmail.com', 'sdasda', 'student', 0, NULL, NULL, NULL),
(104, 'Cyrus', 'Enad', NULL, 'DCISM', 'BSIT', 1, '21104163@usc.edu.ph', '$2a$10$u3lIux96icT30qAhwO5Q2eqkvN04niRG4KdZDL.oSCHwWXqfLDeJi', 'student', 0, NULL, NULL, NULL),
(105, 'Vince Ranie', 'Berioso', NULL, 'DCISM', 'BSIT', 1, '22102959@usc.edu.ph', '$2a$10$jatiHo0uUynOXiLITc764uxZuY.5oL7hJ/SuOoXeOW8XZbv73VlqO', 'admin', 0, NULL, NULL, NULL);

--
-- Triggers `user`
--
DELIMITER $$
CREATE TRIGGER `limit_one_admin` BEFORE INSERT ON `user` FOR EACH ROW BEGIN
  IF NEW.role = 'admin' THEN
    IF (SELECT COUNT(*) FROM User WHERE role = 'admin') >= 1 THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Only one admin allowed.';
    END IF;
  END IF;
END
$$
DELIMITER ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `appointment`
--
ALTER TABLE `appointment`
  ADD PRIMARY KEY (`appointment_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `chemical_stock_batch`
--
ALTER TABLE `chemical_stock_batch`
  ADD PRIMARY KEY (`batch_id`),
  ADD KEY `chemical_id` (`chemical_id`);

--
-- Indexes for table `chemical_usage_log`
--
ALTER TABLE `chemical_usage_log`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `chemical_id` (`chemical_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `batch_id` (`batch_id`);

--
-- Indexes for table `digital_logbook`
--
ALTER TABLE `digital_logbook`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `appointment_id` (`appointment_id`);

--
-- Indexes for table `password_reset_requests`
--
ALTER TABLE `password_reset_requests`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `reagents_chemicals`
--
ALTER TABLE `reagents_chemicals`
  ADD PRIMARY KEY (`chemical_id`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `appointment`
--
ALTER TABLE `appointment`
  MODIFY `appointment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=100;

--
-- AUTO_INCREMENT for table `chemical_stock_batch`
--
ALTER TABLE `chemical_stock_batch`
  MODIFY `batch_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `chemical_usage_log`
--
ALTER TABLE `chemical_usage_log`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `digital_logbook`
--
ALTER TABLE `digital_logbook`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `password_reset_requests`
--
ALTER TABLE `password_reset_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reagents_chemicals`
--
ALTER TABLE `reagents_chemicals`
  MODIFY `chemical_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=106;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `appointment`
--
ALTER TABLE `appointment`
  ADD CONSTRAINT `appointment_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`);

--
-- Constraints for table `chemical_stock_batch`
--
ALTER TABLE `chemical_stock_batch`
  ADD CONSTRAINT `chemical_stock_batch_ibfk_1` FOREIGN KEY (`chemical_id`) REFERENCES `reagents_chemicals` (`chemical_id`);

--
-- Constraints for table `chemical_usage_log`
--
ALTER TABLE `chemical_usage_log`
  ADD CONSTRAINT `chemical_usage_log_ibfk_1` FOREIGN KEY (`chemical_id`) REFERENCES `reagents_chemicals` (`chemical_id`),
  ADD CONSTRAINT `chemical_usage_log_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`),
  ADD CONSTRAINT `chemical_usage_log_ibfk_3` FOREIGN KEY (`batch_id`) REFERENCES `chemical_stock_batch` (`batch_id`);

--
-- Constraints for table `digital_logbook`
--
ALTER TABLE `digital_logbook`
  ADD CONSTRAINT `digital_logbook_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `appointment` (`appointment_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
