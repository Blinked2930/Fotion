import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedDemoData = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    // 1. SECURITY CHECK: Strictly enforce the demo prefix
    // This ensures this function can never accidentally corrupt or overwrite VIP guest data.
    if (!args.sessionId.startsWith("demo_user_")) {
      throw new Error("Invalid demo session ID. Must use the demo_user_ prefix.");
    }

    // 2. Build the Foundation (Projects)
    const project1 = await ctx.db.insert("projects", { name: "🚀 Portfolio Build" });
    const project2 = await ctx.db.insert("projects", { name: "💡 Q4 Roadmap" });

    // Time math for realistic due dates
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // 3. Inject the Curated Tasks
    
    // Task A: The "Overdue" Task (Forces the red UI and pushes to Today view)
    await ctx.db.insert("tasks", {
      title: "Fix responsive layout bugs on mobile",
      description: "<p>The navigation menu is clipping on screens smaller than 375px. Needs to be resolved before the final launch.</p>",
      isUrgent: true,
      isImportant: true,
      isForFunsies: false,
      isToday: false,
      listCategory: "Current",
      doByDate: now - (oneDay * 2), // Overdue by 2 days
      projectId: project1,
      sessionId: args.sessionId,
      status: "todo",
    });

    // Task B: The "Interactive" Task (Showcases the TipTap checklist sorter)
    await ctx.db.insert("tasks", {
      title: "Prepare portfolio launch materials",
      description: `<ul data-type="taskList">
        <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Write GitHub README</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Record a 60-second Loom demo</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Capture high-res screenshots</p></div></li>
        <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Set up custom domain</p></div></li>
      </ul>`,
      isUrgent: false,
      isImportant: true,
      isForFunsies: false,
      isToday: true, // Pushes it to the Today view
      listCategory: "Current",
      projectId: project1,
      sessionId: args.sessionId,
      status: "in-progress",
    });

    // Task C: The "Waiting For" Task (Showcases pipeline filtering)
    await ctx.db.insert("tasks", {
      title: "Review branding assets from design team",
      isUrgent: false,
      isImportant: false,
      isForFunsies: false,
      isToday: false,
      listCategory: "Waiting For",
      doOnDate: now + (oneDay * 3), // Scheduled for the future
      sessionId: args.sessionId,
      status: "todo",
    });

    // Task D: The "Someday/Maybe" Task (Showcases funsies tag)
    await ctx.db.insert("tasks", {
      title: "Learn Three.js for 3D interactions",
      description: "<p>It would be awesome to add an interactive 3D element to the hero section eventually.</p>",
      isUrgent: false,
      isImportant: false,
      isForFunsies: true,
      isToday: false,
      listCategory: "Someday Maybe",
      projectId: project2,
      sessionId: args.sessionId,
      status: "todo",
    });

    // Task E: A standard "Done" task (Showcases completed UI)
    await ctx.db.insert("tasks", {
      title: "Deploy database schema to production",
      isUrgent: true,
      isImportant: true,
      isForFunsies: false,
      isToday: false,
      listCategory: "Current",
      sessionId: args.sessionId,
      status: "done",
      completedAt: now - (oneDay * 1), // Completed yesterday
    });

    return true; // Success!
  },
});