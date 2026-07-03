"use client";

import { useCallback, useState } from "react";

export interface FilePathCheckState {
  checking: boolean;
  exists: boolean | null;
}

export function useFilePathCheck() {
  const [state, setState] = useState<FilePathCheckState>({
    checking: false,
    exists: null,
  });

  const checkFilePath = useCallback(async (path: string) => {
    if (!path.trim()) {
      setState({ checking: false, exists: null });
      return;
    }
    setState({ checking: true, exists: null });
    try {
      const res = await fetch(
        `/api/movies?path=${encodeURIComponent(path)}`,
        { method: "HEAD" },
      );
      setState({ checking: false, exists: res.ok });
    } catch {
      setState({ checking: false, exists: false });
    }
  }, []);

  return { checking: state.checking, exists: state.exists, checkFilePath };
}
