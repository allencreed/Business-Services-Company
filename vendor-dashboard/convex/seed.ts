import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import { createAccount, modifyAccountCredentials } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

export const seedProjects = mutation({
  args: {
    adminId: v.id("users"),
    vendorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("projects").first();
    if (existing) return { skipped: true };

    const now = Date.now();

    const p1 = await ctx.db.insert("projects", {
      title: "Parking Lot Striping - Northpoint Mall",
      description: "Complete restriping of 500-space parking lot including accessible parking markings.",
      location: "Northpoint Mall, Alpharetta, GA",
      trade: "Striping",
      budget: 15000,
      type: "completed",
      status: "completed",
      completionDate: "2026-04-15",
      clientName: "Northpoint Management",
      createdAt: now - 86400000 * 60,
      createdBy: args.adminId,
    });

    const p2 = await ctx.db.insert("projects", {
      title: "HVAC Maintenance - Tech Park",
      description: "Routine HVAC maintenance and filter replacement across 3 office buildings.",
      location: "Peachtree Corners Tech Park, Norcross, GA",
      trade: "HVAC",
      budget: 8500,
      type: "completed",
      status: "completed",
      completionDate: "2026-05-01",
      clientName: "Tech Park Management",
      createdAt: now - 86400000 * 40,
      createdBy: args.adminId,
    });

    const p3 = await ctx.db.insert("projects", {
      title: "Exterior Cleaning - Downtown Complex",
      description: "Pressure washing, window cleaning, and facade restoration for 4-story commercial building.",
      location: "100 Peachtree Street, Atlanta, GA",
      trade: "Exterior Cleaning",
      budget: 22000,
      type: "upcoming",
      status: "open",
      startDate: "2026-07-01",
      clientName: "Downtown Properties LLC",
      createdAt: now - 86400000 * 5,
      createdBy: args.adminId,
    });

    const p4 = await ctx.db.insert("projects", {
      title: "Safety Compliance Audit - Industrial Zone",
      description: "Comprehensive OSHA compliance audit and remediation plan for 5 warehouse facilities.",
      location: "South Atlanta Industrial Park, Atlanta, GA",
      trade: "Safety & Compliance",
      budget: 12000,
      type: "upcoming",
      status: "open",
      startDate: "2026-06-15",
      clientName: "Industrial Holdings Group",
      createdAt: now - 86400000 * 2,
      createdBy: args.adminId,
    });

    await ctx.db.insert("bids", {
      projectId: p3,
      vendorId: args.vendorId,
      amount: 21500,
      notes: "Can start within 2 weeks. Experienced with similar downtown projects.",
      status: "pending",
      createdAt: now - 86400000,
    });

    await ctx.db.insert("bids", {
      projectId: p4,
      vendorId: args.vendorId,
      amount: 11800,
      notes: "Certified OSHA compliance specialist on staff.",
      status: "pending",
      createdAt: now - 86400000,
    });

    return { skipped: false, projects: [p1, p2, p3, p4] };
  },
});

export const seed = action({
  args: {},
  handler: async (ctx) => {
    const adminEmail = "admin@imperiuminfra.com";
    const vendorEmail = "vendor@example.com";
    const password = "sheldon";

    const existingAdmin = await ctx.runQuery(api.users.getUserByEmail, { email: adminEmail });
    let adminId: string;
    if (!existingAdmin) {
      const result = await createAccount(ctx, {
        provider: "password",
        account: { id: adminEmail, secret: password },
        profile: {
          name: "admin",
          email: adminEmail,
          company: "Imperium Infrastructure Partners",
          phone: "(404) 302-7038",
          role: "admin",
          isApproved: true,
        },
      });
      adminId = result.user._id;
    } else {
      adminId = existingAdmin._id;
    }

    const existingVendor = await ctx.runQuery(api.users.getUserByEmail, { email: vendorEmail });
    let vendorId: string;
    if (!existingVendor) {
      const result = await createAccount(ctx, {
        provider: "password",
        account: { id: vendorEmail, secret: password },
        profile: {
          name: "ABC Construction Co.",
          email: vendorEmail,
          company: "ABC Construction Co.",
          phone: "(555) 123-4567",
          role: "vendor",
          isApproved: true,
        },
      });
      vendorId = result.user._id;
    } else {
      vendorId = existingVendor._id;
    }

    const result = await ctx.runMutation(api.seed.seedProjects, {
      adminId: adminId as any,
      vendorId: vendorId as any,
    });

    return { ...result, adminId, vendorId, adminEmail, vendorEmail, password };
  },
});

export const updateAdminPassword = action({
  args: {},
  handler: async (ctx) => {
    const email = "admin@imperiuminfra.com";
    const newPassword = "sheldon";
    const newName = "admin";

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: email, secret: newPassword },
    });

    const user = await ctx.runQuery(api.users.getUserByEmail, { email });
    if (user) {
      await ctx.runMutation(api.seed.updateUserName, { userId: user._id, name: newName });
    }

    return { email, newPassword, newName };
  },
});

export const updateUserName = mutation({
  args: { userId: v.id("users"), name: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { name: args.name });
  },
});
