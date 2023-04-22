import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { ModifierPF2e } from "@actor/modifiers.ts";
import {
    SingleCheckAction,
    SingleCheckActionUseOptions,
    SingleCheckActionVariant,
    SingleCheckActionVariantData,
} from "@actor/actions/index.ts";
import { CheckResultCallback } from "@system/action-macros/types.ts";

function subsist(options: SkillActionOptions): void {
    if (!options?.skill) {
        ui.notifications.warn(game.i18n.localize("PF2E.Actions.Subsist.Warning.NoSkill"));
        return;
    }
    const modifiers = [
        new ModifierPF2e({
            label: "PF2E.Actions.Subsist.AfterExplorationPenalty",
            modifier: -5,
            predicate: ["action:subsist:after-exploration"],
        }),
    ].concat(options?.modifiers ?? []);
    const { skill: slug } = options;
    const rollOptions = ["action:subsist", `action:subsist:${slug}`];
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Subsist.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["downtime"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Subsist", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Subsist", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Subsist", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Subsist", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

class SubsistActionVariant extends SingleCheckActionVariant {
    override async use(options: Partial<SingleCheckActionUseOptions> = {}): Promise<CheckResultCallback[]> {
        if (!options?.statistic) {
            throw new Error(game.i18n.localize("PF2E.Actions.Subsist.Warning.NoSkill"));
        }
        const rollOption = `action:subsist:${options.statistic}`;
        options.rollOptions ??= [];
        if (!options.rollOptions.includes(rollOption)) {
            options.rollOptions.push(rollOption);
        }
        return super.use(options);
    }
}

class SubsistAction extends SingleCheckAction {
    constructor() {
        super({
            description: "PF2E.Actions.Subsist.Description",
            modifiers: [
                {
                    label: "PF2E.Actions.Subsist.AfterExplorationPenalty",
                    modifier: -5,
                    predicate: ["action:subsist:after-exploration"],
                },
            ],
            name: "PF2E.Actions.Subsist.Title",
            notes: [
                { outcome: ["criticalSuccess"], text: "PF2E.Actions.Subsist.Notes.criticalSuccess" },
                { outcome: ["success"], text: "PF2E.Actions.Subsist.Notes.success" },
                { outcome: ["failure"], text: "PF2E.Actions.Subsist.Notes.failure" },
                { outcome: ["criticalFailure"], text: "PF2E.Actions.Subsist.Notes.criticalFailure" },
            ],
            rollOptions: ["action:subsist"],
            slug: "subsist",
            statistic: "",
            traits: ["downtime"],
        });
    }

    protected override toActionVariant(data?: SingleCheckActionVariantData): SingleCheckActionVariant {
        return new SubsistActionVariant(this, data);
    }
}

const action = new SubsistAction();

export { subsist as legacy, action };
