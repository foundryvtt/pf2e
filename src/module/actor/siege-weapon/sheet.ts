import { ActorSheetPF2e } from "../sheet/base";
import { ItemDataPF2e } from "@item/data";
import { TextEditorPF2e } from "@system/text-editor";
import { tupleHasValue } from "@util";
import { SiegeWeaponPF2e } from ".";
import { SiegeWeaponSheetData } from "./types";
import { SiegeWeaponSystemData } from "./data";

export class SiegeWeaponSheetPF2e extends ActorSheetPF2e<SiegeWeaponPF2e> {
    static override get defaultOptions(): ActorSheetOptions {
        return {
            ...super.defaultOptions,
            classes: ["default", "sheet", "actor", "siege-weapon"],
            width: 670,
            height: 550,
            tabs: [{ navSelector: ".sheet-navigation", contentSelector: ".sheet-content", initial: "details" }],
            template: "systems/pf2e/templates/actors/siege-weapon/sheet.hbs",
        };
    }

    override async getData(): Promise<SiegeWeaponSheetData> {
        const sheetData = (await super.getData()) as SiegeWeaponSheetData;
        const systemData: SiegeWeaponSystemData = sheetData.data;

        sheetData.actorSizes = CONFIG.PF2E.actorSizes;
        sheetData.actorSize = sheetData.actorSizes[sheetData.data.traits.size.value];

        sheetData.actorRarities = CONFIG.PF2E.rarityTraits;
        sheetData.actorRarity = sheetData.actorRarities[sheetData.data.traits.rarity];

        sheetData.isPortable = this.actor.traits.has("portable");

        sheetData.proficiencyTypes = CONFIG.PF2E.siegeWeaponProficiencyTypes;
        sheetData.propulsionMethods = CONFIG.PF2E.siegeWeaponPropulsionMethods;

        await this.prepareItems(sheetData);

        // Enrich content
        const rollData = this.actor.getRollData();
        sheetData.enrichedContent.description = await TextEditorPF2e.enrichHTML(systemData.details.description, {
            rollData,
            async: true,
        });

        return sheetData;
    }

    override async prepareItems(sheetData: SiegeWeaponSheetData): Promise<void> {
        const actorData = sheetData.actor;

        // Actions
        const actions: Record<"action" | "reaction" | "free", { label: string; actions: ItemDataPF2e[] }> = {
            action: { label: game.i18n.localize("PF2E.ActionsActionsHeader"), actions: [] },
            reaction: { label: game.i18n.localize("PF2E.ActionsReactionsHeader"), actions: [] },
            free: { label: game.i18n.localize("PF2E.ActionsFreeActionsHeader"), actions: [] },
        };

        for (const itemData of actorData.items) {
            const item = this.actor.items.get(itemData._id, { strict: true });
            if (item.isOfType("physical")) {
                const systemData = item.system;
                itemData.showEdit = sheetData.user.isGM || systemData.identification.status === "identified";
                itemData.isInvestable = false;
                itemData.isIdentified = systemData.identification.status === "identified";
                itemData.assetValue = item.assetValue;
                itemData.showEdit = true;
            }

            // Actions
            if (itemData.type === "action") {
                const actionTypes = ["free", "reaction", "passive"] as const;
                const fromItem: string = itemData.system.actionType.value;
                const actionType = tupleHasValue(actionTypes, fromItem) ? fromItem : "action";
                if (actionType === "passive") {
                    actions.free.actions.push(itemData);
                } else {
                    actions[actionType].actions.push(itemData);
                }
            }
        }

        actorData.actions = actions;
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        {
            // ensure correct tab name is displayed after actor update
            const title = $(".sheet-navigation .active").attr("title");
            if (title) {
                $html.find(".navigation-title").text(title);
            }
        }
        $html.find(".sheet-navigation").on("mouseover", ".item", (event) => {
            const title = event.currentTarget.title;
            if (title) {
                $(event.currentTarget).parents(".sheet-navigation").find(".navigation-title").text(title);
            }
        });
        $html.find(".sheet-navigation").on("mouseout", ".item", (event) => {
            const parent = $(event.currentTarget).parents(".sheet-navigation");
            const title = parent.find(".item.active").attr("title");
            if (title) {
                parent.find(".navigation-title").text(title);
            }
        });

        // get buttons
        $html.find(".crb-tag-selector").on("click", (event) => this.onTraitSelector(event));
    }
}
