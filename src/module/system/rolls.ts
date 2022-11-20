import { AttackTarget } from "@actor/creature/types";
import { TraitViewData } from "@actor/data/base";
import { StrikeLookupData } from "@module/chat-message/data";
import { ZeroToThree } from "@module/data";
import { RollNotePF2e, RollNoteSource } from "@module/notes";
import { DamageCategorization, DamageRollContext, DamageRollModifiersDialog, DamageTemplate } from "@system/damage";
import { ModifierPF2e } from "../actor/modifiers";
import { RollTwiceOption } from "./check";
import { CheckDC, DEGREE_OF_SUCCESS_STRINGS } from "./degree-of-success";

interface RollDataPF2e extends RollData {
    rollerId?: string;
    totalModifier?: number;
    degreeOfSuccess?: ZeroToThree;
    strike?: StrikeLookupData;
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

interface StrikeRollParams extends RollParameters {
    /** Retrieve the formula of the strike roll without following through to the end */
    getFormula?: true;
    /** The strike is involve throwing a thrown melee weapon or to use the melee usage of a combination weapon */
    altUsage?: "thrown" | "melee" | null;
    /** Should this roll be rolled twice? If so, should it keep highest or lowest? */
    rollTwice?: RollTwiceOption;
}

interface BaseRollContext {
    /** Any options which should be used in the roll. */
    options?: Set<string>;
    /** Any notes which should be shown for the roll. */
    notes?: (RollNotePF2e | RollNoteSource)[];
    /** The roll mode (i.e., 'roll', 'blindroll', etc) to use when rendering this roll. */
    rollMode?: RollMode;
    /** If this is an attack, the target of that attack */
    target?: AttackTarget | null;
    /** Any traits for the check. */
    traits?: TraitViewData[];
    /** The outcome a roll (usually relevant only to rerolls) */
    outcome?: typeof DEGREE_OF_SUCCESS_STRINGS[number] | null;
    /** The outcome prior to being changed by abilities raising or lowering degree of success */
    unadjustedOutcome?: typeof DEGREE_OF_SUCCESS_STRINGS[number] | null;
    /** Should the roll be immediately created as a chat message? */
    createMessage?: boolean;
    /** Skip the roll dialog regardless of user setting  */
    skipDialog?: boolean;
}

class DamageRollPF2e {
    static async roll(damage: DamageTemplate, context: DamageRollContext, callback?: Function) {
        // Change the base damage type in case it was overridden
        const baseDamageType = damage.formula[context.outcome ?? "success"]?.data.baseDamageType;
        damage.base.damageType = baseDamageType ?? damage.base.damageType;
        damage.base.category = DamageCategorization.fromDamageType(damage.base.damageType);

        // Change default roll mode to blind GM roll if the "secret" option is specified
        if (context.options.has("secret")) {
            context.secret = true;
        }

        await DamageRollModifiersDialog.roll(damage, context, callback);
    }
}

export { BaseRollContext, DamageRollPF2e, RollDataPF2e, RollParameters, RollTwiceOption, StrikeRollParams };
