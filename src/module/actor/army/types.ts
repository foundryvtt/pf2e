import { DamageRollFunction, RollFunction } from "@actor/data/base.ts";
import { AttackRollParams } from "@system/rolls.ts";

/** Data for an army strike. Deals 1 damage on a hit, 2 on a crit (usually) */
interface ArmyStrike {
    slug: string;
    label: string;
    type: "strike";
    /** The glyph for this strike (how many actions it takes, reaction, etc). */
    glyph: string;
    /** Roll to attack with the given strike (with no MAP; see `variants` for MAPs.) */
    variants: { mod: number; roll: RollFunction<AttackRollParams> }[];
    damage: DamageRollFunction;
    critical: DamageRollFunction;
}

export type { ArmyStrike };
