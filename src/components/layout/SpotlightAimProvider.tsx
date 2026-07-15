"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import {
  elementCenter,
  resolveFranchiseHoverAim,
  resolveSpotlightAim,
  type SpotlightSide,
} from "@/lib/layout/spotlight-aim";

type TargetSide = SpotlightSide | "both";
export type SpotlightHoverMode = "full" | "lite";

interface SpotlightAimContextValue {
  registerTarget: (side: TargetSide, element: HTMLElement) => void;
  unregisterTarget: (side: TargetSide, element: HTMLElement) => void;
  setHoverTarget: (
    element: HTMLElement | null,
    mode?: SpotlightHoverMode,
  ) => void;
}

const SpotlightAimContext = createContext<SpotlightAimContextValue | null>(
  null,
);

function pickTargetElement(
  targets: Map<TargetSide, Set<HTMLElement>>,
  side: SpotlightSide,
): HTMLElement | undefined {
  const set = targets.get(side);
  return set ? [...set].at(-1) : undefined;
}

function hasRegisteredTargets(targets: Map<TargetSide, Set<HTMLElement>>): boolean {
  return (
    (targets.get("left")?.size ?? 0) > 0 ||
    (targets.get("right")?.size ?? 0) > 0
  );
}

function applyLiteFocus(root: HTMLElement, hover: HTMLElement) {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  const aim = resolveFranchiseHoverAim(elementCenter(hover), viewport);
  root.dataset.spotlightFocus = "lite";
  root.style.setProperty(
    "--spotlight-left-bearing",
    `${aim.leftBearing.toFixed(2)}deg`,
  );
  root.style.setProperty(
    "--spotlight-right-bearing",
    `${aim.rightBearing.toFixed(2)}deg`,
  );
  if (aim.focusPool) {
    root.style.setProperty("--spotlight-focus-x", aim.focusPool.x);
    root.style.setProperty("--spotlight-focus-y", aim.focusPool.y);
  }
}

function clearFocus(root: HTMLElement) {
  delete root.dataset.spotlightFocus;
  root.style.removeProperty("--spotlight-focus-x");
  root.style.removeProperty("--spotlight-focus-y");
}

function resetFranchiseBearings(root: HTMLElement) {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  const aim = resolveSpotlightAim(viewport, {
    left: null,
    right: null,
    hover: null,
  });
  root.style.setProperty(
    "--spotlight-left-bearing",
    `${aim.leftBearing.toFixed(2)}deg`,
  );
  root.style.setProperty(
    "--spotlight-right-bearing",
    `${aim.rightBearing.toFixed(2)}deg`,
  );
}

function applyAimToDocument(
  targets: Map<TargetSide, Set<HTMLElement>>,
  hover: HTMLElement | null,
  hoverMode: SpotlightHoverMode,
) {
  const root = document.documentElement;

  if (hover && hoverMode === "lite") {
    applyLiteFocus(root, hover);
    return;
  }

  clearFocus(root);

  if (!hover && !hasRegisteredTargets(targets)) {
    resetFranchiseBearings(root);
    return;
  }

  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  const leftEl = pickTargetElement(targets, "left");
  const rightEl = pickTargetElement(targets, "right");

  const aim = resolveSpotlightAim(viewport, {
    left: leftEl ? elementCenter(leftEl) : null,
    right: rightEl ? elementCenter(rightEl) : null,
    hover: hover && hoverMode === "full" ? elementCenter(hover) : null,
  });

  root.style.setProperty(
    "--spotlight-left-bearing",
    `${aim.leftBearing.toFixed(2)}deg`,
  );
  root.style.setProperty(
    "--spotlight-right-bearing",
    `${aim.rightBearing.toFixed(2)}deg`,
  );
  root.style.setProperty("--spotlight-pool-left-x", aim.leftPool.x);
  root.style.setProperty("--spotlight-pool-left-y", aim.leftPool.y);
  root.style.setProperty("--spotlight-pool-right-x", aim.rightPool.x);
  root.style.setProperty("--spotlight-pool-right-y", aim.rightPool.y);

  if (aim.focusPool && hoverMode === "full") {
    root.dataset.spotlightFocus = "active";
    root.style.setProperty("--spotlight-focus-x", aim.focusPool.x);
    root.style.setProperty("--spotlight-focus-y", aim.focusPool.y);
  }
}

