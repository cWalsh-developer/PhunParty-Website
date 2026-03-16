import React from "react";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: "rectangular" | "circular" | "text";
  children?: React.ReactNode;
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  width,
  height,
  variant = "rectangular",
  children,
}) => {
  const baseClasses = "animate-pulse bg-ink-600";

  const variantClasses = {
    rectangular: "rounded-xl",
    circular: "rounded-full",
    text: "rounded-md",
  };

  const style: React.CSSProperties = {
    width: width ?? (variant === "text" ? "100%" : undefined),
    height: height ?? (variant === "text" ? "1em" : undefined),
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    >
      {children}
    </div>
  );
};

// Pre-built skeleton components for common patterns
export const ProfileSkeleton = () => (
  <div className="grid md:grid-cols-2 gap-4">
    <div>
      <Skeleton height="1em" width="30%" className="mb-1" variant="text" />
      <Skeleton height="1.5em" width="80%" variant="text" />
    </div>
    <div>
      <Skeleton height="1em" width="40%" className="mb-1" variant="text" />
      <Skeleton height="1.5em" width="70%" variant="text" />
    </div>
    <div>
      <Skeleton height="1em" width="35%" className="mb-1" variant="text" />
      <Skeleton height="1.5em" width="60%" variant="text" />
    </div>
    <div>
      <Skeleton height="1em" width="25%" className="mb-1" variant="text" />
      <Skeleton height="1.5em" width="50%" variant="text" />
    </div>
  </div>
);

export const GameListSkeleton = () => (
  <div className="space-y-2">
    {[1, 2, 3].map((i) => (
      <div key={i} className="px-3 py-2 bg-ink-700 rounded-xl">
        <Skeleton height="1.2em" width="60%" variant="text" className="mb-1" />
        <Skeleton height="0.8em" width="80%" variant="text" />
      </div>
    ))}
  </div>
);

export default Skeleton;
