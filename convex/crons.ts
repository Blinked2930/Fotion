import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run the Janitor every night at midnight UTC
crons.daily(
  "clear-old-demo-sandboxes",
  { hourUTC: 0, minuteUTC: 0 },
  internal.demo.cleanupOldDemos
);

// Central European Summer Time (CEST / Albania) is UTC+2
// 2:00 AM CEST = 0:00 AM UTC (Midnight UTC)
crons.daily(
  "reset-is-today-flags",
  { hourUTC: 0, minuteUTC: 0 },
  internal.tasks.resetTodayFlags
);

export default crons;