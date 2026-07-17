-- FreightFlex – MySQL 8.0 Database Initialisation
-- Run automatically by Docker on first startup

CREATE DATABASE IF NOT EXISTS freightflex
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE freightflex;

-- Set timezone to UTC
SET time_zone = '+00:00';

-- Set SQL mode
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';