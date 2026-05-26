'use strict';
require('dotenv').config();

const pool = require('./db');
const { getClient } = require('./redis');

const QUEUE_NAME = 'jobQueue';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const processJob = async (job) => {
  await sleep(200);
  if (Math.random() < 0.85) {
    throw new Error('Simulated random failure');
  }
  console.log(`  ✓ Done [${job.type}] job ${job.id}`);
};

const handleJob = async (rawData, redis) => {
  let job;
  try {
    job = JSON.parse(rawData);
  } catch {
    console.error('Could not parse job data:', rawData);
    return;
  }

  try {
    await pool.query(
      `UPDATE jobs SET status = 'processing', updated_at = NOW() WHERE id = $1`,
      [job.id]
    );
    await processJob(job);
    await pool.query(
      `UPDATE jobs SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [job.id]
    );
    console.log(`✓ Job ${job.id} completed`);
  } catch (err) {
    console.error(`✗ Job ${job.id} failed: ${err.message}`);

    const result = await pool.query(
      'SELECT retry_count, max_retries FROM jobs WHERE id = $1',
      [job.id]
    );

    if (result.rows.length === 0) return;

    const { retry_count, max_retries } = result.rows[0];

    if (retry_count < max_retries) {
      const newCount = retry_count + 1;
      console.log(`  ↻ Retry ${newCount}/${max_retries} for job ${job.id}`);
      await pool.query(
        `UPDATE jobs
         SET retry_count = $1,
             status = 'queued',
             error = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [newCount, err.message, job.id]
      );
      await redis.lPush(QUEUE_NAME, JSON.stringify(job));
    } else {
      await pool.query(
        `UPDATE jobs
         SET status = 'failed',
             error = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [err.message, job.id]
      );
      console.log(`✗ Job ${job.id} permanently failed after ${max_retries} retries`);
    }
  }
};

async function startWorker() {
  const redis = await getClient();
  console.log('Worker connected to Redis:', process.env.REDIS_URL);
  console.log('Worker started — waiting for jobs...\n');

  while (true) {
    try {
      const result = await redis.brPop(QUEUE_NAME, 0);
      if (result && result.element) {
        await handleJob(result.element, redis);
      }
    } catch (err) {
      console.error('Worker loop error:', err.message);
      await sleep(2000);
    }
  }
}

startWorker();