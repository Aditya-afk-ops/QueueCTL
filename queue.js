const fs = require("fs");
const path = require("path");

const QUEUE_FILE = path.join(__dirname, "queue.json");

// initialize file
if (!fs.existsSync(QUEUE_FILE)) {
  fs.writeFileSync(
    QUEUE_FILE,
    JSON.stringify({ ready: [], finished: [], dead: [] }, null, 2),
    "utf-8"
  );
}

function _load() {
  return JSON.parse(fs.readFileSync(QUEUE_FILE, "utf-8"));
}

function _save(data) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function Enqueue(job) {
  const data = _load();
  job.state = "pending";
  job.attempts = 0;
  data.ready.push(job);
  _save(data);
}

function Dequeue() {
  const data = _load();
  const job = data.ready.shift();
  if (!job) return null;
  _save(data);
  return job;
}

// Correctly push finished job with output
function markFinished(job) {
  const data = _load();
  job.state = "finished";
  job.updated_at = new Date().toISOString();
  if (!job.output) job.output = ""; // ensure output exists
  data.finished.push(job);
  _save(data);
}



function moveToDead(job) {
  const data = _load();
  job.state = "dead";
  job.updated_at = new Date().toISOString();
  if (!job.output) job.output = "";
  data.dead.push(job);
  _save(data);
}

module.exports = { Enqueue, Dequeue, markFinished, moveToDead, _load, _save };
