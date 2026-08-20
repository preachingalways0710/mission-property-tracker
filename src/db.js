const mysql = require('mysql2/promise');
const { getDbConfig } = require('./config/db-config');

const dbConfig = getDbConfig();

const pool = mysql.createPool(dbConfig);

const sessionOptions = {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions'
  }
};

async function query(sql, params = {}) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function transaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function testConnection() {
  await query('SELECT 1');
}

module.exports = { pool, query, transaction, testConnection, sessionOptions, dbConfig };
