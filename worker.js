const util = require("util");
const { exec } = require("child_process");
const queue = require("./queue");

const execPromise = util.promisify(exec);
const COUNT = parseInt(process.argv[process.argv.indexOf("--count") + 1] || "1", 10);
const MAX_ATTEMPTS = 3;

async function runWorker(id) {
  console.log(`Worker ${id} started`);

  while (true) {
    const job = queue.Dequeue();
    if (!job) {
      await new Promise(r => setTimeout(r, 500));
      continue;
    }

    console.log(`Worker ${id} running job ${job.id}: "${job.command}"`);

    try {
      // Execute command
      const { stdout, stderr } = await execPromise(job.command);

      // Save output in job object
      job.output = (stdout || stderr || "").trim();
      job.attempts = job.attempts || 0;

      // Push to finished queue
      queue.markFinished(job);

      console.log(`Job ${job.id} finished. Output:\n${job.output}`);
    } catch (err) {
      job.attempts = (job.attempts || 0) + 1;
      job.output = (err.stdout || err.stderr || err.message || "").trim();

      if (job.attempts < MAX_ATTEMPTS) {
        console.log(`Retrying job ${job.id} (attempt ${job.attempts})`);
        job.state = "pending";
        await queue.Enqueue(job);
      } else {
        console.log(`Job ${job.id} exceeded max attempts, moving to dead queue`);
        queue.moveToDead(job);
      }
    }

    await new Promise(r => setTimeout(r, 200));
  }
}

// Start all workers
for (let i = 1; i <= COUNT; i++) runWorker(i);
