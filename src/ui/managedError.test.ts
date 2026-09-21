import { describe, expect, it } from "vitest";

import { translate } from "../i18n";
import { formatManagedError } from "./managedError";

describe("formatManagedError", () => {
  it("describes a managed failure by localized phase and status only", () => {
    const result = formatManagedError(
      { phase: "check-target", status: "conflict" },
      (key) => translate("zh-CN", key),
    );

    expect(result).toBe("检查目标：目标文件已被其他程序修改");
    expect(result).not.toContain("C:\\Users\\player");
  });

  it("localizes every managed status in both languages", () => {
    const statuses = [
      "missing",
      "permission",
      "error",
      "invalid-size",
      "integrity",
      "conflict",
      "backup",
      "verify",
    ] as const;

    for (const status of statuses) {
      for (const language of ["zh-CN", "en"] as const) {
        const message = formatManagedError(
          { phase: "verify-target", status },
          (key) => translate(language, key),
        );
        expect(message).not.toContain("saveManager.");
      }
    }
  });
});
