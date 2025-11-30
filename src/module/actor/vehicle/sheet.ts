import type { AbilityViewData, ActorSheetDataPF2e } from "@actor/sheet/data-types.ts";
import { createAbilityViewData } from "@actor/sheet/helpers.ts";
import type { VehiclePF2e } from "@actor/vehicle/index.ts";
import type { FormSelectOption } from "@client/applications/forms/fields.d.mts";
import type { ActorSheetOptions } from "@client/appv1/sheets/actor-sheet.d.mts";
import type { ImageFilePath } from "@common/constants.d.mts";
import { ItemPF2e } from "@item";
import { AdjustedValue, getActionIcon, getAdjustedValue } from "@module/sheet/helpers.ts";
import { ErrorPF2e, htmlClosest, htmlQuery, htmlQueryAll } from "@util";
import { ActorSheetPF2e } from "../sheet/base.ts";
import type { VehicleSystemSchema } from "./data.ts";

export class VehicleSheetPF2e extends ActorSheetPF2e<VehiclePF2e> {
    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;
        return {
            ...options,
            classes: [...options.classes, "vehicle"],
            width: 670,
            height: 520,
            tabs: [{ navSelector: ".sheet-navigation", contentSelector: ".sheet-content", initial: "details" }],
            template: `${SYSTEM_ROOT}/templates/actors/vehicle/sheet.hbs`,
        };
    }

    override async getData(): Promise<VehicleSheetData> {
        const actions: ActionsSheetData = {
            action: { label: game.i18n.localize("PF2E.ActionsActionsHeader"), actions: [] },
            reaction: { label: game.i18n.localize("PF2E.ActionsReactionsHeader"), actions: [] },
            free: { label: game.i18n.localize("PF2E.ActionsFreeActionsHeader"), actions: [] },
        };

        const actor = this.actor;
        for (const item of actor.itemTypes.action.toSorted((a, b) => a.sort - b.sort)) {
            const actionType = item.actionCost?.type ?? "free";
            actions[actionType].actions.push({
                ...createAbilityViewData(item),
                img: ((): ImageFilePath => {
                    const actionIcon = getActionIcon(item.actionCost);
                    const defaultIcon = ItemPF2e.getDefaultArtwork(item._source).img;
                    if (item.isOfType("action") && ![actionIcon, defaultIcon].includes(item.img)) {
                        return item.img;
                    }
                    return item.system.selfEffect?.img ?? actionIcon;
                })(),
            });
        }
        const description = actor.system.details.description;
        const rollData = actor.getRollData();
        const enrichedDescription = await fa.ux.TextEditor.enrichHTML(description, { rollData });

        return Object.assign(await super.getData(), {
            systemFields: actor.system.schema.fields,
            enrichedDescription,
            actions,
            actorSizes: CONFIG.PF2E.actorSizes,
            actorSize: CONFIG.PF2E.actorSizes[this.actor.size],
            actorRarities: CONFIG.PF2E.rarityTraits,
            actorRarity: CONFIG.PF2E.rarityTraits[this.actor.system.traits.rarity],
            ac: getAdjustedValue(this.actor.attributes.ac.value, this.actor._source.system.attributes.ac.value),
            frequencies: CONFIG.PF2E.frequencies,
            saves: {
                fortitude: getAdjustedValue(
                    this.actor.saves.fortitude.mod,
                    this.actor._source.system.saves.fortitude.value,
                ),
            },
            emitsSoundOptions: [
                { value: "true", label: "PF2E.Actor.Hazard.EmitsSound.True" },
                { value: "false", label: "PF2E.Actor.Hazard.EmitsSound.False" },
                { value: "encounter", label: "PF2E.Actor.Hazard.EmitsSound.Encounter" },
            ],
        });
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        // Ensure correct tab name is displayed after actor update
        const titleElem = htmlQuery(html, "nav > .panel-title");
        if (!titleElem) throw ErrorPF2e("Unexpected missing DOM element");

        const initialTitle = htmlQuery(html, ".sheet-navigation .active")?.title;
        if (initialTitle) titleElem.title = initialTitle;

        for (const element of htmlQueryAll(html, ".sheet-navigation .item")) {
            element.addEventListener("mouseover", () => {
                titleElem.textContent = element.title;
            });

            element.addEventListener("mouseout", () => {
                const parent = htmlClosest(element, ".sheet-navigation");
                const title = htmlQuery(parent, ".item.active")?.title;
                if (title) titleElem.textContent = title;
            });
        }
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

interface VehicleSheetData extends ActorSheetDataPF2e<VehiclePF2e> {
    actions: ActionsSheetData;
    actorRarities: typeof CONFIG.PF2E.rarityTraits;
    actorRarity: string;
    actorSizes: typeof CONFIG.PF2E.actorSizes;
    actorSize: string;
    ac: AdjustedValue;
    frequencies: typeof CONFIG.PF2E.frequencies;
    saves: { fortitude: AdjustedValue };
    systemFields: VehicleSystemSchema;
    emitsSoundOptions: FormSelectOption[];
}

type ActionsSheetData = Record<"action" | "reaction" | "free", { label: string; actions: AbilityViewData[] }>;
