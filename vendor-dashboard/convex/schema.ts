import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.string(),
    email: v.string(),
    company: v.string(),
    phone: v.string(),
    role: v.union(v.literal("vendor"), v.literal("admin")),
    isApproved: v.boolean(),
  }).index("email", ["email"]),

  projects: defineTable({
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
    createdAt: v.number(),
    createdBy: v.id("users"),
  }).index("by_type", ["type"]),

  bids: defineTable({
    projectId: v.id("projects"),
    vendorId: v.id("users"),
    amount: v.number(),
    notes: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("rejected")),
    createdAt: v.number(),
  })
    .index("vendorId", ["vendorId"])
    .index("projectId", ["projectId"]),
});
