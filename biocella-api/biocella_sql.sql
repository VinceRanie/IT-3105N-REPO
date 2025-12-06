-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 15, 2025 at 08:14 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `biocella_sql`
--
CREATE DATABASE IF NOT EXISTS `biocella_sql` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `biocella_sql`;

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
  `status` varchar(50) DEFAULT NULL,
  `qr_code` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  `qr_code` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  `quantity` int(11) DEFAULT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `threshold` int(11) DEFAULT NULL,
  `last_updated` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `user_id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` enum('student','staff','faculty','admin') NOT NULL,
  `failed_login_attempts` int(11) DEFAULT 0,
  `lockout_until` datetime DEFAULT NULL,
  `reset_token` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`user_id`, `name`, `email`, `password`, `role`, `failed_login_attempts`, `lockout_until`, `reset_token`) VALUES
(3, '', '21104163@usc.edu.ph', '$2b$10$0lTkF3ppBa9YTT5MnOxG3uokxTjF9BrEPU5ZCYAeCnxKv9EU4Ejn6', 'student', 0, NULL, 'd2710629-37ce-4800-a6e6-0c4e46141b8b');

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
  MODIFY `appointment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `chemical_stock_batch`
--
ALTER TABLE `chemical_stock_batch`
  MODIFY `batch_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `chemical_usage_log`
--
ALTER TABLE `chemical_usage_log`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT;

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
  MODIFY `chemical_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

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
