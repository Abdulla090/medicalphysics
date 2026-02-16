import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, Check, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface LessonActionsProps {
    lessonId: Id<"lessons">;
    variant?: "full" | "compact";
    className?: string;
}

const LessonActions = ({ lessonId, variant = "full", className }: LessonActionsProps) => {
    const { user } = useAuth();
    const userId = user?.id;

    const [loadingBookmark, setLoadingBookmark] = useState(false);
    const [loadingComplete, setLoadingComplete] = useState(false);

    // Queries
    const isBookmarked = useQuery(
        api.api.isLessonBookmarked,
        userId ? { userId, lessonId } : "skip"
    );
    const isCompleted = useQuery(
        api.api.isLessonCompleted,
        userId ? { userId, lessonId } : "skip"
    );

    // Mutations
    const addBookmark = useMutation(api.api.addBookmark);
    const removeBookmark = useMutation(api.api.removeBookmark);
    const markComplete = useMutation(api.api.markLessonComplete);
    const unmarkComplete = useMutation(api.api.unmarkLessonComplete);

    const handleToggleBookmark = async () => {
        if (!userId) return;
        setLoadingBookmark(true);
        try {
            if (isBookmarked) {
                await removeBookmark({ userId, lessonId });
            } else {
                await addBookmark({ userId, lessonId });
            }
        } finally {
            setLoadingBookmark(false);
        }
    };

    const handleToggleComplete = async () => {
        if (!userId) return;
        setLoadingComplete(true);
        try {
            if (isCompleted) {
                await unmarkComplete({ userId, lessonId });
            } else {
                await markComplete({ userId, lessonId });
            }
        } finally {
            setLoadingComplete(false);
        }
    };

    if (!user) {
        return null; // Don't show actions for unauthenticated users
    }

    if (variant === "compact") {
        return (
            <div className={cn("flex gap-2", className)}>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleBookmark}
                    disabled={loadingBookmark}
                    className={cn(
                        "h-8 w-8",
                        isBookmarked && "text-yellow-500 hover:text-yellow-600"
                    )}
                    title={isBookmarked ? "لاببرە" : "پاشەکەوتبکە"}
                >
                    {loadingBookmark ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isBookmarked ? (
                        <BookmarkCheck className="h-4 w-4" />
                    ) : (
                        <Bookmark className="h-4 w-4" />
                    )}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleComplete}
                    disabled={loadingComplete}
                    className={cn(
                        "h-8 w-8",
                        isCompleted && "text-green-500 hover:text-green-600"
                    )}
                    title={isCompleted ? "تەواو نەکراوە" : "تەواوکراوە"}
                >
                    {loadingComplete ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCompleted ? (
                        <CheckCircle2 className="h-4 w-4" />
                    ) : (
                        <Check className="h-4 w-4" />
                    )}
                </Button>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-wrap gap-3", className)}>
            <Button
                variant={isBookmarked ? "default" : "outline"}
                onClick={handleToggleBookmark}
                disabled={loadingBookmark}
                className={cn(
                    "gap-2",
                    isBookmarked && "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
                )}
            >
                {loadingBookmark ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : isBookmarked ? (
                    <BookmarkCheck className="h-4 w-4" />
                ) : (
                    <Bookmark className="h-4 w-4" />
                )}
                {isBookmarked ? "پاشەکەوتکراوە" : "پاشەکەوت"}
            </Button>

            <Button
                variant={isCompleted ? "default" : "outline"}
                onClick={handleToggleComplete}
                disabled={loadingComplete}
                className={cn(
                    "gap-2",
                    isCompleted && "bg-green-500 hover:bg-green-600 text-white border-green-500"
                )}
            >
                {loadingComplete ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                ) : (
                    <Check className="h-4 w-4" />
                )}
                {isCompleted ? "تەواوکراوە" : "وەک تەواوکراو نیشانبکە"}
            </Button>
        </div>
    );
};

export default LessonActions;
