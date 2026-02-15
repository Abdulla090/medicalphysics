import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // Users & Roles
    profiles: defineTable({
        userId: v.string(), // Clerk ID
        fullName: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
    }).index("by_userId", ["userId"]),

    user_roles: defineTable({
        userId: v.string(),
        role: v.union(v.literal("admin"), v.literal("user")),
    }).index("by_userId", ["userId"]),

    // Content
    categories: defineTable({
        id: v.string(), // e.g. "xray", "ct" (manual ID from Supabase enum)
        name: v.string(),
        englishName: v.string(),
        description: v.string(),
        icon: v.optional(v.string()),
    }).index("by_category_id", ["id"]),

    courses: defineTable({
        title: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        difficulty: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
        estimatedDuration: v.optional(v.string()),
        isPublished: v.boolean(),
        orderIndex: v.number(),
    }).index("by_slug", ["slug"]),

    lessons: defineTable({
        title: v.string(),
        slug: v.string(),
        description: v.string(),
        content: v.string(),
        imageStorageId: v.optional(v.id("_storage")),
        imageUrl: v.optional(v.string()),
        videoStorageId: v.optional(v.id("_storage")),
        videoId: v.optional(v.string()),
        duration: v.string(),
        difficulty: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
        category: v.string(), // references categories.id
        instructor: v.string(),
        isPublished: v.boolean(),
        tags: v.optional(v.array(v.string())),
        publishDate: v.optional(v.string()),
    }).index("by_slug", ["slug"])
        .index("by_category", ["category"]),

    course_lessons: defineTable({
        courseId: v.id("courses"),
        lessonId: v.id("lessons"),
        orderIndex: v.number(),
    }).index("by_course", ["courseId"])
        .index("by_lesson", ["lessonId"]),

    // Quizzes
    quizzes: defineTable({
        title: v.string(),
        description: v.optional(v.string()),
        lessonId: v.id("lessons"),
        passingScore: v.number(),
        isPublished: v.boolean(),
    }).index("by_lesson", ["lessonId"]),

    quiz_questions: defineTable({
        quizId: v.id("quizzes"),
        questionText: v.string(),
        questionType: v.string(),
        options: v.any(), // JSON array of options
        correctAnswer: v.string(),
        explanation: v.optional(v.string()),
        orderIndex: v.number(),
    }).index("by_quiz", ["quizId"]),

    // Progress & Activity
    quiz_attempts: defineTable({
        userId: v.string(),
        quizId: v.id("quizzes"),
        score: v.number(),
        passed: v.boolean(),
        answers: v.any(), // JSON of user answers
        startedAt: v.string(),
        completedAt: v.string(),
    }).index("by_user", ["userId"])
        .index("by_quiz", ["quizId"]),

    course_progress: defineTable({
        userId: v.string(),
        courseId: v.id("courses"),
        completed: v.boolean(),
        completedAt: v.optional(v.string()),
        certificateIssued: v.boolean(),
        certificateIssuedAt: v.optional(v.string()),
    }).index("by_user_course", ["userId", "courseId"]),

    lesson_progress: defineTable({
        userId: v.string(),
        lessonId: v.id("lessons"),
        completed: v.boolean(),
        completedAt: v.optional(v.string()),
        progressPercent: v.number(),
    }).index("by_user_lesson", ["userId", "lessonId"])
        .index("by_user", ["userId"]),

    // Bookmarks / Favorites
    bookmarks: defineTable({
        userId: v.string(),
        lessonId: v.id("lessons"),
        createdAt: v.string(),
    }).index("by_user", ["userId"])
        .index("by_user_lesson", ["userId", "lessonId"]),

    // Anatomy Atlas - Imaging Devices
    anatomy_devices: defineTable({
        deviceId: v.string(), // xray, ct, mri, ultrasound
        title: v.string(),
        titleKu: v.string(),
        description: v.string(),
        descriptionKu: v.string(),
        icon: v.string(), // scan, layers, magnet, activity
        color: v.string(), // gradient class
        orderIndex: v.number(),
        isPublished: v.boolean(),
    }).index("by_deviceId", ["deviceId"]),

    // Anatomy Atlas - Parts within devices
    anatomy_parts: defineTable({
        deviceId: v.string(), // references anatomy_devices.deviceId
        partId: v.string(), // unique identifier
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
    }).index("by_deviceId", ["deviceId"])
        .index("by_partId", ["partId"]),

    // Academic Radiology Articles (Blog)
    articles: defineTable({
        title: v.string(),
        slug: v.string(),
        description: v.string(), // excerpt
        content: v.string(), // markdown
        coverImageUrl: v.optional(v.string()),
        coverImageStorageId: v.optional(v.id("_storage")),
        category: v.string(), // e.g. "CT", "MRI", "X-Ray", "Nuclear Medicine"
        author: v.string(),
        isPublished: v.boolean(),
        publishDate: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
    }).index("by_slug", ["slug"])
        .index("by_category", ["category"]),
});
