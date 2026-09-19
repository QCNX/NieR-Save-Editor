import type { SlotData } from "../save";
import {
  parseInventory,
  serializeInventory,
  setInventoryItem,
} from "../save";
import { lookupItemName } from "../names";

type Props = {
  slot: SlotData;
  onSlotChange: (next: SlotData) => void;
};

export function InventoryPanel({ slot, onSlotChange }: Props) {
  const items = parseInventory(slot.inventory).filter((item) => item.id !== -1);

  return (
    <section className="panel" aria-labelledby="inventory-heading">
      <h2 id="inventory-heading">物品栏</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>名称</th>
              <th>数量</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={2} className="empty-row">
                  （无物品）
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.position}>
                  <td>{lookupItemName(item.id)}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={item.quantity}
                      onChange={(e) => {
                        const quantity = Number(e.currentTarget.value);
                        if (!Number.isFinite(quantity)) return;
                        const all = parseInventory(slot.inventory);
                        const next = setInventoryItem(all, item.position, {
                          quantity: quantity | 0,
                        });
                        onSlotChange({
                          ...slot,
                          inventory: serializeInventory(next),
                        });
                      }}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
