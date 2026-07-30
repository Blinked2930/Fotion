import { query, mutation } from "./_generated/server";

export const getDebugInfo = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    const tasks = await ctx.db.query("tasks").collect();
    return { projects, tasks };
  }
});
