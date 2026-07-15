"use client";

import { useCallback, useState } from "react";
import {
  buildFilePathHeadUrl,
  filePathExistsFromHead,
  shouldCheckFilePath,
} from "@/lib/movies/file-path-check";

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
    if (!shouldCheckFilePath(path)) {
      setState({ checking: false, exists: null });
      return;
    }
    setState({ checking: true, exists: null });
    try {
      const res = await fetch(buildFilePathHeadUrl(path), { method: "HEAD" });
      setState({ checking: false, exists: filePathExistsFromHead(res.ok) });
    } catch {
      setState({ checking: false, exists: false });
    }
  }, []);

  return { checking: state.checking, exists: state.exists, checkFilePath };
}
