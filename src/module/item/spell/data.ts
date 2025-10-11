import type { SaveType } from "@actor/types.ts";
import type { BaseItemSourcePF2e, ItemSystemData, ItemSystemSource, ItemTraits } from "@item/base/data/system.ts";
import type { EffectAreaShape } from "@item/types.ts";
import type { OneToTen, ValueAndMax, ZeroToThree } from "@module/data.ts";
import type { DamageCategoryUnique, DamageKind, DamageType, MaterialDamageEffect } from "@system/damage/index.ts";
import type { MagicTradition, SpellTrait } from "./types.ts";

type SpellSource = BaseItemSourcePF2e<"spell", SpellSystemSource>;

interface SpellSystemSource extends ItemSystemSource {
    traits: SpellTraits;
    level: { value: OneToTen };
    requirements: string;
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
        sustained: boolean;
    };
    damage: Record<string, SpellDamageSource>;
    heightening?: SpellHeighteningFixed | SpellHeighteningInterval;
    overlays?: Record<string, SpellOverlay>;
    defense: SpellDefenseSource | null;
    cost: {
        value: string;
    };
    counteraction: boolean;
    ritual: RitualData | null;
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

interface SpellTraits extends ItemTraits<SpellTrait> {
    traditions: MagicTradition[];
}

interface SpellArea {
    type: EffectAreaShape;
    value: number;
    /**
     * Legacy text information about spell effect areas:
     * if present, includes information not representable in a structured way
     */
    details?: string;
}

interface SpellDamageSource {
    formula: string;
    kinds?: DamageKind[];
    applyMod?: boolean;
    type: DamageType;
    category: DamageCategoryUnique | null;
    materials: MaterialDamageEffect[];
}

interface SpellDefenseSource {
    passive: { statistic: SpellPassiveDefense } | null;
    save: { statistic: SaveType; basic: boolean } | null;
}

type SpellPassiveDefense = "ac" | `${SaveType}-dc`;

interface SpellHeighteningInterval {
    type: "interval";
    interval: number;
    area: number;
    damage: Record<string, string>;
}

interface SpellHeighteningFixed {
    type: "fixed";
    levels: { [K in OneToTen]?: Partial<SpellSystemSource> };
}

interface SpellHeightenLayer {
    level: number;
    system: Partial<SpellSystemSource>;
}

interface SpellOverlayOverride {
    system?: Partial<Omit<SpellSystemSource, "overlays">>;
    name?: string;
    overlayType: "override";
    sort: number;
}

interface SpellSystemData
    extends Omit<SpellSystemSource, "damage" | "description">,
        Omit<ItemSystemData, "level" | "traits"> {
    /** Time and resources consumed in the casting of this spell */
    cast: SpellCastData;
    damage: Record<string, SpellDamage>;
    defense: SpellDefenseData | null;
}

interface SpellCastData {
    focusPoints: ZeroToThree;
}

interface SpellDamage extends Omit<SpellDamageSource, "kinds"> {
    kinds: Set<DamageKind>;
}

interface SpellDefenseData extends SpellDefenseSource {
    passive: { statistic: SpellPassiveDefense } | null;
}

type SpellOverlay = SpellOverlayOverride;
type SpellOverlayType = SpellOverlay["overlayType"];

interface RitualData {
    /** Details of the primary check for the ritual */
    primary: { check: string };
    /** Details of the secondary check(s) for the ritual and minimum number of casters */
    secondary: { checks: string; casters: number };
}

export type {
    SpellArea,
    SpellDamage,
    SpellDamageSource,
    SpellHeighteningInterval,
    SpellHeightenLayer,
    SpellOverlay,
    SpellOverlayOverride,
    SpellOverlayType,
    SpellPassiveDefense,
    SpellSource,
    SpellSystemData,
    SpellSystemSource,
};
