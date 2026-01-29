import { cn } from "@/lib/utils";

interface SkeletonProps {
    className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => (
    <div className={cn("animate-pulse bg-muted/50 rounded-lg", className)} />
);

export const LessonCardSkeleton = () => (
    <div className="rounded-2xl overflow-hidden border border-border/50 bg-card">
        <Skeleton className="aspect-video w-full" />
        <div className="p-4 space-y-3">
            <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
            </div>
        </div>
    </div>
);

export const CategoryCardSkeleton = () => (
    <div className="rounded-2xl overflow-hidden border border-border/50 bg-card p-6">
        <Skeleton className="h-12 w-12 rounded-xl mb-4" />
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
    </div>
);

export const StatCardSkeleton = () => (
    <div className="p-6 rounded-2xl bg-card/50 border border-border/50 text-center">
        <Skeleton className="h-12 w-16 mx-auto mb-2" />
        <Skeleton className="h-4 w-20 mx-auto" />
    </div>
);

export const LessonDetailSkeleton = () => (
    <div className="space-y-6">
        <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-full" />
        <div className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <div className="space-y-4 p-6 border rounded-2xl">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
        </div>
    </div>
);
