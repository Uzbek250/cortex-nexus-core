import { motion } from "framer-motion";

export function CortexLogo({ size = 40, animated = true }: { size?: number; animated?: boolean }) {
  const Wrapper = animated ? motion.div : "div";
  const props = animated
    ? { animate: { rotate: [0, 360] }, transition: { duration: 40, repeat: Infinity, ease: "linear" } }
    : {};
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <Wrapper {...(props as object)} className="absolute inset-0">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="cortexg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.82 0.17 210)" />
              <stop offset="100%" stopColor="oklch(0.66 0.24 295)" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="none" stroke="url(#cortexg)" strokeWidth="1" opacity="0.4" />
          <circle cx="50" cy="50" r="38" fill="none" stroke="url(#cortexg)" strokeWidth="0.6" opacity="0.25" strokeDasharray="2 4" />
          <g stroke="url(#cortexg)" strokeWidth="1.4" fill="none" strokeLinecap="round">
            <path d="M50 14 L50 30" />
            <path d="M50 70 L50 86" />
            <path d="M14 50 L30 50" />
            <path d="M70 50 L86 50" />
            <path d="M24 24 L36 36" />
            <path d="M64 64 L76 76" />
            <path d="M76 24 L64 36" />
            <path d="M36 64 L24 76" />
          </g>
          <circle cx="50" cy="50" r="10" fill="url(#cortexg)" opacity="0.9" />
          <circle cx="50" cy="50" r="4" fill="white" opacity="0.95" />
        </svg>
      </Wrapper>
    </div>
  );
}
