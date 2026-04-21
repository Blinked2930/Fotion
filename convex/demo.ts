import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const seedDemoData = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    // FIX: Strictly parse out ONLY the base ID. Ignore VIP tokens.
    const actualSessionId = args.sessionId.split("||vip_")[0];

    // 1. SECURITY CHECK: Silently exit if this is a VIP or Admin 
    // instead of throwing an error, so we don't break page loads.
    if (!actualSessionId.startsWith("demo_user_")) {
      return false; 
    }

    // 2. Build the Foundation (Projects)
    // FIX: Using the parsed base ID so the projects actually appear for the demo user
    const project1 = await ctx.db.insert("projects", { 
      name: "🚀 Portfolio Build", 
      isArchived: false,
      sessionId: actualSessionId 
    });
    
    const project2 = await ctx.db.insert("projects", { 
      name: "💡 Q4 Roadmap", 
      isArchived: false,
      sessionId: actualSessionId 
    });

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // 3. Inject the Curated Tasks
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
      sessionId: actualSessionId,
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
      sessionId: actualSessionId,
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
      sessionId: actualSessionId,
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
      sessionId: actualSessionId,
      status: "todo",
    });

    await ctx.db.insert("tasks", {
      title: "Deploy database schema to production",
      isUrgent: true,
      isImportant: true,
      isForFunsies: false,
      isToday: false,
      listCategory: "Current",
      sessionId: actualSessionId,
      status: "done",
      completedAt: now - (oneDay * 1),
    });

    return true;
  },
});

export const cleanupOldDemos = internalMutation({
  handler: async (ctx) => {
    const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - FORTY_EIGHT_HOURS;

    const allTasks = await ctx.db.query("tasks").collect();
    const deadTasks = allTasks.filter(task => 
      task._creationTime < cutoffTime && 
      task.sessionId?.startsWith("demo_user_")
    );

    for (const task of deadTasks) {
      await ctx.db.delete(task._id);
    }

    const allProjects = await ctx.db.query("projects").collect();
    const deadProjects = allProjects.filter(project => 
      project._creationTime < cutoffTime && 
      project.sessionId?.startsWith("demo_user_")
    );

    for (const project of deadProjects) {
      await ctx.db.delete(project._id);
    }
  },
});