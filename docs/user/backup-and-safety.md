# Backup and safety

[中文](./backup-and-safety.zh-CN.md)

> Back up important saves yourself. In-app history is a recovery aid, not a full substitute.

## Where backups go

By default, versioned copies are stored next to your save directory:

`nier-save-editor-backup/<slot>/`

Example: if slots live in `...\NieR_Automata\`, backups for `SlotData_0.dat` go under `...\NieR_Automata\nier-save-editor-backup\SlotData_0\`.

You can set a **custom backup root** in **Settings**. Use **Open backup folder** from Settings or the Save tab when you need the path in Explorer / Files.

## What gets snapshotted

| Action | Behavior |
| --- | --- |
| Manual backup | Copies the slot file **currently on disk**. Unsaved editor changes are **not** included. |
| Before Save / Import / Restore | Automatic safety snapshot of the on-disk target before the managed write. |

Failed backup, conflict, commit, or verification does **not** report success. Writes use same-directory safe replacement and re-read checks (size + SHA-256).

## Restore and replace

- **Restore** a backup into the selected slot only after the directional preview and confirmation.
- **Replace** a slot from an external PC `.dat` the same way—preview first, then confirm.

After restore/replace, rescan or reload if the UI still shows stale data.

## Practical tips

1. Keep at least one copy of critical slots outside the game folder (cloud drive, USB, zip).
2. Quit the game (or ensure it is not writing the slot) before Save / Restore.
3. Prefer restoring from a named backup you recognize (time + summary) over guessing.
4. Do not share or commit real `.dat` files—they can contain Steam progress and identifiers.
