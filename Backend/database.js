const { Pool } = require("pg");

// ============================================================
// POSTGRESQL CONNECTION
// ============================================================

const poolConfig = {
  connectionString: process.env.DATABASE_URL,

  // Maximum number of PostgreSQL connections.
  // Can be overridden using DB_POOL_MAX.
  max: Number(process.env.DB_POOL_MAX) || 10,

  // Close idle connections after 30 seconds.
  idleTimeoutMillis: 30000,

  // Wait up to 5 seconds for a connection.
  connectionTimeoutMillis: 5000,
};

// ============================================================
// SSL
// ============================================================

if (process.env.NODE_ENV === "production") {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

// ============================================================
// CREATE POOL
// ============================================================

const pool = new Pool(poolConfig);

// ============================================================
// DATABASE ERROR HANDLER
// ============================================================

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL database error:", error);
});

// ============================================================
// TEST CONNECTION
// ============================================================

async function testConnection() {
  let client;

  try {
    client = await pool.connect();

    const result = await client.query("SELECT NOW() AS current_time");

    console.log("PostgreSQL database connected successfully.");

    console.log("Database time:", result.rows[0].current_time);

    return true;
  } catch (error) {
    console.error("PostgreSQL connection failed:");

    console.error(error.message);

    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// ============================================================
// CHECK DATABASE
// ============================================================

async function checkDatabase() {
  try {
    await pool.query("SELECT 1");

    return true;
  } catch (error) {
    console.error("Database health check failed:", error.message);

    return false;
  }
}

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

async function closeDatabase() {
  try {
    await pool.end();

    console.log("PostgreSQL connection pool closed.");
  } catch (error) {
    console.error("Error closing PostgreSQL pool:", error.message);
  }
}

// ============================================================
// EXPORT
// ============================================================

module.exports = pool;

module.exports.testConnection = testConnection;

module.exports.checkDatabase = checkDatabase;

module.exports.closeDatabase = closeDatabase;
