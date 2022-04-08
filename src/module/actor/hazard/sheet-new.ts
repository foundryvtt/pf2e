import { ActorSheetPF2e } from "../sheet/base";
import { ErrorPF2e, objectHasKey } from "@util";
import { HazardPF2e } from ".";
import { ConsumablePF2e, SpellPF2e } from "@item";
import { ItemDataPF2e } from "@item/data";
import { SAVE_TYPES } from "@actor/data";
import { HazardSystemData } from "./data";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types";
import { HazardActionSheetData, HazardSaveSheetData, HazardSheetData } from "./types";

/** In development version of the hazard sheet. */
export class HazardSheetGreenPF2e extends ActorSheetPF2e<HazardPF2e> {
    static override get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            classes: ["default", "sheet", "hazard", "actor"],
            width: 700,
            height: 680,
        });
        return options;
    }

    override get template(): string {
        return "systems/pf2e/templates/actors/hazard/sheet-new.html";
    }

    get editing() {
        return this.options.editable && !!this.actor.getFlag("pf2e", "editHazard.value");
    }

    override async getData(): Promise<HazardSheetData> {
        const sheetData = await super.getData();

        // Update save labels
        for (const key of SAVE_TYPES) {
            if (!sheetData.data.saves[key]) continue;
            sheetData.data.saves[key].label = CONFIG.PF2E.saves[key];
        }
        sheetData.actor.flags.editHazard ??= { value: false };
        const systemData: HazardSystemData = sheetData.data;
        const actor = this.actor;

        return {
            ...sheetData,
            actions: this.prepareActions(),
            editing: this.editing,
            actorTraits: systemData.traits.traits.value,
            rarity: CONFIG.PF2E.rarityTraits,
            rarityLabel: CONFIG.PF2E.rarityTraits[this.actor.rarity],
            brokenThreshold: systemData.attributes.hp.brokenThreshold,
            saves: this.prepareSaves(),

            // Hazard visibility, in order of appearance on the sheet
            hasHPDetails: !!systemData.attributes.hp.details.trim(),
            hasSaves: Object.keys(actor.saves ?? {}).length > 0,
            hasImmunities: systemData.traits.di.value.length > 0,
            hasResistances: systemData.traits.dr.length > 0,
            hasWeaknesses: systemData.traits.dv.length > 0,
            hasStealthDescription: !!systemData.attributes.stealth?.details,
            hasDescription: !!systemData.details.description.trim(),
            hasDisable: !!systemData.details.disable.trim(),
            hasRoutineDetails: !!systemData.details.routine.trim(),
            hasResetDetails: !!systemData.details.reset.trim(),
        };
    }

    private prepareActions() {
        const actions: HazardActionSheetData = {
            action: { label: "Actions", actions: [] },
            reaction: { label: "Reactions", actions: [] },
            free: { label: "Free Actions", actions: [] },
            passive: { label: "Passive Actions", actions: [] },
        };

        for (const item of this.actor.itemTypes.action) {
            const actionType = item.actionCost?.type || "passive";
            if (objectHasKey(actions, actionType)) {
                actions[actionType].actions.push(item);
            }
        }

        return actions;
    }

    private prepareSaves(): HazardSaveSheetData[] {
        if (!this.actor.saves) return [];

        const results: HazardSaveSheetData[] = [];
        for (const saveType of SAVE_TYPES) {
            const save = this.actor.saves[saveType];
            if (this.editing || save) {
                results.push({
                    label: CONFIG.PF2E.saves[saveType],
                    type: saveType,
                    mod: save?.check.mod,
                });
            }
        }

        return results;
    }

    override prepareItems(sheetData: ActorSheetDataPF2e<HazardPF2e>): void {
        const actorData = sheetData.actor;
        // Actions
        type AttackData = { label: string; items: ItemDataPF2e[]; type: "melee" };
        const attacks: Record<"melee" | "ranged", AttackData> = {
            melee: { label: "NPC Melee Attack", items: [], type: "melee" },
            ranged: { label: "NPC Ranged Attack", items: [], type: "melee" },
        };

        // Iterate through items, allocating to containers
        const weaponTraits: Record<string, string> = CONFIG.PF2E.weaponTraits;
        const traitsDescriptions: Record<string, string | undefined> = CONFIG.PF2E.traitsDescriptions;
        for (const itemData of actorData.items) {
            itemData.img = itemData.img || CONST.DEFAULT_TOKEN;

            // NPC Generic Attacks
            if (itemData.type === "melee") {
                const weaponType: "melee" | "ranged" = itemData.data.weaponType.value || "melee";
                const traits: string[] = itemData.data.traits.value;
                const isAgile = traits.includes("agile");
                itemData.data.bonus.total = Number(itemData.data.bonus.value) || 0;
                itemData.data.isAgile = isAgile;

                // get formated traits for read-only npc sheet
                itemData.traits = traits.map((trait) => ({
                    label: weaponTraits[trait] ?? trait.charAt(0).toUpperCase() + trait.slice(1),
                    description: traitsDescriptions[trait] ?? "",
                }));
                attacks[weaponType].items.push(itemData);
            }
        }

        // Assign
        actorData.attacks = attacks;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        $html.find(".edit-button").on("click", () => {
            this.actor.setFlag("pf2e", "editHazard.value", !this.editing);
        });

        // NPC Weapon Rolling
        $html.find("button").on("click", (event) => {
            event.preventDefault();
            event.stopPropagation();

            const itemId = $(event.currentTarget).parents(".item").attr("data-item-id") ?? "";
            const item = this.actor.items.get(itemId);
            if (!item) {
                throw ErrorPF2e(`Item ${itemId} not found`);
            }
            const spell = item instanceof SpellPF2e ? item : item instanceof ConsumablePF2e ? item.embeddedSpell : null;

            // which function gets called depends on the type of button stored in the dataset attribute action
            switch (event.target.dataset.action) {
                case "npcAttack":
                    item.rollNPCAttack(event);
                    break;
                case "npcAttack2":
                    item.rollNPCAttack(event, 2);
                    break;
                case "npcAttack3":
                    item.rollNPCAttack(event, 3);
                    break;
                case "npcDamage":
                    item.rollNPCDamage(event);
                    break;
                case "npcDamageCritical":
                    item.rollNPCDamage(event, true);
                    break;
                case "spellAttack": {
                    spell?.rollAttack(event);
                    break;
                }
                case "spellDamage": {
                    spell?.rollDamage(event);
                    break;
                }
                case "consume":
                    if (item instanceof ConsumablePF2e) item.consume();
                    break;
                default:
                    throw new Error("Unknown action type");
            }
        });

        if (!this.options.editable) return;

        $html.find<HTMLInputElement>(".isHazardEditable").on("change", (event) => {
            this.actor.setFlag("pf2e", "editHazard", { value: event.target.checked });
        });
    }
}
