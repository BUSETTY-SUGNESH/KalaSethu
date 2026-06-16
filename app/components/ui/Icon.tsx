interface IconProps {
  name: string;
  size?: number;
  className?: string;
  fill?: boolean;
}

export default function Icon({ name, size, className = "", fill }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontSize: size ? `${size}px` : undefined,
        fontVariationSettings: fill ? "'FILL' 1" : undefined,
      }}
    >
      {name}
    </span>
  );
}
