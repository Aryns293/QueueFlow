require('dotenv').config();

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000';

const JOB_TYPES = ['email', 'sms', 'image-resize', 'pdf-generate', 'analytics'];

const simulate = async () => {
  const total = 50;
  console.log(`Firing ${total} jobs at ${API_URL}...\n`);

  for (let i = 1; i <= total; i++) {
    const type = JOB_TYPES[Math.floor(Math.random() * JOB_TYPES.length)];

    try {
      const res = await axios.post(`${API_URL}/jobs`, {
        type,
        payload: {
          jobNumber: i,
          message: `Simulated job #${i}`,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`[${i}/${total}] Created ${type} job → ${res.data.jobId}`);

    } catch (err) {
      console.error(`[${i}/${total}] Failed: ${err.message}`);
    }

    // 100ms gap between each job
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log('\nSimulation complete — check dashboard');
  process.exit(0);
};

simulate();