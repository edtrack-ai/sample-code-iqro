import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface LessonCardSkeletonProps {
  count?: number;
}

export function LessonCardSkeleton({ count = 3 }: LessonCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="glass-card flex items-center gap-4 px-6 py-4"
        >
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <Skeleton className="h-8 w-16 rounded-md" />
        </motion.div>
      ))}
    </>
  );
}
