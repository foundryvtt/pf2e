import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import {
    SingleCheckAction,
    SingleCheckActionUseOptions,
    SingleCheckActionVariant,
    SingleCheckActionVariantData,
} from "@actor/actions/index.ts";
import { CheckResultCallback } from "@system/action-macros/types.ts";

function decipherWriting(options: SkillActionOptions): void {
    if (!options?.skill) {
        ui.notifications.warn(game.i18n.localize("PF2E.Actions.DecipherWriting.Warning.NoSkill"));
        return;
    }
    const { skill: slug } = options;
    const rollOptions = ["action:decipher-writing", `action:decipher-writing:${slug}`];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.DecipherWriting.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["concentrate", "exploration", "secret"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.DecipherWriting", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.DecipherWriting", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.DecipherWriting", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.DecipherWriting", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

class DecipherWritingActionVariant extends SingleCheckActionVariant {
    override async use(
        options: Partial<SingleCheckActionUseOptions> & { statistic: string }
    ): Promise<CheckResultCallback[]> {
        if (!options?.statistic) {
            throw new Error(game.i18n.localize("PF2E.Actions.DecipherWriting.Warning.NoSkill"));
        }
        const rollOption = `action:decipher-writing:${options.statistic}`;
        options.rollOptions ??= [];
        if (!options.rollOptions.includes(rollOption)) {
            options.rollOptions.push(rollOption);
        }
        return super.use(options);
    }
}

class DecipherWritingAction extends SingleCheckAction {
    constructor() {
        super({
            description: "PF2E.Actions.DecipherWriting.Description",
            name: "PF2E.Actions.DecipherWriting.Title",
            notes: [
                { outcome: ["criticalSuccess"], text: "PF2E.Actions.DecipherWriting.Notes.criticalSuccess" },
                { outcome: ["success"], text: "PF2E.Actions.DecipherWriting.Notes.success" },
                { outcome: ["failure"], text: "PF2E.Actions.DecipherWriting.Notes.failure" },
                { outcome: ["criticalFailure"], text: "PF2E.Actions.DecipherWriting.Notes.criticalFailure" },
            ],
            rollOptions: ["action:decipher-writing"],
            slug: "decipher-writing",
            statistic: "",
            traits: ["concentrate", "exploration", "secret"],
        });
    }

    protected override toActionVariant(data?: SingleCheckActionVariantData): SingleCheckActionVariant {
        return new DecipherWritingActionVariant(this, data);
    }
}

const action = new DecipherWritingAction();

export { decipherWriting as legacy, action };
