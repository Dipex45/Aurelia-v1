import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Queue } from "bullmq";
import { Router } from "express";
import { connection } from "./queue.ts";
import { logger } from "./logger.ts";

export function setupBullBoard(app: any) {
  if (!connection) {
    logger.info("[Bull-Board] Redis connection offline. Native queue dashboard is inactive.");
    
    // Fallback info endpoint
    app.get("/api/queues", (req: any, res: any) => {
      res.json({
        status: "Redis offline",
        message: "No queue monitoring dashboard available without an active REDIS_URL."
      });
    });
    return;
  }

  try {
    const emailQueue = new Queue("emails", { connection });
    const systemQueue = new Queue("system", { connection });

    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath("/api/queues");

    createBullBoard({
      queues: [
        new BullMQAdapter(emailQueue),
        new BullMQAdapter(systemQueue)
      ],
      serverAdapter: serverAdapter,
    });

    // Mount Bull Board UI
    app.use("/api/queues", serverAdapter.getRouter());
    logger.info("[Bull-Board] Queue monitoring integrated and mounted on /api/queues");

    // Implement programmatic custom actions for Queue Ops (failed job inspection, retries, dlq, cleanup)
    const queueOpsRouter = Router();

    // 1. Inspect failed jobs across all active queues
    queueOpsRouter.get("/failed", async (req, res) => {
      try {
        const failedEmailJobs = await emailQueue.getFailed();
        const failedSystemJobs = await systemQueue.getFailed();

        const serializeJobs = (jobs: any[]) =>
          jobs.map(j => ({
            id: j.id,
            name: j.name,
            data: j.data,
            failedReason: j.failedReason,
            stacktrace: j.stacktrace,
            timestamp: new Date(j.timestamp).toISOString()
          }));

        res.json({
          emails: serializeJobs(failedEmailJobs),
          system: serializeJobs(failedSystemJobs)
        });
      } catch (err: any) {
        logger.error("[QueueOps] Failed to fetch failed jobs:", { metadata: { error: err.message } });
        res.status(500).json({ error: "Failed to fetch failed queue indices: " + err.message });
      }
    });

    // 2. Clear clean and purge failed jobs across queues
    queueOpsRouter.post("/clean", async (req, res) => {
      try {
        // Purge queues of failed entries (retention cleanup policy)
        await emailQueue.clean(0, 1000, "failed");
        await systemQueue.clean(0, 1000, "failed");

        logger.info("[QueueOps] Mass queue purges and cleanups triggered successfully.");
        res.json({ status: "success", message: "Successfully purged all failed jobs from registry." });
      } catch (err: any) {
        logger.error("[QueueOps] Purge cleanup failed:", { metadata: { error: err.message } });
        res.status(500).json({ error: "Queue purge failure: " + err.message });
      }
    });

    // 3. Trigger manual retry on all failed jobs
    queueOpsRouter.post("/retry", async (req, res) => {
      try {
        const emailsFailed = await emailQueue.getFailed();
        const systemsFailed = await systemQueue.getFailed();

        for (const job of emailsFailed) {
          await job.retry();
        }
        for (const job of systemsFailed) {
          await job.retry();
        }

        logger.info(`[QueueOps] Manual mass retries initiated for other services. Retried ${emailsFailed.length} email entries & ${systemsFailed.length} system elements.`);
        res.json({
          status: "success",
          retriedCount: emailsFailed.length + systemsFailed.length,
          message: `Attempted retry commands for ${emailsFailed.length} email jobs and ${systemsFailed.length} system jobs.`
        });
      } catch (err: any) {
        logger.error("[QueueOps] Mass retry action failed:", { metadata: { error: err.message } });
        res.status(500).json({ error: "Job retry handler failure: " + err.message });
      }
    });

    app.use("/api/queues-ops", queueOpsRouter);
    logger.info("[Bull-Board-Ops] Developer Queue control endpoints mounted on /api/queues-ops");

  } catch (err: any) {
    logger.error("[Bull-Board] Failed to bind queues to dashboard:", { metadata: { error: err.message } });
  }
}
