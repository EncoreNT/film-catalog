import { NextResponse } from "next/server";
import { assertDirectoryWritable } from "@/lib/db/settings";
import { mapDomainError } from "@/lib/api/api-utils";
import { displayFilePath, resolveRuntimePath } from "@/lib/shared/display-path";
import {
  PickDirectoryCancelledError,
  pickDirectoryNative,
} from "@/lib/shared/pick-directory";

export async function POST() {
  try {
    const picked = await pickDirectoryNative();
    if (!picked) {
      throw new Error(
        "Диалог выбора папки недоступен на этой системе. Введите путь вручную.",
      );
    }

    const runtimePath = resolveRuntimePath(picked);
    await assertDirectoryWritable(runtimePath);

    return NextResponse.json({
      path: runtimePath,
      pathDisplay: displayFilePath(runtimePath),
    });
  } catch (err) {
    if (err instanceof PickDirectoryCancelledError) {
      return NextResponse.json({ cancelled: true });
    }
    return mapDomainError(err, "Не удалось выбрать папку");
  }
}
