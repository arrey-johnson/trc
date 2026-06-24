const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-20 w-20 text-2xl",
} as const;

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const sizeClass = SIZES[size];
  const initial = (name || "?")[0]?.toUpperCase() ?? "?";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`shrink-0 rounded-full object-cover ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 ${sizeClass} ${className}`}
      aria-hidden
    >
      {initial}
    </div>
  );
}
