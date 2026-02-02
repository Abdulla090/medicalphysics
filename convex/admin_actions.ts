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

// === COURSES ===
export const createCourse = mutation({
    args: {
        title: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        difficulty: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
        estimatedDuration: v.optional(v.string()),
        isPublished: v.boolean(),
        orderIndex: v.number(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.query("courses")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();
        if (existing) throw new Error("Duplicate slug");
        return await ctx.db.insert("courses", args);
    },
});

export const updateCourse = mutation({
    args: {
        id: v.id("courses"),
        title: v.optional(v.string()),
        slug: v.optional(v.string()),
        description: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        difficulty: v.optional(v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced"))),
        estimatedDuration: v.optional(v.string()),
        isPublished: v.optional(v.boolean()),
        orderIndex: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        return await ctx.db.patch(id, cleanUpdates);
    },
});

export const deleteCourse = mutation({
    args: { id: v.id("courses") },
    handler: async (ctx, args) => {
        // Delete course-lesson associations
        const courseLessons = await ctx.db.query("course_lessons")
            .withIndex("by_course", (q) => q.eq("courseId", args.id))
            .collect();
        for (const cl of courseLessons) {
            await ctx.db.delete(cl._id);
        }
        await ctx.db.delete(args.id);
    },
});

export const addLessonToCourse = mutation({
    args: {
        courseId: v.id("courses"),
        lessonId: v.id("lessons"),
        orderIndex: v.number(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("course_lessons", args);
    },
});

export const removeLessonFromCourse = mutation({
    args: { id: v.id("course_lessons") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

// === QUIZZES ===
export const createQuiz = mutation({
    args: {
        title: v.string(),
        description: v.optional(v.string()),
        lessonId: v.id("lessons"),
        passingScore: v.number(),
        isPublished: v.boolean(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("quizzes", args);
    },
});

export const updateQuiz = mutation({
    args: {
        id: v.id("quizzes"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        lessonId: v.optional(v.id("lessons")),
        passingScore: v.optional(v.number()),
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

export const deleteQuiz = mutation({
    args: { id: v.id("quizzes") },
    handler: async (ctx, args) => {
        // Delete quiz questions
        const questions = await ctx.db.query("quiz_questions")
            .withIndex("by_quiz", (q) => q.eq("quizId", args.id))
            .collect();
        for (const q of questions) {
            await ctx.db.delete(q._id);
        }
        await ctx.db.delete(args.id);
    },
});

export const createQuizQuestion = mutation({
    args: {
        quizId: v.id("quizzes"),
        questionText: v.string(),
        questionType: v.string(),
        options: v.any(),
        correctAnswer: v.string(),
        explanation: v.optional(v.string()),
        orderIndex: v.number(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("quiz_questions", args);
    },
});

export const updateQuizQuestion = mutation({
    args: {
        id: v.id("quiz_questions"),
        questionText: v.optional(v.string()),
        questionType: v.optional(v.string()),
        options: v.optional(v.any()),
        correctAnswer: v.optional(v.string()),
        explanation: v.optional(v.string()),
        orderIndex: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        return await ctx.db.patch(id, cleanUpdates);
    },
});

export const deleteQuizQuestion = mutation({
    args: { id: v.id("quiz_questions") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

export const deleteCategory = mutation({
    args: { id: v.string() },
    handler: async (ctx, args) => {
        const existing = await ctx.db.query("categories")
            .withIndex("by_category_id", (q) => q.eq("id", args.id))
            .first();
        if (existing) {
            await ctx.db.delete(existing._id);
        }
    },
});

