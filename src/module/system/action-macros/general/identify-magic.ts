import {
    SingleCheckAction,
    SingleCheckActionUseOptions,
    SingleCheckActionVariant,
    SingleCheckActionVariantData,
} from "@actor/actions/index.ts";
import { CheckResultCallback } from "@system/action-macros/types.ts";

const PREFIX = "PF2E.Actions.IdentifyMagic";

class IdentifyMagicActionVariant extends SingleCheckActionVariant {
    override async use(
        options: Partial<SingleCheckActionUseOptions> & { statistic: string },
    ): Promise<CheckResultCallback[]> {
        if (!options?.statistic) {
            return Promise.reject(game.i18n.localize(`${PREFIX}.Warning.NoStatistic`));
        }
        const rollOption = `action:identify-magic:${options.statistic}`;
        options.rollOptions ??= [];
        if (!options.rollOptions.includes(rollOption)) {
            options.rollOptions.push(rollOption);
        }
        return super.use(options);
    }
}

class IdentifyMagicAction extends SingleCheckAction {
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
            slug: "identify-magic",
            statistic: ["arcana", "nature", "occultism", "religion"],
            traits: ["concentrate", "exploration", "secret"],
        });
    }

    protected override toActionVariant(data?: SingleCheckActionVariantData): SingleCheckActionVariant {
        return new IdentifyMagicActionVariant(this, data);
    }
}

const identifyMagic = new IdentifyMagicAction();

export { identifyMagic };
