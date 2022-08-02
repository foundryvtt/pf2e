import { ActionMacroHelpers, SkillActionOptions } from "..";
import { MODIFIER_TYPE, ModifierPF2e } from "@actor/modifiers";
import { CreaturePF2e } from "@actor";
import type { ActorPF2e } from "@actor/base";
import { ActorSizePF2e } from "@actor/data/size";

function determineSizeBonus(actorSize: ActorSizePF2e, targetSize: ActorSizePF2e) {
    const sizeDifference = actorSize.difference(targetSize);

    return Math.clamped(2 * sizeDifference, -4, 4);
}

export function whirlingThrow(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "athletics");

    const actors = canvas.tokens.controlled.map((token) => token.actor) as ActorPF2e[];
    const actor = actors[0];

    const targets = Array.from(game.user.targets).filter((token) => token.actor instanceof CreaturePF2e);
    const target = targets[0].actor;

    options.modifiers ||= [];

    if (target instanceof CreaturePF2e && actor instanceof CreaturePF2e) {
        const actorSize = actor.system.traits.size;
        const targetSize = target.system.traits.size;
        const sizeModifier = new ModifierPF2e(
            "Size Modifier",
            determineSizeBonus(actorSize, targetSize),
            MODIFIER_TYPE.CIRCUMSTANCE
        );
        if (sizeModifier.modifier) {
            options.modifiers.push(sizeModifier);
        }
    }

    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.WhirlingThrow.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:whirling-throw"],
        extraOptions: ["action:whirling-throw"],
        traits: ["monk"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.fortitude,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.WhirlingThrow", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.WhirlingThrow", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.WhirlingThrow", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.WhirlingThrow", "criticalFailure"),
        ],
    });
}
