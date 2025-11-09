import type { DropCanvasData } from "@client/helpers/hooks.d.mts";
import { ItemPF2e } from "@item";
import { EffectContextData } from "@item/abstract-effect/index.ts";

type DropCanvasItemData = DropCanvasData<"Item", ItemPF2e> & {
    value?: number;
    level?: number;
    spellFrom?: {
        collectionId: string;
        groupId: string;
        slotIndex: number;
    };
    context?: EffectContextData;
};

type DropCanvasPersistentDamage = DropCanvasData<"PersistentDamage"> & {
    formula: string;
};

type DropCanvasDataPF2e = DropCanvasItemData | DropCanvasPersistentDamage;

export type { DropCanvasDataPF2e, DropCanvasItemData };
