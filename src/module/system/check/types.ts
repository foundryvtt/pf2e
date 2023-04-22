import { ActorPF2e } from "@actor";
import { RollTarget } from "@actor/types.ts";
import { ItemPF2e } from "@item";
import { ZeroToTwo } from "@module/data.ts";
import { RollSubstitution } from "@module/rules/synthetics.ts";
import { TokenDocumentPF2e } from "@scene/token-document/index.ts";
import { CheckDC, DegreeOfSuccessAdjustment } from "@system/degree-of-success.ts";
import { BaseRollContext } from "@system/rolls.ts";

type RollTwiceOption = "keep-higher" | "keep-lower" | false;

type AttackCheck = "attack-roll" | "spell-attack-roll";
type CheckType =
    | "check"
    | "counteract-check"
    | "initiative"
    | "skill-check"
    | "perception-check"
    | "saving-throw"
    | "flat-check"
    | AttackCheck;

interface CheckRollContext extends BaseRollContext {
    /** The type of this roll, like 'perception-check' or 'saving-throw'. */
    type?: CheckType;
    /** Targeting data for the check, if applicable */
    target?: RollTarget | null;
    /** Should this roll be rolled twice? If so, should it keep highest or lowest? */
    rollTwice?: RollTwiceOption;
    /** The actor which initiated this roll. */
    actor?: ActorPF2e;
    /** The token which initiated this roll. */
    token?: TokenDocumentPF2e | null;
    /** The originating item of this attack, if any */
    item?: ItemPF2e<ActorPF2e> | null;
    /** Optional title of the roll options dialog; defaults to the check name */
    title?: string;
    /** Optional DC data for the check */
    dc?: CheckDC | null;
    /** The domains this roll had, for reporting purposes */
    domains?: string[];
    /** Is the roll a reroll? */
    isReroll?: boolean;
    /** The number of MAP increases for this roll */
    mapIncreases?: Maybe<ZeroToTwo>;
    /** D20 results substituted for an actual roll */
    substitutions?: RollSubstitution[];
    /** Is the weapon used in this attack roll an alternative usage? */
    altUsage?: Maybe<"thrown" | "melee">;
    /** Degree of success adjustments from synthetics and hard-coded sources */
    dosAdjustments?: DegreeOfSuccessAdjustment[];
}

export { AttackCheck, CheckType, CheckRollContext, RollTwiceOption };
