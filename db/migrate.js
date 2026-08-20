require('dotenv').config();

const mysql = require('mysql2/promise');
const { getDbConfig } = require('../src/config/db-config');

const dbConfig = getDbConfig();
const database = dbConfig.database;
const baseConfig = { ...dbConfig };
delete baseConfig.database;

const statements = [
  `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `USE \`${database}\``,
  `CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'worker') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS task_domains (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
  )`,
  `CREATE TABLE IF NOT EXISTS competency_scores (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    domain_id INT UNSIGNED NOT NULL,
    score TINYINT UNSIGNED NOT NULL,
    notes TEXT NULL,
    recorded_by INT UNSIGNED NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT competency_score_range CHECK (score BETWEEN 0 AND 4),
    CONSTRAINT fk_comp_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_comp_domain FOREIGN KEY (domain_id) REFERENCES task_domains(id),
    CONSTRAINT fk_comp_recorded_by FOREIGN KEY (recorded_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(190) NOT NULL,
    description TEXT NULL,
    domain_id INT UNSIGNED NULL,
    assigned_to INT UNSIGNED NOT NULL,
    created_by INT UNSIGNED NOT NULL,
    due_date DATE NULL,
    status ENUM('todo', 'in_progress', 'done') NOT NULL DEFAULT 'todo',
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_domain FOREIGN KEY (domain_id) REFERENCES task_domains(id),
    CONSTRAINT fk_task_assigned FOREIGN KEY (assigned_to) REFERENCES users(id),
    CONSTRAINT fk_task_created_by FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS clock_events (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    clock_in TIMESTAMP NOT NULL,
    clock_out TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_clock_user FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_clock_user_open (user_id, clock_out),
    INDEX idx_clock_in (clock_in)
  )`,
  `CREATE TABLE IF NOT EXISTS visit_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    task_id INT UNSIGNED NULL,
    visit_date DATE NOT NULL,
    hours_worked DECIMAL(8,2) NULL,
    description TEXT NOT NULL,
    status ENUM('pending', 'approved') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_visit_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_visit_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS visit_log_domains (
    visit_log_id INT UNSIGNED NOT NULL,
    domain_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (visit_log_id, domain_id),
    CONSTRAINT fk_vld_visit FOREIGN KEY (visit_log_id) REFERENCES visit_logs(id) ON DELETE CASCADE,
    CONSTRAINT fk_vld_domain FOREIGN KEY (domain_id) REFERENCES task_domains(id)
  )`,
  `CREATE TABLE IF NOT EXISTS work_ethic_notes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    visit_log_id INT UNSIGNED NULL,
    note TEXT NOT NULL,
    created_by INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_note_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_note_visit FOREIGN KEY (visit_log_id) REFERENCES visit_logs(id) ON DELETE SET NULL,
    CONSTRAINT fk_note_created_by FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS pay_ledger (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    hours_total DECIMAL(8,2) NOT NULL,
    rate DECIMAL(8,2) NOT NULL,
    amount_owed DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    status ENUM('pending', 'paid') NOT NULL DEFAULT 'pending',
    paid_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ledger_user FOREIGN KEY (user_id) REFERENCES users(id)
  )`
];

async function migrate() {
  const connection = await mysql.createConnection(baseConfig);
  try {
    for (const statement of statements) {
      await connection.query(statement);
    }
    console.log(`Migrated ${database}`);
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
