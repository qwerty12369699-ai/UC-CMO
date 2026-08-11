const { pool } = require('../config/database');

async function waitForDb(retries = 30, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await pool.getConnection();
      conn.release();
      console.log('Database is available');
      return;
    } catch (err) {
      console.log(`Waiting for database... (${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Could not connect to the database');
}

waitForDb().catch(err => {
  console.error(err.message);
  process.exit(1);
});
