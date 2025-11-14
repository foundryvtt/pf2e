import { ActorSheetPF2e, SheetClickActionHandlers } from "@actor/sheet/base.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import type { ActorSheetOptions } from "@client/appv1/sheets/actor-sheet.d.mts";
import { createNPCAttackTraitsAndTags } from "@module/sheet/helpers.ts";
import { HTMLTagifyTagsElement } from "@system/html-elements/tagify-tags.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import { htmlClosest, htmlQuery } from "@util/dom.ts";
import { tagify, traitSlugToObject } from "@util/tags.ts";
import type { HazardPF2e } from "./document.ts";
import { HazardActionSheetData, HazardAttackSheedData, HazardSaveSheetData, HazardSheetData } from "./types.ts";

export class HazardSheetPF2e extends ActorSheetPF2e<HazardPF2e> {
    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;
        return {
            ...options,
            classes: [...options.classes, "hazard"],
            scrollY: ["section.content"],
            width: 710,
            height: 680,
            template: `${SYSTEM_ROOT}/templates/actors/hazard/sheet.hbs`,
        };
    }

    override get title(): string {
        return this.editing ? game.i18n.format("PF2E.Actor.Hazard.TitleEdit", { name: super.title }) : super.title;
    }

    get editing(): boolean {
        return this.isEditable && !!this.actor.getFlag("pf2e", "editHazard.value");
    }

    override async getData(options?: ActorSheetOptions): Promise<HazardSheetData> {
        const sheetData = await super.getData(options);

        const system = sheetData.data;
        const actor = this.actor;

        const hasDefenses = actor.hasDefenses;
        const hasImmunities = system.attributes.immunities.length > 0;
        const hasResistances = system.attributes.resistances.length > 0;
        const hasWeaknesses = system.attributes.weaknesses.length > 0;
        const hasIWR = hasDefenses || hasImmunities || hasResistances || hasWeaknesses;

        // Enrich content
        const rollData = this.actor.getRollData();
        const enrich = async (content?: string): Promise<string> => {
            return TextEditorPF2e.enrichHTML(content ?? "", { rollData });
        };

        sheetData.enrichedContent = fu.mergeObject(sheetData.enrichedContent, {
            stealthDetails: await enrich(system.attributes.stealth.details),
            description: await enrich(system.details.description),
            disable: await enrich(system.details.disable),
            routine: await enrich(system.details.routine),
            reset: await enrich(system.details.reset),
        });

        return {
            ...sheetData,
            attacks: await this.#prepareAttacks(),
            actions: this.#prepareActions(),
            complexityOptions: [
                { value: "false", label: "PF2E.Actor.Hazard.Simple" },
                { value: "true", label: "PF2E.TraitComplex" },
            ],
            emitsSoundOptions: [
                { value: "true", label: "PF2E.Actor.Hazard.EmitsSound.True" },
                { value: "false", label: "PF2E.Actor.Hazard.EmitsSound.False" },
                { value: "encounter", label: "PF2E.Actor.Hazard.EmitsSound.Encounter" },
            ],
            editing: this.editing,
            actorTraits: system.traits.value.map((t) => traitSlugToObject(t, CONFIG.PF2E.hazardTraits)),
            rarity: CONFIG.PF2E.rarityTraits,
            rarityLabel: CONFIG.PF2E.rarityTraits[this.actor.rarity],
            brokenThreshold: system.attributes.hp.brokenThreshold,
            saves: this.#prepareSaves(),

            // Hazard visibility, in order of appearance on the sheet
            hasDefenses,
            hasHPDetails: !!system.attributes.hp.details,
            hasSaves: Object.keys(actor.saves ?? {}).length > 0,
            hasIWR,
            hasStealth: system.attributes.stealth.dc !== null,
            hasDescription: !!system.details.description?.trim(),
            hasDisable: !!system.details.disable?.trim(),
            hasRoutineDetails: !!system.details.routine?.trim(),
            hasResetDetails: !!system.details.reset?.trim(),
        };
    }

    async #prepareAttacks() {
        const actor = this.actor;
        const results: HazardAttackSheedData[] = [];
        for (const attack of actor.system.actions) {
            const description =
                attack.description.length > 0
                    ? await TextEditorPF2e.enrichHTML(attack.description, { rollData: attack.item.getRollData() })
                    : null;

            results.push({
                description,
                damageFormula: String(await attack.damage?.({ getFormula: true })),
                breakdown: attack.type === "strike" ? attack.breakdown : attack.statistic.dc.breakdown,
                additionalEffects: attack.additionalEffects,
                attackRollType: attack.attackRollType,
                glyph: attack.glyph,
                variants: attack.variants,
                item: attack.item,
                traitsAndTags: createNPCAttackTraitsAndTags(attack.item),
            });
        }

        return results;
    }

    #prepareActions(): HazardActionSheetData {
        const actions = this.actor.itemTypes.action.sort((a, b) => a.sort - b.sort);
        return {
            reaction: actions.filter((a) => a.actionCost?.type === "reaction"),
            action: actions.filter((a) => a.actionCost?.type !== "reaction"),
        };
    }

    #prepareSaves(): HazardSaveSheetData[] {
        if (!this.actor.saves) return [];

        const results: HazardSaveSheetData[] = [];
        for (const saveType of SAVE_TYPES) {
            const save = this.actor.saves[saveType];
            if (this.editing || save) {
                results.push({
                    label: game.i18n.localize(`PF2E.Saves${saveType.titleCase()}Short`),
                    type: saveType,
                    mod: save?.check.mod,
                });
            }
        }

        return results;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        // Tagify the traits selection
        const traitsEl = htmlQuery<HTMLTagifyTagsElement>(html, 'tagify-tags[name="system.traits.value"]');
        if (traitsEl) {
            const tags = tagify(traitsEl, { whitelist: CONFIG.PF2E.hazardTraits });
            const traitsPrepend = html.querySelector<HTMLTemplateElement>(".traits-extra");
            if (traitsPrepend) {
                tags.DOM.scope.prepend(traitsPrepend.content);
            }
        }
    }

    protected override activateClickListener(html: HTMLElement): SheetClickActionHandlers {
        const handlers = super.activateClickListener(html);

        handlers["toggle-edit-mode"] = () => {
            return this.actor.update({ "flags.pf2e.editHazard.value": !this.editing });
        };

        handlers["edit-section"] = (event) => {
            const container = htmlClosest(event.target, ".section-container");
            const name = htmlQuery(container, "[data-edit]")?.dataset.edit;
            const active = this.editors[name ?? ""]?.active;
            return name && !active ? this.activateEditor(name) : null;
        };

        return handlers;
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // Change emitsSound values of "true" and "false" to booleans
        const emitsSound = formData["system.attributes.emitsSound"];
        if (emitsSound !== "encounter") {
            formData["system.attributes.emitsSound"] = emitsSound === "true";
        }

        return super._updateObject(event, formData);
    }
}
