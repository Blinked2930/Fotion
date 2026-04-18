import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run the Janitor every night at midnight UTC
crons.daily(
  "clear-old-demo-sandboxes",
  { hourUTC: 0, minuteUTC: 0 },
  internal.demo.cleanupOldDemos
);

export default crons;