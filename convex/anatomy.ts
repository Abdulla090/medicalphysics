import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// === Anatomy Devices ===
export const getAnatomyDevices = query({
    args: {},
    handler: async (ctx) => {
        const devices = await ctx.db.query("anatomy_devices").collect();
        return devices.sort((a, b) => a.orderIndex - b.orderIndex);
    },
});

export const getPublishedAnatomyDevices = query({
    args: {},
    handler: async (ctx) => {
        const devices = await ctx.db.query("anatomy_devices").collect();
        return devices
            .filter(d => d.isPublished)
            .sort((a, b) => a.orderIndex - b.orderIndex);
    },
});

export const getAnatomyDeviceById = query({
    args: { deviceId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("anatomy_devices")
            .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
            .first();
    },
});

export const createAnatomyDevice = mutation({
    args: {
        deviceId: v.string(),
        title: v.string(),
        titleKu: v.string(),
        description: v.string(),
        descriptionKu: v.string(),
        icon: v.string(),
        color: v.string(),
        orderIndex: v.number(),
        isPublished: v.boolean(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("anatomy_devices", args);
    },
});

export const updateAnatomyDevice = mutation({
    args: {
        id: v.id("anatomy_devices"),
        deviceId: v.optional(v.string()),
        title: v.optional(v.string()),
        titleKu: v.optional(v.string()),
        description: v.optional(v.string()),
        descriptionKu: v.optional(v.string()),
        icon: v.optional(v.string()),
        color: v.optional(v.string()),
        orderIndex: v.optional(v.number()),
        isPublished: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        return await ctx.db.patch(id, cleanUpdates);
    },
});

export const deleteAnatomyDevice = mutation({
    args: { id: v.id("anatomy_devices") },
    handler: async (ctx, args) => {
        // Also delete all parts for this device
        const device = await ctx.db.get(args.id);
        if (device) {
            const parts = await ctx.db
                .query("anatomy_parts")
                .withIndex("by_deviceId", (q) => q.eq("deviceId", device.deviceId))
                .collect();
            for (const part of parts) {
                if (part.imageStorageId) {
                    await ctx.storage.delete(part.imageStorageId);
                }
                await ctx.db.delete(part._id);
            }
        }
        return await ctx.db.delete(args.id);
    },
});

// === Anatomy Parts ===
export const getAnatomyPartsByDevice = query({
    args: { deviceId: v.string() },
    handler: async (ctx, args) => {
        const parts = await ctx.db
            .query("anatomy_parts")
            .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
            .collect();

        // Resolve storage URLs
        return await Promise.all(parts.map(async (p) => {
            let imageUrl = p.imageUrl;
            if (!imageUrl && p.imageStorageId) {
                imageUrl = await ctx.storage.getUrl(p.imageStorageId) || "";
            }
            return { ...p, imageUrl };
        }));
    },
});

export const getPublishedAnatomyPartsByDevice = query({
    args: { deviceId: v.string() },
    handler: async (ctx, args) => {
        const parts = await ctx.db
            .query("anatomy_parts")
            .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
            .collect();

        const publishedParts = parts.filter(p => p.isPublished);

        return await Promise.all(publishedParts.map(async (p) => {
            let imageUrl = p.imageUrl;
            if (!imageUrl && p.imageStorageId) {
                imageUrl = await ctx.storage.getUrl(p.imageStorageId) || "";
            }
            return { ...p, imageUrl };
        }));
    },
});

export const getAnatomyPartById = query({
    args: { partId: v.string() },
    handler: async (ctx, args) => {
        const part = await ctx.db
            .query("anatomy_parts")
            .withIndex("by_partId", (q) => q.eq("partId", args.partId))
            .first();

        if (!part) return null;

        let imageUrl = part.imageUrl;
        if (!imageUrl && part.imageStorageId) {
            imageUrl = await ctx.storage.getUrl(part.imageStorageId) || "";
        }
        return { ...part, imageUrl };
    },
});

export const createAnatomyPart = mutation({
    args: {
        deviceId: v.string(),
        partId: v.string(),
        title: v.string(),
        titleKu: v.string(),
        description: v.string(),
        descriptionKu: v.string(),
        imageStorageId: v.optional(v.id("_storage")),
        imageUrl: v.optional(v.string()),
        keyStructures: v.array(v.object({ en: v.string(), ku: v.string() })),
        clinicalNotes: v.array(v.object({ en: v.string(), ku: v.string() })),
        orderIndex: v.number(),
        isPublished: v.boolean(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("anatomy_parts", args);
    },
});

export const updateAnatomyPart = mutation({
    args: {
        id: v.id("anatomy_parts"),
        deviceId: v.optional(v.string()),
        partId: v.optional(v.string()),
        title: v.optional(v.string()),
        titleKu: v.optional(v.string()),
        description: v.optional(v.string()),
        descriptionKu: v.optional(v.string()),
        imageStorageId: v.optional(v.id("_storage")),
        imageUrl: v.optional(v.string()),
        keyStructures: v.optional(v.array(v.object({ en: v.string(), ku: v.string() }))),
        clinicalNotes: v.optional(v.array(v.object({ en: v.string(), ku: v.string() }))),
        orderIndex: v.optional(v.number()),
        isPublished: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        return await ctx.db.patch(id, cleanUpdates);
    },
});

export const deleteAnatomyPart = mutation({
    args: { id: v.id("anatomy_parts") },
    handler: async (ctx, args) => {
        const part = await ctx.db.get(args.id);
        if (part?.imageStorageId) {
            await ctx.storage.delete(part.imageStorageId);
        }
        return await ctx.db.delete(args.id);
    },
});

// Generate upload URL for anatomy images
export const generateAnatomyUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});
