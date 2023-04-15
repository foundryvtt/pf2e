import {
    SingleCheckAction,
    SingleCheckActionUseOptions,
    SingleCheckActionVariant,
    SingleCheckActionVariantData,
} from "@actor/actions/index.ts";
import { CheckResultCallback } from "@system/action-macros/types.ts";

class AidActionVariant extends SingleCheckActionVariant {
    override async use(options: Partial<SingleCheckActionUseOptions>): Promise<CheckResultCallback[]> {
        if (!options?.statistic) {
            throw new Error(game.i18n.localize("PF2E.Actions.Aid.Warning.NoStatistic"));
        }
        const rollOption = `action:aid:${options.statistic}`;
        options.rollOptions ??= [];
        if (!options.rollOptions.includes(rollOption)) {
            options.rollOptions.push(rollOption);
        }
        return super.use(options);
    }
}

class AidAction extends SingleCheckAction {
    constructor() {
        super({
            cost: "reaction",
            description: "PF2E.Actions.Aid.Description",
            difficultyClass: {
                value: 20,
            },
            name: "PF2E.Actions.Aid.Title",
            notes: [
                {
                    outcome: ["criticalFailure"],
                    text: "PF2E.Actions.Aid.Notes.criticalFailure",
                    title: "PF2E.Check.Result.Degree.Check.criticalFailure",
                },
                {
                    outcome: ["criticalSuccess"],
                    text: "PF2E.Actions.Aid.Notes.criticalSuccess",
                    title: "PF2E.Check.Result.Degree.Check.criticalSuccess",
                },
                {
                    outcome: ["success"],
                    text: "PF2E.Actions.Aid.Notes.success",
                    title: "PF2E.Check.Result.Degree.Check.success",
                },
            ],
            rollOptions: ["action:aid"],
            slug: "aid",
            statistic: "",
        });
    }

    protected override toActionVariant(data?: SingleCheckActionVariantData): SingleCheckActionVariant {
        return new AidActionVariant(this, data);
    }
}

const aid = new AidAction();

export { aid };
