import { SaveType } from "@actor/types.ts";
import { BaseItemSourcePF2e, ItemSystemData, ItemSystemSource, ItemTraits } from "@item/base/data/system.ts";
import { OneToTen, ValueAndMax } from "@module/data.ts";
import { DamageCategoryUnique, DamageType, MaterialDamageEffect } from "@system/damage/index.ts";
import { EffectAreaSize, EffectAreaType, MagicTradition, SpellComponent, SpellTrait } from "./types.ts";

type SpellSource = BaseItemSourcePF2e<"spell", SpellSystemSource>;

interface SpellSystemSource extends ItemSystemSource {
    traits: SpellTraits;
    level: { value: OneToTen };
    spellType: {
        value: keyof ConfigPF2e["PF2E"]["spellTypes"];
    };
    category: {
        value: keyof ConfigPF2e["PF2E"]["spellCategories"];
    };
    traditions: { value: MagicTradition[] };
    components: Record<SpellComponent, boolean>;
    materials: {
        value: string;
    };
    target: {
        value: string;
    };
    range: {
        value: string;
    };
    area: SpellArea | null;
    time: {
        value: string;
    };
    duration: {
        value: string;
    };
    damage: {
        value: Record<string, SpellDamage>;
    };
    heightening?: SpellHeighteningFixed | SpellHeighteningInterval;
    overlays?: Record<string, SpellOverlay>;
    save: {
        basic: string;
        value: SaveType | "";
        dc?: number;
        str?: string;
    };
    sustained: {
        value: false;
    };
    cost: {
        value: string;
    };
    hasCounteractCheck: {
        value: boolean;
    };
    location: {
        value: string | null;
        signature?: boolean;
        heightenedLevel?: number;

        /** The level to heighten this spell to if it's a cantrip or focus spell */
        autoHeightenLevel?: OneToTen | null;

        /** Number of uses if this is an innate spell */
        uses?: ValueAndMax;
    };
}

interface SpellSystemData extends SpellSystemSource, Omit<ItemSystemData, "level" | "traits"> {}

type SpellTraits = ItemTraits<SpellTrait>;

interface SpellArea {
    value: EffectAreaSize;
    type: EffectAreaType;
    /**
     * Legacy text information about spell effect areas:
     * if present, includes information not representable in a structured way
     */
    details?: string;
}

interface SpellDamageType {
    value: DamageType;
    subtype?: DamageCategoryUnique;
    categories: MaterialDamageEffect[];
}

interface SpellDamage {
    value: string;
    applyMod?: boolean;
    type: SpellDamageType;
}

interface SpellHeighteningInterval {
    type: "interval";
    interval: number;
    damage: Record<string, string>;
}

interface SpellHeighteningFixed {
    type: "fixed";
    levels: Record<OneToTen, Partial<SpellSystemSource>>;
}

interface SpellHeightenLayer {
    level: number;
    system: Partial<SpellSystemSource>;
}

interface SpellOverlayOverride {
    _id: string;
    system: DeepPartial<SpellSystemSource>;
    name?: string;
    overlayType: "override";
    sort: number;
}

/** Not implemented */
interface SpellOverlayDamage {
    overlayType: "damage";
    choices: DamageType[];
}

type SpellOverlay = SpellOverlayOverride | SpellOverlayDamage;
type SpellOverlayType = SpellOverlay["overlayType"];

export type {
    SpellArea,
    SpellDamage,
    SpellHeightenLayer,
    SpellHeighteningInterval,
    SpellOverlay,
    SpellOverlayOverride,
    SpellOverlayType,
    SpellSource,
    SpellSystemData,
    SpellSystemSource,
};
