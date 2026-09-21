import { describe, expect, it } from "vitest";
import {
  BACKUP_DIR_NAME,
  backupTargetPath,
  resolveVersionedBackupRoot,
} from "./backupPath";

describe("backupTargetPath", () => {
  it("places a Windows SlotData backup under nier-save-editor-backup beside the save", () => {
    expect(
      backupTargetPath(
        "synthetic\\saves\\NieR_Automata\\SlotData_0.dat",
      ),
    ).toBe(
      `synthetic\\saves\\NieR_Automata\\${BACKUP_DIR_NAME}\\SlotData_0.dat`,
    );
  });

  it("places a Unix SlotData backup under nier-save-editor-backup beside the save", () => {
    expect(
      backupTargetPath(
        "synthetic/saves/NieR_Automata/SlotData_1.dat",
      ),
    ).toBe(
      `synthetic/saves/NieR_Automata/${BACKUP_DIR_NAME}/SlotData_1.dat`,
    );
  });

  it("places a legacy overwrite backup under a configured backup root", () => {
    expect(
      backupTargetPath(
        "synthetic/saves/NieR_Automata/SlotData_0.dat",
        "synthetic/backups/custom-root",
      ),
    ).toBe("synthetic/backups/custom-root/SlotData_0.dat");
  });
});

describe("resolveVersionedBackupRoot", () => {
  it("defaults to nier-save-editor-backup beside the save folder", () => {
    expect(
      resolveVersionedBackupRoot("synthetic/saves/NieR_Automata/SlotData_0.dat"),
    ).toBe(`synthetic/saves/NieR_Automata/${BACKUP_DIR_NAME}`);
  });

  it("uses a configured backup root when provided", () => {
    expect(
      resolveVersionedBackupRoot(
        "synthetic/saves/NieR_Automata/SlotData_0.dat",
        "synthetic/backups/custom-root",
      ),
    ).toBe("synthetic/backups/custom-root");
  });

  it("treats blank/whitespace custom roots as the beside-save default", () => {
    expect(
      resolveVersionedBackupRoot(
        "synthetic/saves/NieR_Automata/SlotData_0.dat",
        "   ",
      ),
    ).toBe(`synthetic/saves/NieR_Automata/${BACKUP_DIR_NAME}`);
  });
});
