export function AmbientBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {/* Warm paper base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #faf6ef 0%, #f4ede1 45%, #f0e7d6 100%)",
        }}
      />
      {/* Amber projector wash — top center, very subtle on paper */}
      <div
        className="ambient-blob-1 absolute -top-40 left-1/2 h-[60rem] w-[60rem] -translate-x-1/2 rounded-full opacity-40 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(168,101,31,0.10) 0%, transparent 60%)",
        }}
      />
      {/* Ember wash — bottom right */}
      <div
        className="ambient-blob-2 absolute -bottom-32 -right-20 h-[40rem] w-[40rem] rounded-full opacity-30 blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, rgba(168,90,42,0.10) 0%, transparent 60%)",
        }}
      />
    </div>
  );
}
