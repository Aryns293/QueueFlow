const express = require('express');
const cors = require('cors');
const { randomUUID: uuidv4 } = require('crypto');
require('dotenv').config();

const pool = require('./db');
const { getClient } = require('./redis');

const app = express();

app.use(cors());
app.use(express.json());

let redis;

// ==============================
// HEALTH ROUTES
// ==============================

app.get("/", (req, res) => {
  res.send("QueueFlow API is running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ==============================
// POST /jobs — create a new job
// ==============================

app.post('/jobs', async (req, res) => {
  try {
    const { type, payload } = req.body;

    if (!type) {
      return res.status(400).json({
        error: 'type is required'
      });
    }

    const id = uuidv4();

    // Save job in PostgreSQL
    await pool.query(
      `INSERT INTO jobs (id, type, payload, status)
       VALUES ($1, $2, $3, 'queued')`,
      [id, type, JSON.stringify(payload || {})]
    );

    // Push job to Redis queue
    await redis.lPush(
      'jobQueue',
      JSON.stringify({ id, type, payload })
    );

    console.log(`Job created: ${id} (type: ${type})`);

    res.json({
      success: true,
      jobId: id
    });

  } catch (err) {
    console.error('Error creating job:', err.message);

    res.status(500).json({
      error: err.message
    });
  }
});

// ==============================
// GET /jobs — get all jobs
// ==============================

app.get('/jobs', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM jobs ORDER BY created_at DESC LIMIT 200'
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// ==============================
// GET /jobs/:id — get single job
// ==============================

app.get('/jobs/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM jobs WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// ==============================
// START SERVER
// ==============================

const start = async () => {
  try {
    // Connect Redis
    redis = await getClient();

    console.log('Redis connected');

    // Start Express server
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

start();