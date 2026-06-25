export function GrainOverlay() {
  return (
    <>
      {/* Film grain */}
      <div
        className="pointer-events-none fixed inset-0 z-[60] opacity-[0.06] mix-blend-overlay motion-reduce:hidden"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Warm vignette — projection-room falloff */}
      <div
        className="pointer-events-none fixed inset-0 z-[55]"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 35%, transparent 0%, rgba(0,0,0,0.35) 75%, rgba(0,0,0,0.6) 100%)",
        }}
      />
    </>
  );
}
