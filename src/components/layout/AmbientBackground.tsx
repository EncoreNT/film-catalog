export function AmbientBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {/* Deep warm base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #1c1611 0%, #15110d 45%, #120e0a 100%)",
        }}
      />
      {/* Amber projector glow — top center */}
      <div
        className="ambient-blob-1 absolute -top-40 left-1/2 h-[60rem] w-[60rem] -translate-x-1/2 rounded-full opacity-50 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(232,176,90,0.16) 0%, transparent 60%)",
        }}
      />
      {/* Ember glow — bottom right */}
      <div
        className="ambient-blob-2 absolute -bottom-32 -right-20 h-[40rem] w-[40rem] rounded-full opacity-40 blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, rgba(200,112,56,0.18) 0%, transparent 60%)",
        }}
      />
      {/* Cool counterbalance — left, very subtle */}
      <div
        className="absolute top-1/3 -left-32 h-[36rem] w-[36rem] rounded-full opacity-30 blur-[110px]"
        style={{
          background:
            "radial-gradient(circle, rgba(86,120,160,0.08) 0%, transparent 60%)",
        }}
      />
    </div>
  );
}
