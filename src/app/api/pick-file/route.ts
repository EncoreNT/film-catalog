import { NextResponse } from "next/server";
import { mapDomainError } from "@/lib/api/api-utils";
import { displayFilePath, resolveRuntimePath } from "@/lib/shared/display-path";
import {
  NativePickerCancelledError,
  pickPathNative,
} from "@/lib/shared/native-path-picker";

export async function POST() {
  try {
    const picked = await pickPathNative("file");
    if (!picked)
      throw new Error(
        "Диалог выбора файла недоступен на этой системе. Введите путь вручную.",
      );
    const runtimePath = resolveRuntimePath(picked);
    return NextResponse.json({
      path: runtimePath,
      pathDisplay: displayFilePath(runtimePath),
    });
  } catch (err) {
    if (err instanceof NativePickerCancelledError)
      return NextResponse.json({ cancelled: true });
    return mapDomainError(err, "Не удалось выбрать файл");
  }
}
