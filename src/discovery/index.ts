export { candidateSaveDirs, NIER_AUTOMATA_STEAM_APP_ID } from "./paths";
export {
  discoverSlotDataFiles,
  isSlotDataFileName,
  PermissionDeniedError,
} from "./discover";
export {
  discoverHostSlotDataFiles,
  type DiscoverHostSlotDataFilesOptions,
} from "./host";
export { createTauriDiscoveryHost } from "./tauriHost";
export type { CandidateSaveDirsInput } from "./paths";
export type { DiscoverSlotDataFilesInput } from "./discover";
export type {
  DiscoveryEnv,
  DiscoveryHost,
  DirListResult,
} from "./host";
export type {
  DiscoveryFs,
  DiscoveryPlatform,
  DirEntry,
  DirEntryKind,
  SlotFile,
} from "./types";
