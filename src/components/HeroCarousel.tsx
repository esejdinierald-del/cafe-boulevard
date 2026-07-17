import { useEffect, useRef, useState } from "react";
// Responsive multi-format variants generated at build time by vite-imagetools.
// `as=picture` returns { sources: { avif?: string, webp?: string, jpg: string }, img: { src, w, h } }
import hero1 from "@/assets/hero-1.jpg?w=480;768;1280&format=avif;webp;jpg&as=picture";
import hero2 from "@/assets/hero-2.jpg?w=480;768;1280&format=avif;webp;jpg&as=picture";
import hero3 from "@/assets/hero-3.jpg?w=480;768;1280&format=avif;webp;jpg&as=picture";

type PictureSource = {
  sources: Record<string, string>;
  img: { src: string; w: number; h: number };
};

const SLIDES = [
  { pic: hero1 as PictureSource, alt: "Boulevard Café interior at golden hour" },
  { pic: hero2 as PictureSource, alt: "Latte art in dark ceramic cup" },
  { pic: hero3 as PictureSource, alt: "Signature cocktail on dark bar" },
];

const SIZES = "(max-width: 480px) 480px, (max-width: 768px) 768px, 1280px";

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
    // Warm the browser cache for the WebP variant of the upcoming slide.
    const s = SLIDES[next].pic.sources;
    img.srcset = s.webp || s.avif || s.jpg;
    img.sizes = SIZES;
    img.src = SLIDES[next].pic.img.src;
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
      {SLIDES.map((slide, i) => {
        const { sources, img } = slide.pic;
        const isEager = i === 0;
        return (
          <div
            key={img.src}
            className={`blvd-hero-slide ${i === index ? "is-active" : ""}`}
            aria-hidden={i !== index}
          >
            {loaded[i] && (
              <picture>
                {sources.avif && <source type="image/avif" srcSet={sources.avif} sizes={SIZES} />}
                {sources.webp && <source type="image/webp" srcSet={sources.webp} sizes={SIZES} />}
                <img
                  src={img.src}
                  srcSet={sources.jpg}
                  sizes={SIZES}
                  alt={slide.alt}
                  loading={isEager ? "eager" : "lazy"}
                  fetchPriority={isEager ? "high" : "low"}
                  decoding="async"
                  width={img.w}
                  height={img.h}
                  className="blvd-hero-img"
                  draggable={false}
                />
              </picture>
            )}
          </div>
        );
      })}
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