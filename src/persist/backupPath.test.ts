import { describe, expect, it } from "vitest";
import { BACKUP_DIR_NAME, backupTargetPath } from "./backupPath";

describe("backupTargetPath", () => {
  it("places a Windows SlotData backup under nier-save-editor-backup beside the save", () => {
    expect(
      backupTargetPath(
        "C:\\Users\\Player\\Documents\\My Games\\NieR_Automata\\SlotData_0.dat",
      ),
    ).toBe(
      `C:\\Users\\Player\\Documents\\My Games\\NieR_Automata\\${BACKUP_DIR_NAME}\\SlotData_0.dat`,
    );
  });

  it("places a Unix SlotData backup under nier-save-editor-backup beside the save", () => {
    expect(
      backupTargetPath(
        "/home/deck/Documents/My Games/NieR_Automata/SlotData_1.dat",
      ),
    ).toBe(
      `/home/deck/Documents/My Games/NieR_Automata/${BACKUP_DIR_NAME}/SlotData_1.dat`,
    );
  });
});
