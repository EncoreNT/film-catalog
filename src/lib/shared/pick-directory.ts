import { pickPathNative } from "./native-path-picker";

export {
  NativePickerCancelledError as PickDirectoryCancelledError,
  normalizePickerStdout,
} from "./native-path-picker";

export const pickDirectoryNative = () => pickPathNative("directory");
