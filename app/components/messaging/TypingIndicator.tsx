'use client';

interface TypingIndicatorProps {
  names?: string[];
}

export default function TypingIndicator({ names = [] }: TypingIndicatorProps) {
  if (names.length === 0) return null;
  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : 'Several people are typing';

  return (
    <div
      className="text-caption text-on-surface-variant"
      style={{ padding: '4px 24px', fontStyle: 'italic' }}
      aria-live="polite"
    >
      {label}
      <span className="typing-dots" aria-hidden="true">
        <span />
      </span>
    </div>
  );
}
