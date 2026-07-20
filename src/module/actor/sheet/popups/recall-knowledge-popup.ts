import type { NPCPF2e } from "@actor";
import { localizeList } from "@util";

interface RecallKnowledgePopupRenderOptions extends fa.api.HandlebarsRenderOptions {
    /** An NPC to which this application should switch its focus */
    actor?: NPCPF2e;
}

class RecallKnowledgePopup extends fa.api.HandlebarsApplicationMixin<
    AbstractConstructorOf<fa.api.ApplicationV2<fa.ApplicationConfiguration, RecallKnowledgePopupRenderOptions>> & {
        DEFAULT_OPTIONS: DeepPartial<RecallKnowledgePopupConfiguration>;
    }
>(fa.api.ApplicationV2) {
    /** The NPC whose identification DCs are being displayed. Switchable via render options */
    #actor: NPCPF2e;

    constructor(options: Partial<RecallKnowledgePopupConfiguration> & { actor: NPCPF2e }) {
        super(options);
        this.#actor = options.actor;
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

    protected override _configureRenderOptions(
        options: DeepPartial<fa.api.HandlebarsRenderOptions> & Partial<RecallKnowledgePopupRenderOptions>,
    ): void {
        super._configureRenderOptions(options);
        const actor = options.actor ?? this.#actor;
        if (actor !== this.#actor) {
            delete this.#actor.apps[this.id];
            this.#actor = actor;
            // Registration with the actor on first render is handled by `_onFirstRender`
            if (!options.isFirstRender) actor.apps[this.id] = this;
        }
    }

    protected override async _onFirstRender(
        context: RecallKnowledgePopupContext,
        options: fa.ApplicationRenderOptions,
    ): Promise<void> {
        await super._onFirstRender(context, options);
        this.#actor.apps[this.id] = this;
    }

    protected override _tearDown(options: fa.ApplicationClosingOptions): void {
        delete this.#actor.apps[this.id];
        super._tearDown(options);
    }

    protected override async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<RecallKnowledgePopupContext> {
        const { skills, standard, lore } = this.#actor.identificationDCs;

        return {
            ...(await super._prepareContext(options)),
            standard: {
                label: localizeList(skills.map((s) => _loc(CONFIG.PF2E.skills[s]?.label ?? s))),
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
    actor: NPCPF2e;
}

interface RecallKnowledgePopupContext extends fa.ApplicationRenderContext {
    standard: { label: string; attempts: string[] };
    loreEasy: string[];
    loreVeryEasy: string[];
}

export { RecallKnowledgePopup };
