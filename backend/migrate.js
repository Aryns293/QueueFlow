const pool = require('./db');
require('dotenv').config();

const migrate = async () => {
  try {
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS jobs (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        type        VARCHAR(50) NOT NULL,
        payload     JSONB       NOT NULL,
        status      VARCHAR(20) DEFAULT 'queued',
        retry_count INTEGER     DEFAULT 0,
        max_retries INTEGER     DEFAULT 3,
        error       TEXT,
        created_at  TIMESTAMP   DEFAULT NOW(),
        updated_at  TIMESTAMP   DEFAULT NOW()
      );
    `);

    console.log('Migration complete — jobs table created');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
};

migrate();