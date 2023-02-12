import { ActionMacroHelpers, SkillActionOptions } from "..";
import { WeaponPF2e } from "@item";
import { ModifierPF2e } from "@actor/modifiers";

export function disarm(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "athletics");
    ActionMacroHelpers.simpleRollActionCheck<Embedded<WeaponPF2e>>({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Disarm.Title",
        subtitle,
        item: (actor) => (ActionMacroHelpers.getApplicableEquippedWeapons(actor, "disarm") ?? []).shift(),
        modifiers: (args) => {
            const modifiers: ModifierPF2e[] = [];
            if (args.item && args.item.slug !== "basic-unarmed") {
                const modifier = ActionMacroHelpers.getWeaponPotencyModifier(args.item, stat);
                if (modifier) {
                    modifiers.push(modifier);
                }
            }
            return modifiers.concat(options.modifiers ?? []);
        },
        rollOptions: ["all", checkType, stat, "action:disarm"],
        extraOptions: ["action:disarm"],
        traits: ["attack"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.reflex,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Disarm", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Disarm", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Disarm", "criticalFailure"),
        ],
    });
}
