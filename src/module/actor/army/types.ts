import { RollFunction } from "@actor/data/base.ts";
import { ALIGNMENTS } from "./values.ts";
import { AttackRollParams } from "@system/rolls.ts";

type Alignment = SetElement<typeof ALIGNMENTS>;

/** Data for an army strike. Deals 1 damage on a hit, 2 on a crit (usually) */
interface ArmyStrike {
    slug: string;
    label: string;
    type: "strike";
    /** Roll to attack with the given strike (with no MAP; see `variants` for MAPs.) */
    variants: { mod: number; roll: RollFunction<AttackRollParams> }[];
}

export type { Alignment, ArmyStrike };
