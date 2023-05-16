import { ActionMacroHelpers, SkillActionOptions } from "../../index.ts";
import { RollNotePF2e } from "@module/notes.ts";
import { PredicatePF2e } from "@system/predication.ts";
import { CreaturePF2e } from "@actor";
import { ModifierPF2e } from "@actor/modifiers.ts";

export function arcaneSlam(options: SkillActionOptions): void {
    const { actor: target, token } = ActionMacroHelpers.target();
    const slug = options?.skill ?? "acrobatics";
    const rollOptions = ["action:arcane-slam"];
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "D",
        title: "PF2E.Actions.ArcaneSlam.Title",
        checkContext: (opts) => {
            const modifiers = options.modifiers?.length ? [...options.modifiers] : [];
            if (opts.actor instanceof CreaturePF2e && opts.target instanceof CreaturePF2e) {
                const attackerSize = opts.actor.system.traits.size;
                const targetSize = opts.target.system.traits.size;
                const sizeDifference = attackerSize.difference(targetSize);
                const sizeModifier = new ModifierPF2e(
                    "PF2E.Actions.ArcaneSlam.Modifier.SizeDifference",
                    Math.clamped(2 * sizeDifference, -4, 4),
                    "circumstance"
                );
                if (sizeModifier.modifier) {
                    modifiers.push(sizeModifier);
                }
            }
            return ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug });
        },
        traits: ["automaton"],
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
            if (!target) {
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
        target: () => (target && token ? { actor: target, token } : null),
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}
