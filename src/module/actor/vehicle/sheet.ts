import { ActorSheetDataPF2e } from "@actor/sheet/data-types.ts";
import { VehiclePF2e } from "@actor/vehicle/index.ts";
import { AbilityItemPF2e, ItemPF2e } from "@item";
import { ActionCost, Frequency } from "@item/base/data/system.ts";
import { ErrorPF2e, getActionGlyph, getActionIcon, htmlClosest, htmlQuery, htmlQueryAll } from "@util";
import { ActorSheetPF2e } from "../sheet/base.ts";
import { AdjustedValue, getAdjustment } from "@module/sheet/helpers.ts";

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

        const actions: ActionsSheetData = {
            action: { label: game.i18n.localize("PF2E.ActionsActionsHeader"), actions: [] },
            reaction: { label: game.i18n.localize("PF2E.ActionsReactionsHeader"), actions: [] },
            free: { label: game.i18n.localize("PF2E.ActionsFreeActionsHeader"), actions: [] },
        };

        for (const item of this.actor.itemTypes.action.sort((a, b) => a.sort - b.sort)) {
            const itemData = item.toObject(false);
            const { actionCost, frequency } = item;
            const actionType = actionCost?.type ?? "free";

            const img = ((): ImageFilePath => {
                const actionIcon = getActionIcon(item.actionCost);
                const defaultIcon = ItemPF2e.getDefaultArtwork(item._source).img;
                if (item.isOfType("action") && ![actionIcon, defaultIcon].includes(item.img)) {
                    return item.img;
                }
                return item.system.selfEffect?.img ?? actionIcon;
            })();

            actions[actionType].actions.push({
                ...itemData,
                id: item.id,
                img,
                actionCost,
                glyph: actionCost ? getActionGlyph(actionCost) : null,
                frequency,
                hasEffect: !!item.system.selfEffect,
            });
        }

        return {
            ...sheetData,
            actions,
            actorSizes: CONFIG.PF2E.actorSizes,
            actorSize: CONFIG.PF2E.actorSizes[this.actor.size],
            actorRarities: CONFIG.PF2E.rarityTraits,
            actorRarity: CONFIG.PF2E.rarityTraits[this.actor.system.traits.rarity],
            ac: getAdjustment(this.actor.attributes.ac.value, this.actor._source.system.attributes.ac.value),
            saves: {
                fortitude: getAdjustment(
                    this.actor.saves.fortitude.mod,
                    this.actor._source.system.saves.fortitude.value,
                ),
            },
        };
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

interface VehicleSheetData extends ActorSheetDataPF2e<VehiclePF2e> {
    actions: ActionsSheetData;
    actorRarities: typeof CONFIG.PF2E.rarityTraits;
    actorRarity: string;
    actorSizes: typeof CONFIG.PF2E.actorSizes;
    actorSize: string;
    ac: AdjustedValue;
    saves: { fortitude: AdjustedValue };
}

type ActionsSheetData = Record<"action" | "reaction" | "free", { label: string; actions: ActionSheetData[] }>;

interface ActionSheetData extends RawObject<AbilityItemPF2e> {
    id: string;
    actionCost: ActionCost | null;
    glyph: string | null;
    frequency: Frequency | null;
    hasEffect: boolean;
}
