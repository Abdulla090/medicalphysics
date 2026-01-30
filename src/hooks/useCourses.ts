import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

export interface Course {
    _id: Id<"courses">;
    _creationTime: number;
    title: string;
    slug: string;
    description?: string;
    imageUrl?: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    estimatedDuration?: string;
    isPublished: boolean;
    orderIndex: number;
}

export interface CourseWithLessons extends Course {
    lesson_count: number;
}

export const useCourses = () => {
    const allCourses = useQuery(api.api.getCourses);

    // Note: For now, we are returning the simple list.
    // In a more complex setup, you'd join with course_lessons in Convex.
    // But let's keep it simple and compatible for now.

    const isLoading = allCourses === undefined;

    const coursesWithCounts = allCourses?.map(course => ({
        ...course,
        lesson_count: 0 // We'll update this logic when you have more lessons linked
    })) as CourseWithLessons[] | undefined;

    return {
        courses: coursesWithCounts,
        isLoading
    };
};
