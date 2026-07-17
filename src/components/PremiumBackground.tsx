/**
 * PremiumBackground
 * Reusable ambient scene: bokeh + sparkles + vignette (existing)
 * plus animated gold light beams and drifting particles.
 * Pure CSS animations — GPU-friendly (transform/opacity only).
 */
export const PremiumBackground = () => (
  <>
    <div className="blvd-ambient" aria-hidden="true" />
    <div className="blvd-bokeh-blur" aria-hidden="true" />
    <div className="blvd-gold-beams" aria-hidden="true" />
    <div className="blvd-particles" aria-hidden="true" />
    <div className="blvd-sparkles" aria-hidden="true" />
    <div className="blvd-vignette" aria-hidden="true" />
  </>
);

export default PremiumBackground;