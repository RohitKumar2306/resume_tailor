import { cn } from "@/lib/utils"

interface ATSScoreBadgeProps {
  score: number
  size?: "sm" | "lg"
}

export default function ATSScoreBadge({ score, size = "sm" }: ATSScoreBadgeProps) {
  const colorClass =
    score >= 95
      ? "bg-green-100 text-green-700 border-green-300"
      : score >= 90
        ? "bg-amber-100 text-amber-700 border-amber-300"
        : "bg-red-100 text-red-700 border-red-300"

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full border font-bold",
        colorClass,
        size === "lg" ? "h-20 w-20 text-2xl" : "h-10 w-10 text-sm"
      )}
    >
      {score}
    </div>
  )
}
