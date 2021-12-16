import { ActionsPF2e, SkillActionOptions } from "../actions";

export function tumbleThrough(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "acrobatics");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.TumbleThrough.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:tumble-through"],
        extraOptions: ["action:tumble-through"],
        traits: ["move"],
        checkType,
        event: options.event,
        difficultyClassStatistic: (target) => target.saves.reflex,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.TumbleThrough", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.TumbleThrough", "failure"),
        ],
    });
}
