import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listCompleted = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_type", (q) => q.eq("type", "completed"))
      .order("desc")
      .collect();
  },
});

export const listUpcoming = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_type", (q) => q.eq("type", "upcoming"))
      .order("desc")
      .collect();
  },
});

export const createProject = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    location: v.string(),
    trade: v.string(),
    budget: v.optional(v.number()),
    type: v.union(v.literal("completed"), v.literal("upcoming")),
    status: v.string(),
    startDate: v.optional(v.string()),
    completionDate: v.optional(v.string()),
    clientName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") throw new Error("Admin only");

    await ctx.db.insert("projects", {
      ...args,
      createdAt: Date.now(),
      createdBy: userId,
    });
  },
});
