"use client";

import { m, useInView, useReducedMotion } from "motion/react";
import { useRef, type ElementType, type ReactNode } from "react";

interface RevealProps {
  as?: ElementType;
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function Reveal({
  as: Component = "div",
  children,
  delay = 0,
  className,
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, {
    once: true,
    amount: 0.18,
    margin: "0px 0px -8% 0px",
  });
  const reduceMotion = useReducedMotion();

  return (
    <m.div
      ref={ref}
      initial={reduceMotion ? false : { opacity: 0, y: 30, filter: "blur(14px)" }}
      animate={
        inView || reduceMotion
          ? { opacity: 1, y: 0, filter: "blur(0px)" }
          : { opacity: 0, y: 30, filter: "blur(14px)" }
      }
      transition={{
        duration: reduceMotion ? 0 : 0.72,
        delay: reduceMotion ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      <Component>{children}</Component>
    </m.div>
  );
}
