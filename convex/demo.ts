import { mutation, internalMutation } from "./_generated/server"; // UPDATED IMPORT
import { v } from "convex/values";

export const seedDemoData = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    if (!args.sessionId.startsWith("demo_user_")) {
      throw new Error("Invalid demo session ID. Must use the demo_user_ prefix.");
    }

    const project1 = await ctx.db.insert("projects", { name: "🚀 Portfolio Build" });
    const project2 = await ctx.db.insert("projects", { name: "💡 Q4 Roadmap" });

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    await ctx.db.insert("tasks", {
      title: "Fix responsive layout bugs on mobile",
      description: "<p>The navigation menu is clipping on screens smaller than 375px. Needs to be resolved before the final launch.</p>",
      isUrgent: true,
      isImportant: true,
      isForFunsies: false,
      isToday: false,
      listCategory: "Current",
      doByDate: now - (oneDay * 2), 
      projectId: project1,
      sessionId: args.sessionId,
      status: "todo",
    });

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
      isToday: true, 
      listCategory: "Current",
      projectId: project1,
      sessionId: args.sessionId,
      status: "in-progress",
    });

    await ctx.db.insert("tasks", {
      title: "Review branding assets from design team",
      isUrgent: false,
      isImportant: false,
      isForFunsies: false,
      isToday: false,
      listCategory: "Waiting For",
      doOnDate: now + (oneDay * 3), 
      sessionId: args.sessionId,
      status: "todo",
    });

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

    await ctx.db.insert("tasks", {
      title: "Deploy database schema to production",
      isUrgent: true,
      isImportant: true,
      isForFunsies: false,
      isToday: false,
      listCategory: "Current",
      sessionId: args.sessionId,
      status: "done",
      completedAt: now - (oneDay * 1), 
    });

    return true; 
  },
});

// NEW: The Janitor Function
export const cleanupOldDemos = internalMutation({
  handler: async (ctx) => {
    const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - FORTY_EIGHT_HOURS;

    // Grab all tasks currently in the database
    const allTasks = await ctx.db.query("tasks").collect();

    // Filter down to ONLY the tasks that are both old AND belong to a demo user
    // (Your VIP guest tasks and personal auth tasks are perfectly safe!)
    const deadTasks = allTasks.filter(task => 
      task._creationTime < cutoffTime && 
      task.sessionId?.startsWith("demo_user_")
    );

    // Sweep them out of the matrix forever
    for (const task of deadTasks) {
      await ctx.db.delete(task._id);
    }
  },
});