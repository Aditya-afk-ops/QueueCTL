//Demo Video - https://drive.google.com/file/d/1K67-Zt3b06VBYhilDQNSeAyDLK08_p8C/view?usp=drive_link

//To set up locally : 

1. Install Node.js (v12 or higher)

2. Installation
Clone the project files into a directory.
No additional dependencies required - uses only Node.js built-in modules.
Now, Initialize the queue (automatic on first run):

//Order of commands to test the queue system : 

1. Start Workers

Starting with 2 workers (We can change the count with --count):

node queuectl.js worker start --count 2

This will start background workers that will continuously poll the ready queue.

2. Enqueue Jobs

Adding some test jobs. Example:

node queuectl.js enqueue job1 "echo Hello World"
node queuectl.js enqueue job2 "echo Testing Queue"
node queuectl.js enqueue job3 "node -v"


Jobs are added to the ready queue.

Workers automatically pick them up and run.

3. Check Queue Status

To View how many jobs are in each queue:

node queuectl.js status


Expected output:

ready	finished	dead
0	3	0

ready decreases as workers pick up jobs.

finished increases as jobs complete.

dead contains failed jobs if any exceed retry limit.

4. Inspect Finished Jobs

We can check completed jobs and their output:

node queuectl.js view all


Each finished job will have an output field with the command result.

5. Simulate a Failed Job

To Enqueue a failing command to test retries and dead queue:

node queuectl.js enqueue jobFail "exit 1"


The worker will retry 3 times.

After 3 failures, it moves the job to dead.

6. List Dead Jobs

Check the dead queue:

node queuectl.js dlq list

7. Retry a Dead Job

Retry a failed job by its ID:

node queuectl.js dlq retry jobFail


It will move back to the ready queue and be picked up by workers again.

8. Stop Workers

When we are done with testing:

node queuectl.js worker stop.

// Job Lifecycle

[Enqueue] → [Ready Queue] → [Worker Picks Up] → [Execution]
                                                      ↓
                                            ┌─────────┴─────────┐
                                            ↓                   ↓
                                      [Success]            [Failure]
                                            ↓                   ↓
                                   [Finished Queue]    [Retry? attempts < 3]
                                                              ↓     ↓
                                                            Yes    No
                                                              ↓     ↓
                                                      [Ready Queue] [DLQ]

//Data Persistence

File: queue.json

1. Stores three arrays: ready, finished, dead
2. Each job contains: id, command, state, attempts, output, updated_at
3. Updated synchronously on every queue operation

File: config.json

1. Stores configuration: maxRetries: 3
2. Can be manually edited to change retry behavior

File: workers.pid

1. Tracks the main worker process ID
2. Used for stopping workers

//Assumptions

1. Single Machine: Designed for single-node operation, not for distributed systems
2. Shell Access: Assumes shell commands are available and safe to execute
3. File System: Relies on file system for persistence (not a database)

//Trade-offs

1. Simplicity vs Scalability

Chosen: Simple file-based storage
Sacrificed: Horizontal scaling across multiple machines
:: Easy to understand and debug, sufficient for moderate workloads

2. No Authentication

Chosen: Open access to queue operations
Sacrificed: Security controls
:: Designed for local/trusted environments

3. Polling vs Event-Driven

Chosen: Polling with 500ms interval
Sacrificed: Instant job pickup
:: Simpler implementation, acceptable latency for most use cases