import type { ModifierPF2e } from "@actor/modifiers.ts";
import type { RollOrigin, RollTarget } from "@actor/roll-context/types.ts";
import type { RollMode } from "@common/constants.d.mts";
import type { AbilityTrait } from "@item/ability/types.ts";
import type { TokenPF2e } from "@module/canvas/index.ts";
import type { CheckContextChatFlag } from "@module/chat-message/index.ts";
import type { ZeroToTwo } from "@module/data.ts";
import type { RollNotePF2e, RollNoteSource } from "@module/notes.ts";
import type { RollTwiceOption } from "./check/index.ts";
import type { CheckDC, DEGREE_OF_SUCCESS_STRINGS } from "./degree-of-success.ts";
import dice = foundry.dice;

interface DiceRollOptionsPF2e extends dice.RollOptions {
    rollerId?: string;
    totalModifier?: number;
    /** Whether to show roll formula and tooltip to players */
    showBreakdown?: boolean;
}

/** Possible parameters of a RollFunction */
interface RollParameters {
    /** The triggering event */
    event?: PointerEvent;
    /** Any options which should be used in the roll. */
    options?: string[] | Set<string>;
    /** Optional DC data for the roll */
    dc?: CheckDC | null;
    /** Callback called when the roll occurs. */
    callback?: (roll: dice.Rolled<Roll>) => void | Promise<void>;
    /** Additional modifiers */
    modifiers?: ModifierPF2e[];
    /** Whether to create a message from the roll */
    createMessage?: boolean;
}

interface AttackRollParams extends RollParameters {
    /** A target token: pulled from `game.users.targets` if not provided */
    target?: TokenPF2e | null;
    /** Retrieve the formula of the strike roll without following through to the end */
    getFormula?: true;
    /** Should this strike consume ammunition, if applicable? */
    consumeAmmo?: boolean;
    /** The strike is involve throwing a thrown melee weapon or to use the melee usage of a combination weapon */
    altUsage?: "thrown" | "melee" | null;
    /** Should this roll be rolled twice? If so, should it keep highest or lowest? */
    rollTwice?: RollTwiceOption;
}

interface DamageRollParams extends Omit<AttackRollParams, "consumeAmmo" | "rollTwice"> {
    mapIncreases?: Maybe<ZeroToTwo>;
    checkContext?: Maybe<CheckContextChatFlag>;
}

interface BaseRollContext {
    /** Any options which should be used in the roll. */
    options?: Set<string>;
    /** Any notes which should be shown for the roll. */
    notes?: (RollNotePF2e | RollNoteSource)[];
    /** The roll mode (i.e., 'roll', 'blindroll', etc) to use when rendering this roll. */
    rollMode?: RollMode | "roll";
    /** Origin data for the check, if applicable */
    origin?: RollOrigin | null;
    /** Targeting data for the check, if applicable */
    target?: RollTarget | null;
    /** Action traits associated with the roll */
    traits?: AbilityTrait[];
    /** The outcome a roll (usually relevant only to rerolls) */
    outcome?: (typeof DEGREE_OF_SUCCESS_STRINGS)[number] | null;
    /** The outcome prior to being changed by abilities raising or lowering degree of success */
    unadjustedOutcome?: (typeof DEGREE_OF_SUCCESS_STRINGS)[number] | null;
    /** Should the roll be immediately created as a chat message? */
    createMessage?: boolean;
    /** Skip the roll dialog regardless of user setting  */
    skipDialog?: boolean;
}

export type {
    AttackRollParams,
    BaseRollContext,
    DamageRollParams,
    DiceRollOptionsPF2e,
    RollParameters,
    RollTwiceOption,
};
