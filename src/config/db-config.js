function cleanEnvValue(value, fallback = '') {
  const cleaned = (value || fallback).trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    return cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

function getDbConfig() {
  return {
    host: cleanEnvValue(process.env.DB_HOST, 'localhost'),
    port: Number(cleanEnvValue(process.env.DB_PORT, '3306')),
    user: cleanEnvValue(process.env.DB_USER, 'root'),
    password: cleanEnvValue(process.env.DB_PASSWORD),
    database: cleanEnvValue(process.env.DB_NAME, 'mission_property_tracker'),
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    timezone: 'Z'
  };
}

module.exports = { cleanEnvValue, getDbConfig };
