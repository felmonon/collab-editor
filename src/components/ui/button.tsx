"use client";

import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant =
  "primary" | "secondary" | "outline" | "ghost" | "danger" | "oauth";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-gray-900 text-white
    hover:bg-gray-800 active:bg-gray-950
    focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2
    disabled:bg-gray-300 disabled:text-gray-500
    shadow-sm hover:shadow
  `,
  secondary: `
    bg-sky-500 text-white
    hover:bg-sky-600 active:bg-sky-700
    focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2
    disabled:bg-sky-200 disabled:text-sky-400
    shadow-sm hover:shadow
  `,
  outline: `
    bg-white text-gray-700 border-2 border-gray-200
    hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100
    focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2
    disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200
  `,
  ghost: `
    bg-transparent text-gray-700
    hover:bg-gray-100 active:bg-gray-200
    focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2
    disabled:text-gray-400 disabled:hover:bg-transparent
  `,
  danger: `
    bg-red-500 text-white
    hover:bg-red-600 active:bg-red-700
    focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2
    disabled:bg-red-200 disabled:text-red-400
    shadow-sm hover:shadow
  `,
  oauth: `
    bg-white text-gray-700 border border-gray-200
    hover:bg-gray-50 hover:border-gray-300 hover:shadow-md active:bg-gray-100
    focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2
    disabled:bg-gray-50 disabled:text-gray-400
    shadow-sm
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-sm gap-1.5 rounded-lg",
  md: "px-4 py-2.5 text-sm gap-2 rounded-xl",
  lg: "px-6 py-3.5 text-base gap-2.5 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconPosition = "left",
      fullWidth = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center
          font-medium
          transition-all duration-200
          disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Please wait...</span>
          </>
        ) : (
          <>
            {icon && iconPosition === "left" && icon}
            {children}
            {icon && iconPosition === "right" && icon}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

// Social OAuth Buttons with proper branding
interface OAuthButtonProps extends Omit<ButtonProps, "variant" | "icon"> {
  provider: "google" | "github";
}

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
    />
  </svg>
);

export function OAuthButton({
  provider,
  size = "lg",
  fullWidth = true,
  loading,
  ...props
}: OAuthButtonProps) {
  return (
    <Button
      {...props}
      variant={provider === "github" ? "primary" : "oauth"}
      size={size}
      fullWidth={fullWidth}
      loading={loading}
      icon={
        provider === "github" ? (
          <GitHubIcon className="w-5 h-5" />
        ) : (
          <GoogleIcon className="w-5 h-5" />
        )
      }
    >
      Continue with {provider === "github" ? "GitHub" : "Google"}
    </Button>
  );
}
