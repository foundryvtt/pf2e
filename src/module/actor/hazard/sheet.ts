import { StrikeData } from "@actor/data/base";
import { ActorSheetPF2e } from "@actor/sheet/base";
import { SAVE_TYPES } from "@actor/values";
import { tagify } from "@util";
import { HazardPF2e } from ".";
import { HazardSystemData } from "./data";
import { HazardActionSheetData, HazardSaveSheetData, HazardSheetData } from "./types";

export class HazardSheetPF2e extends ActorSheetPF2e<HazardPF2e> {
    static override get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            classes: [...options.classes, "hazard"],
            scrollY: [".container > section"],
            width: 700,
            height: 680,
        });
        return options;
    }

    override get template(): string {
        return "systems/pf2e/templates/actors/hazard/sheet.html";
    }

    override get title() {
        if (this.editing) {
            return game.i18n.format("PF2E.Actor.Hazard.TitleEdit", { name: super.title });
        }

        return super.title;
    }

    get editing() {
        return this.options.editable && !!this.actor.getFlag("pf2e", "editHazard.value");
    }

    override async getData(): Promise<HazardSheetData> {
        const sheetData = await super.getData();

        sheetData.actor.flags.editHazard ??= { value: false };
        const systemData: HazardSystemData = sheetData.data;
        const actor = this.actor;

        const hasDefenses = !!actor.hitPoints?.max || !!actor.attributes.ac.value;
        const hasImmunities = systemData.traits.di.value.length > 0;
        const hasResistances = systemData.traits.dr.length > 0;
        const hasWeaknesses = systemData.traits.dv.length > 0;
        const hasIWR = hasDefenses || hasImmunities || hasResistances || hasWeaknesses;
        const stealthMod = actor.system.attributes.stealth.value;
        const stealthDC = typeof stealthMod === "number" ? stealthMod + 10 : null;
        const hasStealthDescription = !!systemData.attributes.stealth?.details;

        // Enrich content
        const rollData = this.actor.getRollData();
        const enrich = async (content?: string): Promise<string> => {
            return TextEditor.enrichHTML(content ?? "", { rollData, async: true });
        };

        sheetData.enrichedContent = mergeObject(sheetData.enrichedContent, {
            stealthDetails: await enrich(systemData.attributes.stealth.details),
            description: await enrich(systemData.details.description),
            disable: await enrich(systemData.details.disable),
            routine: await enrich(systemData.details.routine),
            reset: await enrich(systemData.details.reset),
        });

        const strikesWithDescriptions: StrikeData[] = sheetData.data.actions.filter(
            (s: StrikeData) => s.description.length > 0
        );
        const actorRollData = actor.getRollData();
        for (const attack of strikesWithDescriptions) {
            const itemRollData = attack.item.getRollData();
            attack.description = await TextEditor.enrichHTML(attack.description, {
                rollData: { ...actorRollData, ...itemRollData },
                async: true,
            });
        }

        return {
            ...sheetData,
            actions: this.prepareActions(),
            editing: this.editing,
            actorTraits: systemData.traits.value,
            rarity: CONFIG.PF2E.rarityTraits,
            rarityLabel: CONFIG.PF2E.rarityTraits[this.actor.rarity],
            brokenThreshold: systemData.attributes.hp.brokenThreshold,
            stealthDC,
            saves: this.prepareSaves(),

            // Hazard visibility, in order of appearance on the sheet
            hasDefenses,
            hasHPDetails: !!systemData.attributes.hp.details.trim(),
            hasSaves: Object.keys(actor.saves ?? {}).length > 0,
            hasIWR,
            hasStealth: stealthDC !== null || hasStealthDescription,
            hasStealthDescription,
            hasDescription: !!systemData.details.description?.trim(),
            hasDisable: !!systemData.details.disable?.trim(),
            hasRoutineDetails: !!systemData.details.routine?.trim(),
            hasResetDetails: !!systemData.details.reset?.trim(),
        };
    }

    private prepareActions(): HazardActionSheetData {
        const actions = this.actor.itemTypes.action.sort((a, b) => a.sort - b.sort);
        return {
            reaction: actions.filter((a) => a.actionCost?.type === "reaction"),
            action: actions.filter((a) => a.actionCost?.type !== "reaction"),
        };
    }

    private prepareSaves(): HazardSaveSheetData[] {
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
        const html = $html[0]!;

        // Tagify the traits selection
        const traitsEl = html.querySelector<HTMLInputElement>('input[name="system.traits.value"]');
        if (traitsEl) {
            const tags = tagify(traitsEl, { whitelist: CONFIG.PF2E.hazardTraits });
            const traitsPrepend = html.querySelector<HTMLTemplateElement>(".traits-extra");
            if (traitsPrepend) {
                tags.DOM.scope.prepend(traitsPrepend.content);
            }
        }

        // Toggle Edit mode
        $html.find(".edit-mode-button").on("click", () => {
            this.actor.setFlag("pf2e", "editHazard.value", !this.editing);
        });

        // Handlers for number inputs of properties subject to modification by AE-like rules elements
        $html.find<HTMLInputElement>("input[data-property]").on("focus", (event) => {
            const $input = $(event.target);
            const propertyPath = $input.attr("data-property") ?? "";
            const baseValue = Number(getProperty(this.actor._source, propertyPath));
            $input.val(baseValue).attr({ name: propertyPath });
        });

        $html.find<HTMLInputElement>("input[data-property]").on("blur", (event) => {
            const $input = $(event.target);
            $input.removeAttr("name").removeAttr("style").attr({ type: "text" });
            const propertyPath = $input.attr("data-property") ?? "";
            const valueAttr = $input.attr("data-value");
            if (valueAttr) {
                $input.val(valueAttr);
            } else {
                const preparedValue = Number(getProperty(this.actor, propertyPath));
                $input.val(preparedValue !== null && preparedValue >= 0 ? `+${preparedValue}` : preparedValue);
            }
        });

        $html.find("[data-action=edit-section]").on("click", (event) => {
            const $parent = $(event.target).closest(".section-container");
            const name = $parent.find("[data-edit]").attr("data-edit");
            if (name) {
                this.activateEditor(name);
            }
        });

        const $hint = $html.find(".emits-sound i.hint");
        $hint.tooltipster({
            maxWidth: 275,
            position: "right",
            theme: "crb-hover",
            content: game.i18n.localize("PF2E.Actor.Hazard.EmitsSound.Hint"),
        });

        if (!this.options.editable) return;

        $html.find<HTMLInputElement>(".isHazardEditable").on("change", (event) => {
            this.actor.setFlag("pf2e", "editHazard", { value: event.target.checked });
        });
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // Change emitsSound values of "true" and "false" to booleans
        const emitsSound = formData["system.attributes.emitsSound"];
        if (emitsSound !== "encounter") {
            formData["system.attributes.emitsSound"] = emitsSound === "true";
        }

        return super._updateObject(event, formData);
    }
}
