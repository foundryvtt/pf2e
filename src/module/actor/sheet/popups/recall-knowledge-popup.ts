import type { CreatureIdentificationData } from "@module/recall-knowledge.ts";
import { localizeList } from "@util";

class RecallKnowledgePopup extends fa.api.HandlebarsApplicationMixin(fa.api.ApplicationV2) {
    #identificationData: CreatureIdentificationData;

    constructor(
        options: Partial<RecallKnowledgePopupConfiguration> &
            Required<Pick<RecallKnowledgePopupConfiguration, "identificationData">>,
    ) {
        super(options);
        this.#identificationData = options.identificationData;
    }

    static override DEFAULT_OPTIONS: DeepPartial<RecallKnowledgePopupConfiguration> = {
        id: "recall-knowledge-breakdown",
        position: { width: 600 },
        window: {
            title: "PF2E.RecallKnowledge.BreakdownTitle",
        },
    };

    static override PARTS: Record<string, fa.api.HandlebarsTemplatePart> = {
        base: { template: `systems/${SYSTEM_ID}/templates/actors/recall-knowledge.hbs`, root: true },
    };

    protected override async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<RecallKnowledgePopupContext> {
        const { skills, standard, lore } = this.#identificationData;

        return {
            ...(await super._prepareContext(options)),
            standard: {
                label: localizeList(skills.map((s) => game.i18n.localize(CONFIG.PF2E.skills[s].label))),
                attempts: this.#padAttempts(standard.progression),
            },
            loreEasy: this.#padAttempts(lore[0].progression),
            loreVeryEasy: this.#padAttempts(lore[1].progression),
        };
    }

    #padAttempts(attempts: number[]): string[] {
        const result = attempts.map((a) => a.toString());
        for (let i = result.length; i < 6; i++) {
            result.push("-");
        }
        return result;
    }
}

interface RecallKnowledgePopupConfiguration extends fa.ApplicationConfiguration {
    identificationData: CreatureIdentificationData;
}

interface RecallKnowledgePopupContext extends fa.ApplicationRenderContext {
    standard: { label: string; attempts: string[] };
    loreEasy: string[];
    loreVeryEasy: string[];
}

export { RecallKnowledgePopup };
