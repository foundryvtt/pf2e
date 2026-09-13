import type { SkillSlug } from "@actor/types.ts";
import { getIdentificationAdjustment, getIdentificationData, type IdentificationData } from "@item/identification.ts";
import type { PhysicalItemPF2e } from "@item/physical/index.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { dcAdjustmentOptions, type DCAdjustment } from "@module/dc.ts";
import { htmlQuery, objectHasKey, signedInteger } from "@util";

class IdentifyItemPopup extends fa.api.HandlebarsApplicationMixin<
    AbstractConstructorOf<fa.api.ApplicationV2<IdentifyPopupConfiguration>> & {
        DEFAULT_OPTIONS: DeepPartial<IdentifyPopupConfiguration>;
    }
>(fa.api.ApplicationV2) {
    declare options: IdentifyPopupConfiguration;

    adjustment!: DCAdjustment;

    constructor(item: PhysicalItemPF2e, options: DeepPartial<fa.ApplicationConfiguration> = {}) {
        const existing = foundry.applications.instances.get(`identify-item-${item.uuid}`);
        if (existing instanceof IdentifyItemPopup) return existing;

        super({ ...options, item });
        this.adjustment = getIdentificationAdjustment(item);
    }

    /** Identification DCs for the currently selected adjustment */
    get data(): IdentificationData {
        return getIdentificationData(this.item, {
            pwol: game.pf2e.settings.variants.pwol.enabled,
            notMatchingTraditionModifier: game.settings.get(SYSTEM_ID, "identifyMagicNotMatchingTraditionModifier"),
            adjustment: this.adjustment,
        });
    }

    get item(): PhysicalItemPF2e {
        return this.options.item;
    }

    protected override _initializeApplicationOptions(
        options: Partial<IdentifyPopupConfiguration>,
    ): IdentifyPopupConfiguration {
        const initialized = super._initializeApplicationOptions(options);
        initialized.uniqueId = `identify-item-${initialized.item.uuid}`;
        return initialized;
    }

    /** Register with the item so that its deletion closes this application */
    protected override async _onFirstRender(
        context: IdentifyPopupContext,
        options: fa.ApplicationRenderOptions,
    ): Promise<void> {
        await super._onFirstRender(context, options);
        this.item.apps[this.id] = this;
    }

    protected override _tearDown(options: fa.ApplicationClosingOptions): void {
        delete this.item.apps[this.id];
        super._tearDown(options);
    }

    static override DEFAULT_OPTIONS: DeepPartial<IdentifyPopupConfiguration> = {
        id: "{id}",
        classes: ["identify-popup", "column-buttons"],
        position: { width: "auto" },
        window: { title: "PF2E.identification.Identify", contentClasses: ["standard-form"] },
        actions: {
            postSkillChecks: IdentifyItemPopup.#onClickPostSkillChecks,
            updateIdentification: IdentifyItemPopup.#onClickUpdateIdentification,
        },
    };

    static override PARTS: Record<string, fa.api.HandlebarsTemplatePart> = {
        base: { template: `systems/${SYSTEM_ID}/templates/actors/identify-item.hbs`, root: true },
    };

    protected override async _prepareContext(options: fa.ApplicationRenderOptions): Promise<IdentifyPopupContext> {
        const item = this.item;
        const data = this.data;
        const offTradition = new Set<string>(data.offTradition);
        const modifier = game.settings.get(SYSTEM_ID, "identifyMagicNotMatchingTraditionModifier");
        const breakdown = (skill: string): string => {
            const parts = [_loc("PF2E.identification.Breakdown.Base", { level: item.level, dc: data.base })];
            if (data.adjusted !== data.base) {
                parts.push(
                    _loc("PF2E.identification.Breakdown.Adjustment", {
                        adjustment: _loc(CONFIG.PF2E.dcAdjustments[data.adjustment]).titleCase(),
                        value: signedInteger(data.adjusted - data.base),
                    }),
                );
            }
            if (offTradition.has(skill) && modifier) {
                parts.push(_loc("PF2E.identification.Breakdown.OffTradition", { value: signedInteger(modifier) }));
            }
            return parts.join(" · ");
        };

        return {
            ...(await super._prepareContext(options)),
            id: this.id,
            item,
            isMagic: item.isMagical,
            isAlchemical: item.isAlchemical,
            adjustment: this.adjustment,
            adjustments: dcAdjustmentOptions(),
            rows: Object.entries(data.dcs).map(([skill, dc]) => ({
                skill,
                label: CONFIG.PF2E.skills[skill as SkillSlug]?.label ?? skill,
                dc,
                breakdown: breakdown(skill),
            })),
        };
    }

    /** Recompute DCs on difficulty adjustment change */
    protected override async _onRender(
        context: IdentifyPopupContext,
        options: fa.ApplicationRenderOptions,
    ): Promise<void> {
        await super._onRender(context, options);
        const select = htmlQuery<HTMLSelectElement>(this.element, "select[data-adjustment]");
        select?.addEventListener("change", () => {
            if (objectHasKey(CONFIG.PF2E.dcAdjustments, select.value)) {
                this.adjustment = select.value;
                this.render();
            }
        });
    }

    /** Post the item's unidentified image and name along with its identification DCs to chat */
    static async #onClickPostSkillChecks(this: IdentifyItemPopup): Promise<void> {
        const item = this.item;
        const identifiedName = item.system.identification.identified.name;
        const dcs: Record<string, number> = this.data.dcs;
        const action = item.isMagical ? "identify-magic" : item.isAlchemical ? "identify-alchemy" : "recall-knowledge";

        const path = `systems/${SYSTEM_ID}/templates/actors/identify-item-chat-skill-checks.hbs`;
        const content = await fa.handlebars.renderTemplate(path, {
            identifiedName,
            action,
            skills: dcs,
            unidentified: item.system.identification.unidentified,
            uuid: item.uuid,
        });

        await ChatMessagePF2e.create({ author: game.user.id, content });
    }

    static async #onClickUpdateIdentification(
        this: IdentifyItemPopup,
        _event: PointerEvent,
        target: HTMLElement,
    ): Promise<void> {
        // Read the attribute rather than the property: `instanceof` fails for a detached window's elements
        if (target.getAttribute("value") === "identified") {
            await this.item.setIdentificationStatus("identified");
        }
        await this.close();
    }
}

interface IdentifyPopupConfiguration extends fa.ApplicationConfiguration {
    item: PhysicalItemPF2e;
}

interface IdentifyPopupContext extends fa.ApplicationRenderContext {
    id: string;
    item: PhysicalItemPF2e;
    isMagic: boolean;
    isAlchemical: boolean;
    adjustment: DCAdjustment;
    adjustments: { value: DCAdjustment; label: string }[];
    rows: { skill: string; label: string; dc: number; breakdown: string }[];
}

export { IdentifyItemPopup };
