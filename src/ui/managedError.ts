import type { ManagedFailure, ManagedPhase } from "../persist";
import type { MessageKey } from "../i18n";

export type ManagedErrorDescriptor = {
  phase: ManagedPhase | "read-backup";
  status: ManagedFailure["status"];
};

export function formatManagedError(
  failure: ManagedErrorDescriptor,
  t: (key: MessageKey) => string,
): string {
  const phase = t(`saveManager.phase.${failure.phase}` as MessageKey);
  const status = t(`saveManager.status.${failure.status}` as MessageKey);
  return t("message.withDetail")
    .split("{message}")
    .join(phase)
    .split("{detail}")
    .join(status);
}
