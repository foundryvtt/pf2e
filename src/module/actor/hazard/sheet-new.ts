import { ActorSheetPF2e } from "../sheet/base";
import { ErrorPF2e } from "@util";
import { HazardPF2e } from ".";
import { ConsumablePF2e, SpellPF2e } from "@item";
import { ItemDataPF2e } from "@item/data";
import { SAVE_TYPES } from "@actor/data";
import { HazardSystemData } from "./data";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types";

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

    override async getData() {
        const sheetData = await super.getData();

        // Update save labels
        for (const key of SAVE_TYPES) {
            if (!sheetData.data.saves[key]) continue;
            sheetData.data.saves[key].label = CONFIG.PF2E.saves[key];
        }
        sheetData.actor.flags.editHazard ??= { value: false };
        const systemData: HazardSystemData = sheetData.data;

        for (const weakness of systemData.traits.dv) {
            weakness.label = CONFIG.PF2E.weaknessTypes[weakness.type];
        }
        for (const resistance of systemData.traits.dr) {
            resistance.label = CONFIG.PF2E.resistanceTypes[resistance.type];
        }

        return {
            ...sheetData,
            editing: this.editing,
            flags: sheetData.actor.flags,
            hazardTraits: CONFIG.PF2E.hazardTraits,
            actorTraits: systemData.traits.traits.value,
            rarity: CONFIG.PF2E.rarityTraits,
            rarityLabel: CONFIG.PF2E.rarityTraits[this.actor.rarity],
            stealthDC: (systemData.attributes.stealth?.value ?? 0) + 10,
            hasStealthDescription: systemData.attributes.stealth?.details || false,
            hasImmunities: systemData.traits.di.value.length ? systemData.traits.di.value : false,
            hasResistances: systemData.traits.dr.length > 0,
            hasWeaknesses: systemData.traits.dv.length > 0,
            hasDescription: systemData.details.description || false,
            hasDisable: systemData.details.disable || false,
            hasRoutineDetails: systemData.details.routine || false,
            hasResetDetails: systemData.details.reset || false,
            hasHPDetails: systemData.attributes.hp.details || false,
            hasWillSave: !!systemData.saves.will,
            brokenThreshold: Math.floor(systemData.attributes.hp.max / 2),
        };
    }

    override prepareItems(sheetData: ActorSheetDataPF2e<HazardPF2e>): void {
        const actorData = sheetData.actor;
        // Actions
        type AttackData = { label: string; items: ItemDataPF2e[]; type: "melee" };
        const attacks: Record<"melee" | "ranged", AttackData> = {
            melee: { label: "NPC Melee Attack", items: [], type: "melee" },
            ranged: { label: "NPC Ranged Attack", items: [], type: "melee" },
        };

        // Actions
        type ActionData = { label: string; actions: ItemDataPF2e[] };
        const actions: Record<string, ActionData> = {
            action: { label: "Actions", actions: [] },
            reaction: { label: "Reactions", actions: [] },
            free: { label: "Free Actions", actions: [] },
            passive: { label: "Passive Actions", actions: [] },
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

            // Actions
            else if (itemData.type === "action") {
                const actionType = itemData.data.actionType.value || "action";
                itemData.img = HazardPF2e.getActionGraphics(
                    actionType,
                    Number(itemData.data.actions.value) || 1
                ).imageUrl;

                // get formated traits for read-only npc sheet
                const traits: string[] = itemData.data.traits.value;
                const traitObjects = traits.map((trait) => ({
                    label: weaponTraits[trait] || trait.charAt(0).toUpperCase() + trait.slice(1),
                    description: traitsDescriptions[trait] ?? "",
                }));
                if (itemData.data.actionType.value) {
                    const actionType: string = itemData.data.actionType.value;
                    traitObjects.push({
                        label: weaponTraits[actionType] || actionType.charAt(0).toUpperCase() + actionType.slice(1),
                        description: traitsDescriptions[actionType] ?? "",
                    });
                }
                itemData.traits = traitObjects;

                actions[actionType].actions.push(itemData);
            }
        }

        // Assign and return
        actorData.actions = actions;
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