/** Tracks page targets and writes rig bearing + pool position to <html>. */
export function SpotlightAimProvider({ children }: { children: ReactNode }) {
  const targetsRef = useRef(new Map<TargetSide, Set<HTMLElement>>());
  const hoverRef = useRef<HTMLElement | null>(null);
  const hoverModeRef = useRef<SpotlightHoverMode>("full");
  const rafRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const scheduleUpdate = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      applyAimToDocument(
        targetsRef.current,
        hoverRef.current,
        hoverModeRef.current,
      );
    });
  }, []);

  const observeElement = useCallback(
    (element: HTMLElement) => {
      resizeObserverRef.current ??= new ResizeObserver(() => scheduleUpdate());
      resizeObserverRef.current.observe(element);
    },
    [scheduleUpdate],
  );

  const registerTarget = useCallback(
    (side: TargetSide, element: HTMLElement) => {
      const sides: TargetSide[] =
        side === "both" ? ["left", "right"] : [side];
      for (const s of sides) {
        let set = targetsRef.current.get(s);
        if (!set) {
          set = new Set();
          targetsRef.current.set(s, set);
        }
        set.add(element);
      }
      observeElement(element);
      scheduleUpdate();
    },
    [observeElement, scheduleUpdate],
  );

  const unregisterTarget = useCallback(
    (side: TargetSide, element: HTMLElement) => {
      const sides: TargetSide[] =
        side === "both" ? ["left", "right"] : [side];
      for (const s of sides) {
        targetsRef.current.get(s)?.delete(element);
      }
      scheduleUpdate();
    },
    [scheduleUpdate],
  );

  const setHoverTarget = useCallback(
    (element: HTMLElement | null, mode: SpotlightHoverMode = "full") => {
      hoverRef.current = element;
      hoverModeRef.current = element ? mode : "full";
      if (element && mode === "lite") {
        observeElement(element);
      }
      scheduleUpdate();
    },
    [observeElement, scheduleUpdate],
  );

  useLayoutEffect(() => {
    scheduleUpdate();

    const onResize = () => scheduleUpdate();
    window.addEventListener("resize", onResize, { passive: true });

    let scrollRaf = 0;
    const onScroll = () => {
      if (
        !hasRegisteredTargets(targetsRef.current) &&
        !hoverRef.current
      ) {
        return;
      }
      if (scrollRaf) return;
      scrollRaf = window.requestAnimationFrame(() => {
        scrollRaf = 0;
        scheduleUpdate();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      resizeObserverRef.current?.disconnect();
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [scheduleUpdate]);

  const value = useMemo(
    () => ({ registerTarget, unregisterTarget, setHoverTarget }),
    [registerTarget, unregisterTarget, setHoverTarget],
  );

  return (
    <SpotlightAimContext.Provider value={value}>
      {children}
    </SpotlightAimContext.Provider>
  );
}

export function useSpotlightAim() {
  const ctx = useContext(SpotlightAimContext);
  if (!ctx) {
    throw new Error("useSpotlightAim must be used within SpotlightAimProvider");
  }
  return ctx;
}

export function useSpotlightTarget(
  side: TargetSide,
  ref: RefObject<HTMLElement | null>,
) {
  const { registerTarget, unregisterTarget } = useSpotlightAim();

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    registerTarget(side, element);
    return () => unregisterTarget(side, element);
  }, [ref, registerTarget, side, unregisterTarget]);
}

export function useSpotlightHoverTarget() {
  const { setHoverTarget } = useSpotlightAim();
  return setHoverTarget;
}
