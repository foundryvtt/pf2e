import { TraitViewData } from "@actor/data/base.ts";
import { ModifierPF2e } from "@actor/modifiers.ts";
import { RollTarget } from "@actor/types.ts";
import { TokenPF2e } from "@module/canvas/index.ts";
import { ZeroToTwo } from "@module/data.ts";
import { RollNotePF2e, RollNoteSource } from "@module/notes.ts";
import { RollTwiceOption } from "./check/index.ts";
import { CheckDC, DEGREE_OF_SUCCESS_STRINGS } from "./degree-of-success.ts";

interface RollDataPF2e extends RollOptions {
    rollerId?: string;
    totalModifier?: number;
}

/** Possible parameters of a RollFunction */
interface RollParameters {
    /** The triggering event */
    event?: JQuery.TriggeredEvent;
    /** Any options which should be used in the roll. */
    options?: string[] | Set<string>;
    /** Optional DC data for the roll */
    dc?: CheckDC | null;
    /** Callback called when the roll occurs. */
    callback?: (roll: Rolled<Roll>) => void;
    /** Additional modifiers */
    modifiers?: ModifierPF2e[];
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

interface DamageRollParams extends Omit<AttackRollParams, "consumAmmo" | "rollTwice"> {
    mapIncreases?: ZeroToTwo | null;
}

interface BaseRollContext {
    /** Any options which should be used in the roll. */
    options?: Set<string>;
    /** Any notes which should be shown for the roll. */
    notes?: (RollNotePF2e | RollNoteSource)[];
    /** The roll mode (i.e., 'roll', 'blindroll', etc) to use when rendering this roll. */
    rollMode?: RollMode | "roll";
    /** If this is an attack, the target of that attack */
    target?: RollTarget | null;
    /** Any traits for the check. */
    traits?: TraitViewData[];
    /** The outcome a roll (usually relevant only to rerolls) */
    outcome?: (typeof DEGREE_OF_SUCCESS_STRINGS)[number] | null;
    /** The outcome prior to being changed by abilities raising or lowering degree of success */
    unadjustedOutcome?: (typeof DEGREE_OF_SUCCESS_STRINGS)[number] | null;
    /** Should the roll be immediately created as a chat message? */
    createMessage?: boolean;
    /** Skip the roll dialog regardless of user setting  */
    skipDialog?: boolean;
}

export { AttackRollParams, BaseRollContext, DamageRollParams, RollDataPF2e, RollParameters, RollTwiceOption };
