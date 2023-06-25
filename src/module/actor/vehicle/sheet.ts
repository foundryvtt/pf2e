import { ActorSheetPF2e } from "../sheet/base.ts";
import { VehiclePF2e } from "@actor/vehicle/index.ts";
import { ErrorPF2e, getActionIcon, htmlClosest, htmlQuery, htmlQueryAll } from "@util";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types.ts";
import { ActionItemPF2e } from "@item";

export class VehicleSheetPF2e extends ActorSheetPF2e<VehiclePF2e> {
    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;
        return {
            ...options,
            classes: [...options.classes, "vehicle"],
            width: 670,
            height: 480,
            tabs: [{ navSelector: ".sheet-navigation", contentSelector: ".sheet-content", initial: "details" }],
            template: "systems/pf2e/templates/actors/vehicle/sheet.hbs",
        };
    }

    override async getData(): Promise<VehicleSheetData> {
        const sheetData = await super.getData();

        return {
            ...sheetData,
            actorSizes: CONFIG.PF2E.actorSizes,
            actorSize: CONFIG.PF2E.actorSizes[this.actor.size],
            actorRarities: CONFIG.PF2E.rarityTraits,
            actorRarity: CONFIG.PF2E.rarityTraits[this.actor.system.traits.rarity],
            ac: getAdjustment(this.actor.attributes.ac.value, this.actor._source.system.attributes.ac.value),
            saves: {
                fortitude: getAdjustment(
                    this.actor.saves.fortitude.mod,
                    this.actor._source.system.saves.fortitude.value
                ),
            },
        };
    }

    override async prepareItems(sheetData: VehicleSheetData): Promise<void> {
        const actorData = sheetData.actor;

        // Actions
        const actions: Record<"action" | "reaction" | "free", { label: string; actions: RawObject<ActionItemPF2e>[] }> =
            {
                action: { label: game.i18n.localize("PF2E.ActionsActionsHeader"), actions: [] },
                reaction: { label: game.i18n.localize("PF2E.ActionsReactionsHeader"), actions: [] },
                free: { label: game.i18n.localize("PF2E.ActionsFreeActionsHeader"), actions: [] },
            };

        // Actions
        for (const item of this.actor.itemTypes.action.sort((a, b) => a.sort - b.sort)) {
            const itemData = item.toObject(false);
            const img = getActionIcon(item.actionCost);
            const actionType = item.actionCost?.type ?? "free";
            actions[actionType].actions.push({ ...itemData, img });
        }

        actorData.actions = actions;
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        // Ensure correct tab name is displayed after actor update
        const titleElem = htmlQuery(html, ".navigation-title");
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
}

function getAdjustment(value: number, reference: number): AdjustedValue {
    const adjustmentClass = value > reference ? "adjusted-higher" : value < reference ? "adjusted-lower" : null;
    return { value, adjustmentClass };
}

interface AdjustedValue {
    value: number;
    adjustmentClass: "adjusted-higher" | "adjusted-lower" | null;
}

interface VehicleSheetData extends ActorSheetDataPF2e<VehiclePF2e> {
    actorRarities: typeof CONFIG.PF2E.rarityTraits;
    actorRarity: string;
    actorSizes: typeof CONFIG.PF2E.actorSizes;
    actorSize: string;
    ac: AdjustedValue;
    saves: { fortitude: AdjustedValue };
}
