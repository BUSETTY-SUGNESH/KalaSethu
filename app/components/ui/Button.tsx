import { ReactNode, ButtonHTMLAttributes } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "secondary-container"
  | "gold"
  | "outline"
  | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg" | "icon";
  href?: string;
  icon?: string;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  href,
  icon,
  iconPosition = "left",
  fullWidth,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const baseClasses = "btn";
  const variantClasses = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    "secondary-container": "btn-secondary-container",
    gold: "btn-gold",
    outline: "btn-outline",
    ghost: "btn-ghost",
  }[variant];

  const sizeClasses = {
    sm: "btn-sm",
    md: "",
    lg: "btn-lg",
    icon: "btn-icon",
  }[size];

  const widthClass = fullWidth ? "btn-full" : "";

  const combinedClassName = `${baseClasses} ${variantClasses} ${sizeClasses} ${widthClass} ${className}`.trim();

  const content = (
    <>
      {icon && iconPosition === "left" && <Icon name={icon} />}
      {children}
      {icon && iconPosition === "right" && <Icon name={icon} />}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={combinedClassName}>
        {content}
      </Link>
    );
  }

  return (
    <button className={combinedClassName} {...props}>
      {content}
    </button>
  );
}
