import { ItemStack } from '../data/Items.ts';

// =====================================================================
// Inventory.ts — Container model and transfer logic.
//
// A Container is a fixed-capacity bag of ItemStacks. The player's cargo and
// every loot-island chest are Containers. This TS model is the single source
// of truth; the HTML two-pane popup merely renders snapshots and emits intents
// (transfer / discard) back through the EventBus.
// =====================================================================

export interface SlotView {
  uid: number;
  id: string;
  name: string;
  glyph: string;
  rarity: string;
  value: number;
}

export class Container {
  items: ItemStack[] = [];
  constructor(public capacity: number) {}

  get count(): number {
    return this.items.length;
  }
  get isFull(): boolean {
    return this.items.length >= this.capacity;
  }
  get freeSlots(): number {
    return this.capacity - this.items.length;
  }

  add(stack: ItemStack): boolean {
    if (this.isFull) return false;
    this.items.push(stack);
    return true;
  }

  removeByUid(uid: number): ItemStack | null {
    const i = this.items.findIndex((s) => s.uid === uid);
    if (i === -1) return null;
    return this.items.splice(i, 1)[0];
  }

  has(uid: number): boolean {
    return this.items.some((s) => s.uid === uid);
  }

  clear(): ItemStack[] {
    const all = this.items;
    this.items = [];
    return all;
  }
}

/** Move a stack from one container to another if there is room. */
export function transfer(from: Container, to: Container, uid: number): boolean {
  if (to.isFull) return false;
  const stack = from.removeByUid(uid);
  if (!stack) return false;
  to.add(stack);
  return true;
}
