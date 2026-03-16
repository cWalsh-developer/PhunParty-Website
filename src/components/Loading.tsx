import React from "react";

interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg";
    color?: "primary" | "white" | "gray";
    className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = "md",
    color = "primary",
    className = "",
}) => {
    const sizeClasses = {
        sm: "w-4 h-4",
        md: "w-6 h-6",
        lg: "w-8 h-8",
    };

    const colorClasses = {
        primary: "border-tea-500 border-t-transparent",
        white: "border-white border-t-transparent",
        gray: "border-gray-400 border-t-transparent",
    };

    return (
        <div
            className={`
                animate-spin rounded-full border-2
                ${sizeClasses[size]}
                ${colorClasses[color]}
                ${className}
            `}
            role="status"
            aria-label="Loading"
        >
            <span className="sr-only">Loading...</span>
        </div>
    );
};

interface LoadingStateProps {
    message?: string;
    showSpinner?: boolean;
    className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
    message = "Loading...",
    showSpinner = true,
    className = "",
}) => {
    return (
        <div
            className={`flex flex-col items-center justify-center py-8 ${className}`}
        >
            {showSpinner && <LoadingSpinner size="lg" className="mb-3" />}
            <p className="text-stone-400 text-sm">{message}</p>
        </div>
    );
};

interface LoadingButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    loadingText?: string;
    children: React.ReactNode;
    variant?: "primary" | "secondary" | "ghost";
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
    isLoading = false,
    loadingText,
    children,
    variant = "primary",
    className = "",
    disabled,
    ...props
}) => {
    const baseClasses =
        "px-5 py-3 rounded-2xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";

    const variantClasses = {
        primary: "bg-tea-500 text-ink-900 hover:bg-tea-400",
        secondary: "bg-ink-700 text-stone-300 hover:bg-ink-600",
        ghost: "bg-transparent text-stone-300 hover:bg-ink-700",
    };

    return (
        <button
            {...props}
            disabled={disabled || isLoading}
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        >
            {isLoading && (
                <LoadingSpinner
                    size="sm"
                    color={variant === "primary" ? "gray" : "white"}
                />
            )}
            {isLoading ? loadingText || "Loading..." : children}
        </button>
    );
};
