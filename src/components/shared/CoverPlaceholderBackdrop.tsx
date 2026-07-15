/**
 * Radial accent/neural glow for empty cover placeholders (no image uploaded).
 */
export function CoverPlaceholderBackdrop() {
  return (
    <>
      <div
        className="absolute inset-0 opacity-60"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 30%, var(--accent-soft) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-40"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 100%, var(--neural-soft) 0%, transparent 70%)",
        }}
      />
    </>
  );
}
