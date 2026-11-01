"use client";

import { forwardRef, useState, InputHTMLAttributes, ReactNode } from "react";
import { Eye, EyeOff, Check, X, AlertCircle } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  hint?: string;
  icon?: ReactNode;
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      success,
      hint,
      icon,
      showPasswordToggle,
      type,
      className = "",
      id,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const isPassword = type === "password";
    const actualType = isPassword && showPassword ? "text" : type;

    const baseInputClass = `
      w-full px-4 py-3.5
      bg-white border rounded-lg
      text-gray-900 placeholder-gray-400
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-0
      disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    `;

    const stateClass = error
      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
      : success
        ? "border-green-300 focus:border-green-500 focus:ring-green-200"
        : "border-[#e0e3eb] focus:border-[#315BEE] focus:ring-[#315BEE]/10 hover:border-[#b9bfcc]";

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={actualType}
            className={`
              ${baseInputClass}
              ${stateClass}
              ${icon ? "pl-11" : ""}
              ${isPassword && showPasswordToggle ? "pr-20" : ""}
              ${error ? "animate-shake" : ""}
              ${className}
            `}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            {...props}
          />
          {isPassword && showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          )}
          {!isPassword && (error || success) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {error ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : (
                <Check className="w-5 h-5 text-green-500" />
              )}
            </div>
          )}
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-red-600 flex items-center gap-1.5"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-sm text-gray-500">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

// Password Strength Indicator
interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const getStrength = (
    pwd: string,
  ): { level: number; label: string; color: string } => {
    if (!pwd) return { level: 0, label: "", color: "" };

    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 1) return { level: 1, label: "Weak", color: "bg-red-500" };
    if (score === 2) return { level: 2, label: "Fair", color: "bg-orange-500" };
    if (score === 3) return { level: 3, label: "Good", color: "bg-sky-500" };
    return { level: 4, label: "Strong", color: "bg-green-500" };
  };

  const strength = getStrength(password);

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              level <= strength.level ? strength.color : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">Password strength:</span>
        <span
          className={`text-xs font-medium ${
            strength.level <= 1
              ? "text-red-600"
              : strength.level === 2
                ? "text-orange-600"
                : strength.level === 3
                  ? "text-sky-600"
                  : "text-green-600"
          }`}
        >
          {strength.label}
        </span>
      </div>
      <ul className="text-xs text-gray-500 space-y-1">
        <li
          className={`flex items-center gap-1.5 ${password.length >= 8 ? "text-green-600" : ""}`}
        >
          {password.length >= 8 ? (
            <Check className="w-3 h-3" />
          ) : (
            <X className="w-3 h-3" />
          )}
          At least 8 characters
        </li>
        <li
          className={`flex items-center gap-1.5 ${/[a-z]/.test(password) && /[A-Z]/.test(password) ? "text-green-600" : ""}`}
        >
          {/[a-z]/.test(password) && /[A-Z]/.test(password) ? (
            <Check className="w-3 h-3" />
          ) : (
            <X className="w-3 h-3" />
          )}
          Upper & lowercase letters
        </li>
        <li
          className={`flex items-center gap-1.5 ${/\d/.test(password) ? "text-green-600" : ""}`}
        >
          {/\d/.test(password) ? (
            <Check className="w-3 h-3" />
          ) : (
            <X className="w-3 h-3" />
          )}
          At least one number
        </li>
        <li
          className={`flex items-center gap-1.5 ${/[^a-zA-Z0-9]/.test(password) ? "text-green-600" : ""}`}
        >
          {/[^a-zA-Z0-9]/.test(password) ? (
            <Check className="w-3 h-3" />
          ) : (
            <X className="w-3 h-3" />
          )}
          Special character (!@#$%...)
        </li>
      </ul>
    </div>
  );
}
