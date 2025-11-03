import { ActorPF2e, NPCPF2e } from "@actor";
import {
    SingleCheckAction,
    SingleCheckActionUseOptions,
    SingleCheckActionVariant,
    SingleCheckActionVariantData,
} from "@actor/actions/index.ts";
import { TokenPF2e } from "@module/canvas/index.ts";
import { ActionMacroHelpers } from "@system/action-macros/index.ts";
import { CheckResultCallback } from "@system/action-macros/types.ts";
import { objectHasKey } from "@util/misc.ts";

const PREFIX = "PF2E.Actions.RecallKnowledge";

interface RecallKnowledgeActionUseOptions extends Partial<SingleCheckActionUseOptions> {
    statistic: string;
}

class RecallKnowledgeActionVariant extends SingleCheckActionVariant {
    override async use(options: RecallKnowledgeActionUseOptions): Promise<CheckResultCallback[]> {
        // ensure a statistic is provided
        if (!options?.statistic) {
            throw new Error(game.i18n.localize(`${PREFIX}.Warning.NoSkill`));
        }
        const rollOption = `action:recall-knowledge:${options.statistic}`;
        options.rollOptions ??= [];
        if (!options.rollOptions.includes(rollOption)) {
            options.rollOptions.push(rollOption);
        }

        // default to creature identification if difficulty class is omitted and an NPC is targeted
        if (!options.difficultyClass) {
            const target =
                options.target instanceof ActorPF2e
                    ? options.target
                    : options.target instanceof TokenPF2e
                      ? options.target.actor
                      : ActionMacroHelpers.target()?.actor;
            if (target instanceof NPCPF2e && objectHasKey(CONFIG.PF2E.skills, options.statistic)) {
                const identification = target.identificationDCs;
                if (identification.skills.includes(options.statistic)) {
                    options.difficultyClass = {
                        value: identification.standard.dc,
                        visible: false,
                    };
                }
            }
        }

        return super.use(options);
    }
}

class RecallKnowledgeAction extends SingleCheckAction {
    constructor() {
        super({
            cost: 1,
            description: `${PREFIX}.Description`,
            name: `${PREFIX}.Title`,
            notes: [
                { outcome: ["criticalSuccess"], text: `${PREFIX}.Notes.criticalSuccess` },
                { outcome: ["success"], text: `${PREFIX}.Notes.success` },
                { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
            ],
            sampleTasks: {
                untrained: `${PREFIX}.SampleTasks.Untrained`,
                trained: `${PREFIX}.SampleTasks.Trained`,
                expert: `${PREFIX}.SampleTasks.Expert`,
                master: `${PREFIX}.SampleTasks.Master`,
                legendary: `${PREFIX}.SampleTasks.Legendary`,
            },
            section: "skill",
            slug: "recall-knowledge",
            statistic: ["arcana", "crafting", "medicine", "nature", "occultism", "religion", "society"],
            traits: ["concentrate", "secret"],
        });
    }

    protected override toActionVariant(data?: SingleCheckActionVariantData): RecallKnowledgeActionVariant {
        return new RecallKnowledgeActionVariant(this, data);
    }
}

const recallKnowledge = new RecallKnowledgeAction();

export { recallKnowledge };
