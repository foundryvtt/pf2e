import { StrikeData } from "@actor/data/base.ts";
import { ActorSheetPF2e, SheetClickActionHandlers } from "@actor/sheet/base.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import { htmlClosest, htmlQuery, tagify, traitSlugToObject } from "@util";
import type { HazardPF2e } from "./document.ts";
import { HazardActionSheetData, HazardSaveSheetData, HazardSheetData } from "./types.ts";

export class HazardSheetPF2e extends ActorSheetPF2e<HazardPF2e> {
    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;
        fu.mergeObject(options, {
            classes: [...options.classes, "hazard"],
            scrollY: ["section.content"],
            width: 700,
            height: 680,
        });
        return options;
    }

    override get template(): string {
        return "systems/pf2e/templates/actors/hazard/sheet.hbs";
    }

    override get title(): string {
        if (this.editing) {
            return game.i18n.format("PF2E.Actor.Hazard.TitleEdit", { name: super.title });
        }

        return super.title;
    }

    get editing(): boolean {
        return this.options.editable && !!this.actor.getFlag("pf2e", "editHazard.value");
    }

    override async getData(options?: ActorSheetOptions): Promise<HazardSheetData> {
        const sheetData = await super.getData(options);

        sheetData.actor.flags.editHazard ??= { value: false };
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
            return TextEditor.enrichHTML(content ?? "", { rollData, async: true });
        };

        sheetData.enrichedContent = fu.mergeObject(sheetData.enrichedContent, {
            stealthDetails: await enrich(system.attributes.stealth.details),
            description: await enrich(system.details.description),
            disable: await enrich(system.details.disable),
            routine: await enrich(system.details.routine),
            reset: await enrich(system.details.reset),
        });

        const strikesWithDescriptions: (StrikeData & { damageFormula?: string })[] = system.actions;
        const actorRollData = actor.getRollData();
        for (const attack of strikesWithDescriptions) {
            const itemRollData = attack.item.getRollData();
            if (attack.description.length > 0) {
                attack.description = await TextEditor.enrichHTML(attack.description, {
                    rollData: { ...actorRollData, ...itemRollData },
                    async: true,
                });
            }
            attack.damageFormula = String(await attack.damage?.({ getFormula: true }));
        }

        return {
            ...sheetData,
            actions: this.#prepareActions(),
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
        const traitsEl = html.querySelector<HTMLInputElement>('input[name="system.traits.value"]');
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
            return name ? this.activateEditor(name) : null;
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
