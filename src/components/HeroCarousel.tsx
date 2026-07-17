import { useEffect, useRef, useState } from "react";
import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";

const SLIDES = [
  { src: hero1, alt: "Boulevard Café interior at golden hour" },
  { src: hero2, alt: "Latte art in dark ceramic cup" },
  { src: hero3, alt: "Signature cocktail on dark bar" },
];

const INTERVAL = 5500;

export const HeroCarousel = () => {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState<boolean[]>(() => SLIDES.map((_, i) => i === 0));
  const timerRef = useRef<number | null>(null);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (reduced.current) return;
    timerRef.current = window.setTimeout(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, INTERVAL);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [index]);

  // Lazy-preload the next slide once the current one is displayed
  useEffect(() => {
    const next = (index + 1) % SLIDES.length;
    if (loaded[next]) return;
    const img = new Image();
    img.src = SLIDES[next].src;
    img.onload = () =>
      setLoaded((prev) => {
        if (prev[next]) return prev;
        const copy = [...prev];
        copy[next] = true;
        return copy;
      });
  }, [index, loaded]);

  return (
    <div className="blvd-hero-carousel" role="region" aria-label="Boulevard Café gallery">
      {SLIDES.map((slide, i) => (
        <div
          key={slide.src}
          className={`blvd-hero-slide ${i === index ? "is-active" : ""}`}
          aria-hidden={i !== index}
        >
          {loaded[i] && (
            <img
              src={slide.src}
              alt={slide.alt}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              width={1280}
              height={1600}
              className="blvd-hero-img"
              draggable={false}
            />
          )}
        </div>
      ))}
      <div className="blvd-hero-overlay" aria-hidden="true" />
      <div className="blvd-hero-dots" role="tablist" aria-label="Slide selector">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Slide ${i + 1}`}
            className={`blvd-hero-dot ${i === index ? "is-active" : ""}`}
            onClick={() => {
              setLoaded((prev) => {
                if (prev[i]) return prev;
                const copy = [...prev];
                copy[i] = true;
                return copy;
              });
              setIndex(i);
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;