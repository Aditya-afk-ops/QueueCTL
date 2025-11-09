const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const queue = require("./queue");

const CONFIG_FILE = path.join(__dirname, "config.json");
const PID_FILE = path.join(__dirname, "workers.pid");

if (!fs.existsSync(CONFIG_FILE))
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ maxRetries: 3 }, null, 2));

const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
const mode = process.argv[2];

function saveConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

(async () => {
  switch (mode) {
    // ---------- Enqueue ----------
    case "enqueue": {
      const id = process.argv[3];
      const command = process.argv.slice(4).join(" ");
      if (!id || !command) {
        console.log("Invalid syntax. Example:");
        console.log('  node queuectl.js enqueue job1 "echo Hello World"');
        break;
      }

      const job = { id, command };
      await queue.Enqueue(job);
      console.log(`Enqueued job ${job.id}: ${job.command}`);
      break;
    }

    // ---------- Worker ----------
    case "worker": {
      const action = process.argv[3];

      if (action === "start") {
        const countIdx = process.argv.indexOf("--count");
        const count = parseInt(process.argv[countIdx + 1] || "1", 10);
        if (isNaN(count) || count <= 0 || count > 10) {
          console.log("Invalid worker count. Use --count <1–10>");
          return;
        }

        const script = path.join(__dirname, "worker.js");
        const child = spawn("node", [script, "--count", count.toString()], {
          detached: true,
          stdio: "ignore",
        });
        child.unref();
        fs.writeFileSync(PID_FILE, child.pid.toString());
        console.log(`Worker process started (PID ${child.pid}) with ${count} workers`);
      } else if (action === "stop") {
  if (!fs.existsSync(PID_FILE)) {
    console.log("No running workers found.");
    return;
  }
  const pid = parseInt(fs.readFileSync(PID_FILE, "utf8"));
  const { execSync } = require("child_process");

  try {
    // Windows-safe termination of detached Node process
    execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
    fs.unlinkSync(PID_FILE);
    console.log(`Stopped worker process (PID ${pid}).`);
  } catch (err) {
    console.log("Failed to stop workers. They may already be stopped.");
  }
}
 else {
        console.log("Usage:\n  node queuectl.js worker start --count 3\n  node queuectl.js worker stop");
      }
      break;
    }

    // ---------- Status ----------
    case "status": {
      const data = queue._load();
      const summary = {
        ready: data.ready.length,
        finished: data.finished.length,
        dead: data.dead.length,
      };
      console.table(summary);
      if (fs.existsSync(PID_FILE))
        console.log(`Active worker PID: ${fs.readFileSync(PID_FILE, "utf8")}`);
      else console.log("No active workers found.");
      break;
    }

    // ---------- DLQ ----------
    case "dlq": {
      const action = process.argv[3];
      const data = queue._load();

      if (action === "list") {
        console.table(data.dead.map(j => ({
          id: j.id,
          command: j.command,
          attempts: j.attempts,
        })));
      } else if (action === "retry") {
        const jobId = process.argv[4];
        const job = data.dead.find(j => j.id == jobId);
        if (!job) return console.log("Job not found in DLQ");
        job.state = "pending";
        job.attempts = 0;
        data.dead = data.dead.filter(j => j.id != jobId);
        data.ready.push(job);
        queue._save(data);
        console.log(`Retried job ${jobId}, moved back to ready queue`);
      } else {
        console.log("Usage: node queuectl.js dlq list | node queuectl.js dlq retry <jobId>");
      }
      break;
    }

    default:
      console.log(`
Usage:
  node queuectl.js enqueue job1 "echo Hello World"
  node queuectl.js worker start --count 3
  node queuectl.js worker stop
  node queuectl.js status
  node queuectl.js dlq list
  node queuectl.js dlq retry <jobId>
`);
  }
})();
