import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

export const createLesson = mutation({
    args: {
        title: v.string(),
        slug: v.string(),
        description: v.string(),
        content: v.string(),
        imageUrl: v.optional(v.string()),
        imageStorageId: v.optional(v.id("_storage")),
        videoId: v.optional(v.string()),
        videoStorageId: v.optional(v.id("_storage")),
        duration: v.string(),
        difficulty: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
        category: v.string(),
        instructor: v.string(),
        isPublished: v.boolean(),
        tags: v.optional(v.array(v.string())),
        publishDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Check for duplicate slug
        const existing = await ctx.db.query("lessons")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();

        if (existing) {
            throw new Error("Duplicate slug");
        }

        return await ctx.db.insert("lessons", args);
    },
});

export const updateLesson = mutation({
    args: {
        id: v.id("lessons"),
        title: v.string(),
        slug: v.string(),
        description: v.string(),
        content: v.string(),
        imageUrl: v.optional(v.string()),
        imageStorageId: v.optional(v.id("_storage")),
        videoId: v.optional(v.string()),
        videoStorageId: v.optional(v.id("_storage")),
        duration: v.string(),
        difficulty: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
        category: v.string(),
        instructor: v.string(),
        isPublished: v.boolean(),
        tags: v.optional(v.array(v.string())),
        publishDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        return await ctx.db.patch(id, updates);
    }
});

export const createCategory = mutation({
    args: {
        id: v.string(), // "xray", "ct"
        name: v.string(),
        englishName: v.string(),
        description: v.string(),
        icon: v.string(),
    },
    handler: async (ctx, args) => {
        // Check for duplicate ID
        const existing = await ctx.db.query("categories")
            .withIndex("by_category_id", (q) => q.eq("id", args.id))
            .first();

        if (existing) {
            throw new Error("Duplicate category ID");
        }

        return await ctx.db.insert("categories", args);
    },
});

export const updateCategory = mutation({
    args: {
        id: v.string(), // The ID string itself (e.g. "xray")
        updates: v.object({
            name: v.optional(v.string()),
            englishName: v.optional(v.string()),
            description: v.optional(v.string()),
            icon: v.optional(v.string()),
        })
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.query("categories")
            .withIndex("by_category_id", (q) => q.eq("id", args.id))
            .first();

        if (!existing) {
            throw new Error("Category not found");
        }

        return await ctx.db.patch(existing._id, args.updates);
    },
});

export const deleteLesson = mutation({
    args: { id: v.id("lessons") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
