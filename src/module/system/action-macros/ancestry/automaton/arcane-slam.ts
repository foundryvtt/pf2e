import { ActionMacroHelpers, SkillActionOptions } from "../..";
import { RollNotePF2e } from "@module/notes";
import { PredicatePF2e } from "@system/predication";
import { ActorPF2e, CreaturePF2e } from "@actor";
import { MODIFIER_TYPE, ModifierPF2e } from "@actor/modifiers";

export function arcaneSlam(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "athletics");

    const { actor, token } = ActionMacroHelpers.target();

    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "D",
        title: "PF2E.Actions.ArcaneSlam.Title",
        subtitle,
        modifiers: (roller: ActorPF2e) => {
            const modifiers = options.modifiers?.length ? [...options.modifiers] : [];
            if (roller instanceof CreaturePF2e && actor instanceof CreaturePF2e) {
                const attackerSize = roller.system.traits.size;
                const targetSize = actor.system.traits.size;
                const sizeDifference = attackerSize.difference(targetSize);
                const sizeModifier = new ModifierPF2e(
                    "PF2E.Actions.ArcaneSlam.Modifier.SizeDifference",
                    Math.clamped(2 * sizeDifference, -4, 4),
                    MODIFIER_TYPE.CIRCUMSTANCE
                );
                if (sizeModifier.modifier) {
                    modifiers.push(sizeModifier);
                }
            }
            return modifiers;
        },
        rollOptions: ["all", checkType, stat, "action:arcane-slam"],
        extraOptions: ["action:arcane-slam"],
        traits: ["automaton"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.fortitude,
        extraNotes: (selector: string) => {
            const notes = [
                ActionMacroHelpers.note(selector, "PF2E.Actions.ArcaneSlam", "criticalSuccess"),
                ActionMacroHelpers.note(selector, "PF2E.Actions.ArcaneSlam", "success"),
                ActionMacroHelpers.note(selector, "PF2E.Actions.ArcaneSlam", "failure"),
                ActionMacroHelpers.note(selector, "PF2E.Actions.ArcaneSlam", "criticalFailure"),
            ];
            if (!actor) {
                const translated = game.i18n.localize("PF2E.Actions.ArcaneSlam.Notes.NoTarget");
                notes.unshift(
                    new RollNotePF2e({
                        selector,
                        text: `<p class="compact-text">${translated}</p>`,
                        predicate: new PredicatePF2e(),
                        outcome: [],
                    })
                );
            }
            return notes;
        },
        target: () => (actor && token ? { actor, token } : null),
    });
}
