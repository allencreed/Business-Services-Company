import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listMyBids = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("bids")
      .withIndex("vendorId", (q) => q.eq("vendorId", userId))
      .order("desc")
      .collect();
  },
});

export const listBidsForProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bids")
      .withIndex("projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const submitBid = mutation({
  args: {
    projectId: v.id("projects"),
    amount: v.number(),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("bids")
      .withIndex("vendorId", (q) => q.eq("vendorId", userId))
      .collect();

    const alreadyBid = existing.find((b) => b.projectId === args.projectId);
    if (alreadyBid) throw new Error("You have already bid on this project");

    await ctx.db.insert("bids", {
      projectId: args.projectId,
      vendorId: userId,
      amount: args.amount,
      notes: args.notes,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const updateBidStatus = mutation({
  args: {
    bidId: v.id("bids"),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") throw new Error("Admin only");
    await ctx.db.patch(args.bidId, { status: args.status });
  },
});
