import React from "react";

export function ZenWorkLogo({
  className = "",
  showText = true,
  size = "md",
}: {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const iconSizes = {
    sm: { w: 22, h: 22 },
    md: { w: 28, h: 28 },
    lg: { w: 34, h: 34 },
  };

  const { w, h } = iconSizes[size] || iconSizes.md;

  return (
    <div
      className={`zenwork-logo-badge ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        userSelect: "none",
        textDecoration: "none",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        width={w}
        height={h}
        fill="none"
        style={{ flexShrink: 0 }}
      >
        <rect width="32" height="32" fill="#2D56CF" rx="0" />
        <path
          d="M8 9 H24 L10 23 H24"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
      {showText && (
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: size === "sm" ? "15px" : size === "lg" ? "20px" : "17px",
            letterSpacing: "-0.03em",
            color: "var(--text)",
            lineHeight: 1,
          }}
        >
          ZenWork
        </span>
      )}
    </div>
  );
}
