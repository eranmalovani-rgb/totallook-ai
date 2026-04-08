import { useEffect, useRef, useState, type ReactNode, Children, cloneElement, isValidElement } from "react";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  /** Animation variant: 'fade-up' (default), 'fade-in', 'slide-left', 'slide-right' */
  variant?: "fade-up" | "fade-in" | "slide-left" | "slide-right";
  /** Delay in ms before animation starts */
  delay?: number;
  /** If true, staggers child elements with incremental delays */
  stagger?: boolean;
  /** Delay between each staggered child in ms (default: 100) */
  staggerDelay?: number;
  /** IntersectionObserver threshold (default: 0.1) */
  threshold?: number;
}

export default function AnimatedSection({
  children,
  className = "",
  variant = "fade-up",
  delay = 0,
  stagger = false,
  staggerDelay = 100,
  threshold = 0.1,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  // Base transform for hidden state
  const hiddenTransform =
    variant === "fade-up" ? "translateY(2rem)" :
    variant === "slide-left" ? "translateX(-2rem)" :
    variant === "slide-right" ? "translateX(2rem)" :
    "none";

  if (stagger) {
    // Stagger mode: each direct child gets its own delay
    const childArray = Children.toArray(children);
    return (
      <div ref={ref} className={className}>
        {childArray.map((child, i) => (
          <div
            key={i}
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "none" : hiddenTransform,
              transition: `opacity 0.6s ease-out ${delay + i * staggerDelay}ms, transform 0.6s ease-out ${delay + i * staggerDelay}ms`,
            }}
          >
            {child}
          </div>
        ))}
      </div>
    );
  }

  // Simple mode: entire section animates together
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "none" : hiddenTransform,
        transition: `opacity 0.7s ease-out ${delay}ms, transform 0.7s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
