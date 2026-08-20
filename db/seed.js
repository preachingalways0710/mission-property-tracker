require('dotenv').config();

const bcrypt = require('bcryptjs');
const { query } = require('../src/db');

const domains = [
  'Landscaping & Grounds',
  'Pool',
  'Water System',
  'Electrical',
  'Painting',
  'General Repairs & Tool Care',
  'Equipment Maintenance'
];

async function upsertUser({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 12);
  await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES (:name, :email, :passwordHash, :role)
     ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role)`,
    { name, email, passwordHash, role }
  );
}

async function seed() {
  for (const name of domains) {
    await query('INSERT IGNORE INTO task_domains (name) VALUES (:name)', { name });
  }

  await upsertUser({
    name: process.env.ADMIN_NAME || 'Property Admin',
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'change-me-admin',
    role: 'admin'
  });

  await upsertUser({
    name: process.env.WORKER_NAME || 'Hudson',
    email: process.env.WORKER_EMAIL || 'hudson@example.com',
    password: process.env.WORKER_PASSWORD || 'change-me-worker',
    role: 'worker'
  });

  console.log('Seeded users and task domains');
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seed };
