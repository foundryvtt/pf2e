import { ActionsPF2e, SkillActionOptions } from "../actions";

export function hide(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "stealth");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Hide.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:hide"],
        extraOptions: ["action:hide"],
        traits: ["secret"],
        checkType,
        event: options.event,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [ActionsPF2e.note(selector, "PF2E.Actions.Hide", "success")],
    });
}
