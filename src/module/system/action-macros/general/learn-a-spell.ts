import {
    SingleCheckAction,
    SingleCheckActionUseOptions,
    SingleCheckActionVariant,
    SingleCheckActionVariantData,
} from "@actor/actions/index.ts";
import { CheckResultCallback } from "@system/action-macros/types.ts";

const PREFIX = "PF2E.Actions.LearnASpell";

class LearnASpellActionVariant extends SingleCheckActionVariant {
    override async use(options: Partial<SingleCheckActionUseOptions>): Promise<CheckResultCallback[]> {
        if (!options?.statistic) {
            return Promise.reject(game.i18n.localize(`${PREFIX}.Warning.NoSkill`));
        }
        const rollOption = `action:learn-a-spell:${options.statistic}`;
        options.rollOptions ??= [];
        if (!options.rollOptions.includes(rollOption)) {
            options.rollOptions.push(rollOption);
        }
        return super.use(options);
    }
}

class LearnASpellAction extends SingleCheckAction {
    constructor() {
        super({
            description: `${PREFIX}.Description`,
            name: `${PREFIX}.Title`,
            notes: [
                { outcome: ["criticalSuccess"], text: `${PREFIX}.Notes.criticalSuccess` },
                { outcome: ["success"], text: `${PREFIX}.Notes.success` },
                { outcome: ["failure"], text: `${PREFIX}.Notes.failure` },
                { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
            ],
            section: "skill",
            slug: "learn-a-spell",
            statistic: ["arcana", "nature", "occultism", "religion"],
            traits: ["concentrate", "exploration"],
        });
    }

    protected override toActionVariant(data?: SingleCheckActionVariantData): SingleCheckActionVariant {
        return new LearnASpellActionVariant(this, data);
    }
}

const learnASpell = new LearnASpellAction();

export { learnASpell };
