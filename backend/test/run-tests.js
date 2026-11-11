// Automated Test Runner
async function start() {
  let serverInstance = null;

  // Check if a server is already running on port 5000
  let isRunning = false;
  try {
    const res = await fetch('http://127.0.0.1:5000/api/health', { signal: AbortSignal.timeout(1000) });
    if (res.ok) isRunning = true;
  } catch {}

  if (!isRunning) {
    serverInstance = require('../server');
    // Allow small delay for socket binding
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  require('./test-suite');
}

start().catch((err) => {
  console.error('Failed to run tests:', err);
  process.exit(1);
});
