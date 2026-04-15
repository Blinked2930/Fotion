import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Runs daily at exactly 6:00 AM UTC (which perfectly aligns with 8:00 AM local time to catch you in the morning)
crons.daily(
  "Send morning briefing",
  { hourUTC: 6, minuteUTC: 0 },
  internal.push.triggerMorningBriefing
);

export default crons;