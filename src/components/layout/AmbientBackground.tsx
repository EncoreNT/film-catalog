export function AmbientBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {/* Deep coal base — cinematic black with whisper of warmth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 130% 95% at 50% 8%, #1f1830 0%, #15121f 30%, #0c0a12 62%, #07060a 100%)",
        }}
      />

      {/* Tech grid — present and visible, masked to fade lower */}
      <div className="tech-grid absolute inset-0 opacity-100" />

      {/* Projector god-ray — warm beam from top center, cinematic */}
      <div className="projector-beam absolute -top-24 left-1/2 h-[80rem] w-[48rem] -translate-x-1/2 rotate-[5deg] opacity-90" />

      {/* Gold projector hotspot — top center, the primary cinematic glow */}
      <div
        className="glow-hotspot ambient-blob-1 absolute top-[2%] left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 opacity-95"
        style={{
          background:
            "radial-gradient(circle, rgba(232,176,90,0.55) 0%, rgba(232,176,90,0.20) 40%, transparent 72%)",
          filter: "blur(50px)",
        }}
      />

      {/* Ember warm counter — bottom center, keeps cinema warmth */}
      <div
        className="glow-hotspot ambient-blob-2 absolute -bottom-20 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(200,112,56,0.30) 0%, transparent 66%)",
          filter: "blur(50px)",
        }}
      />

      {/* Central warm hotspot — keeps cinema warmth in the middle */}
      <div
        className="glow-hotspot absolute top-[45%] left-1/2 h-[26rem] w-[40rem] -translate-x-1/2 opacity-55"
        style={{
          background:
            "radial-gradient(ellipse, rgba(200,112,56,0.20) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Neural-violet nebula — right-mid, a quiet tech hint */}
      <div
        className="glow-hotspot ambient-blob-neural absolute top-[20%] -right-8 h-[28rem] w-[28rem] opacity-45"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.40) 0%, rgba(139,92,246,0.12) 42%, transparent 72%)",
          filter: "blur(55px)",
        }}
      />

      {/* Fine tech grid overlay for density, masked to upper area */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(232,176,90,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(232,176,90,0.05) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 65% at 50% 35%, #000 0%, transparent 85%)",
          maskImage:
            "radial-gradient(ellipse 80% 65% at 50% 35%, #000 0%, transparent 85%)",
        }}
      />
    </div>
  );
}
