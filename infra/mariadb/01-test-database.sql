-- Local development only; executed by the official image on a fresh project volume.
CREATE DATABASE IF NOT EXISTS healthycheck_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON healthycheck_test.* TO 'healthycheck'@'%';
