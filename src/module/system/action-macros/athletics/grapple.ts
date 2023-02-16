import { ActionMacroHelpers, SkillActionOptions } from "..";
import { ModifierPF2e } from "@actor/modifiers";
import { WeaponPF2e } from "@item";

export function grapple(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "athletics");
    ActionMacroHelpers.simpleRollActionCheck<Embedded<WeaponPF2e>>({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Grapple.Title",
        subtitle,
        item: (actor) => (ActionMacroHelpers.getApplicableEquippedWeapons(actor, "grapple") ?? []).shift(),
        modifiers: (args) => {
            const modifiers: ModifierPF2e[] = [];
            if (args.item && args.item.traits.has("grapple")) {
                const modifier = ActionMacroHelpers.getWeaponPotencyModifier(args.item, stat);
                if (modifier) {
                    modifiers.push(modifier);
                }
            }
            return modifiers.concat(options.modifiers ?? []);
        },
        rollOptions: ["all", checkType, stat, "action:grapple"],
        extraOptions: ["action:grapple"],
        traits: ["attack"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.fortitude,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Grapple", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Grapple", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Grapple", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Grapple", "criticalFailure"),
        ],
    });
}
