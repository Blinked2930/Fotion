import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// The real daily briefing (Fires at 7:00 AM UTC / 9:00 AM Local)
crons.daily(
  "Send morning briefing",
  { hourUTC: 7, minuteUTC: 0 },
  internal.push.triggerMorningBriefing
);

export default crons;