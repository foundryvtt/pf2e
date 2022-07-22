import { ActionMacroHelpers, SkillActionOptions } from "..";

type CreateADiversionVariant = "distracting-words" | "gesture" | "trick";

export function createADiversion(options: { variant: CreateADiversionVariant } & SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "deception");
    let title = "PF2E.Actions.CreateADiversion.";
    const traits = ["mental"];
    switch (options.variant) {
        case "distracting-words":
            title += "DistractingWords";
            traits.push("auditory", "linguistic");
            break;
        case "gesture":
            title += "Gesture";
            traits.push("manipulate");
            break;
        case "trick":
            title += "Trick";
            traits.push("manipulate");
            break;
        default: {
            const msg = game.i18n.format("PF2E.ActionsWarning.DeceptionUnknownVariant", { variant: options.variant });
            ui.notifications.error(msg);
            return;
        }
    }
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title,
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:create-a-diversion"],
        extraOptions: ["action:create-a-diversion", options.variant],
        traits: traits.sort(),
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.CreateADiversion", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.CreateADiversion", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.CreateADiversion", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.CreateADiversion", "criticalFailure"),
        ],
    });
}
