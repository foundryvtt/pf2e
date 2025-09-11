import type { ActorPF2e } from "@actor/base.ts";
import type { TraitViewData } from "@actor/data/base.ts";
import type { ActorSizePF2e } from "@actor/data/size.ts";
import type { InventoryBulk } from "@actor/inventory/index.ts";
import type { FormSelectOption } from "@client/applications/forms/fields.d.mts";
import type { AppV1RenderOptions } from "@client/appv1/api/application-v1.d.mts";
import type { ActorSheetData } from "@client/appv1/sheets/actor-sheet.d.mts";
import type { ItemUUID } from "@common/documents/_module.d.mts";
import type { PhysicalItemPF2e } from "@item";
import type { Frequency } from "@item/base/data/index.ts";
import type { Coins } from "@item/physical/data.ts";
import type { RollOptionToggle } from "@module/rules/synthetics.ts";
import type { SheetOptions } from "@module/sheet/helpers.ts";

interface InventoryItem<TItem extends PhysicalItemPF2e = PhysicalItemPF2e> {
    item: TItem;
    /** Item size if it causes any weight difference relative to the actor */
    itemSize?: ActorSizePF2e | null;
    isContainer: boolean;
    canBeEquipped: boolean;
    /** Bulk for each item is shown on an individual basis from merchant sheets */
    unitBulk: string | null;
    isInvestable: boolean;
    isSellable: boolean;
    hasCharges: boolean;
    heldItems?: InventoryItem[] | null;
    notifyEquip?: boolean;
    notifyInvest?: boolean;
    /** Whether the item should be hidden if the user isn't the owner */
    hidden: boolean;
}

interface CoinDisplayData {
    value: number;
    label: string;
}

export type CoinageSummary = { [K in keyof Coins]?: CoinDisplayData };

interface SheetItemList {
    label: string;
    types: string[];
    items: InventoryItem[];
}

interface SheetInventory {
    sections: SheetItemList[];
    bulk: InventoryBulk;
    showValueAlways: boolean;
    showUnitBulkPrice: boolean;
    hasStowedWeapons: boolean;
    hasStowingContainers: boolean;
    invested?: { value: number; max: number } | null;
}

interface ActorSheetDataPF2e<TActor extends ActorPF2e> extends ActorSheetData<TActor> {
    data: TActor["system"];
    canDistributeCoins?: { enabled: boolean } | null;
    enrichedContent: Record<string, string>;
    inventory: SheetInventory;
    isLootSheet: boolean;
    isTargetFlatFooted: boolean;
    toggles: Record<string, RollOptionToggle[]>;
    totalCoinage: CoinageSummary;
    totalCoinageGold: string;
    totalWealth: Coins;
    totalWealthGold: string;
    traits: SheetOptions;
    user: { isGM: boolean };
    publicationLicenses: FormSelectOption[];
}

interface AbilityViewData {
    uuid: ItemUUID;
    id: string;
    name: string;
    img: string;
    traits: TraitViewData[];
    glyph: string | null;
    frequency: Frequency | null;
    usable: boolean;
    has: {
        aura: boolean;
        deathNote: boolean;
        selfEffect: boolean;
    };
}

interface ActorSheetRenderOptionsPF2e extends AppV1RenderOptions {
    /** What tab to switch to when rendering the sheet */
    tab?: string;
}

export type { AbilityViewData, ActorSheetDataPF2e, ActorSheetRenderOptionsPF2e, InventoryItem, SheetInventory };
