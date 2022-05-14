import { ActionMacros, SkillActionOptions } from "..";
import { ModifierPF2e } from "@actor/modifiers";

export function senseDirection(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacros.resolveStat(options?.skill ?? "survival");

    const modifiers = (options.modifiers ?? []).concat(
        new ModifierPF2e({
            label: "PF2E.Actions.SenseDirection.Modifier.NoCompass",
            modifier: -2,
            predicate: {
                not: ["compass-in-possession"],
            },
        })
    );

    ActionMacros.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.SenseDirection.Title",
        subtitle,
        modifiers,
        rollOptions: ["all", checkType, stat, "action:sense-direction"],
        extraOptions: ["action:sense-direction"],
        traits: ["exploration", "secret"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacros.note(selector, "PF2E.Actions.SenseDirection", "criticalSuccess"),
            ActionMacros.note(selector, "PF2E.Actions.SenseDirection", "success"),
        ],
    });
}
