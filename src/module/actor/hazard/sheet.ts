import { ActorSheetPF2e } from "../sheet/base";
import { ErrorPF2e } from "@module/utils";
import { HazardPF2e } from ".";
import { ConsumablePF2e } from "@item";

export class HazardSheetPF2e extends ActorSheetPF2e<HazardPF2e> {
    static override get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            classes: options.classes.concat("hazard"),
            width: 650,
            height: 680,
        });
        return options;
    }

    /** Get the HTML template path to use depending on whether this sheet is in edit mode */
    override get template(): string {
        const path = "systems/pf2e/templates/actors/";
        if (this.actor.getFlag("pf2e", "editHazard.value")) return `${path}hazard-sheet.html`;
        return `${path}hazard-sheet-no-edit.html`;
    }

    override getData(): any {
        const sheetData: any = super.getData();

        // Update save labels
        for (const key of ["fortitude", "reflex", "will"] as const) {
            sheetData.data.saves[key].label = CONFIG.PF2E.saves[key];
        }

        sheetData.flags = sheetData.actor.flags;
        if (sheetData.flags.editHazard === undefined) sheetData.flags.editHazard = { value: false };

        sheetData.hazardTraits = CONFIG.PF2E.hazardTraits;
        sheetData.actorTraits = (sheetData.data.traits.traits || {}).value;

        sheetData.rarity = CONFIG.PF2E.rarityTraits;

        sheetData.actorRarities = CONFIG.PF2E.rarityTraits;
        sheetData.actorRarity = sheetData.actorRarities[sheetData.data.traits.rarity.value];

        sheetData.stealthDC = (sheetData.data.attributes.stealth?.value ?? 0) + 10;
        sheetData.hasStealthDescription = sheetData.data.attributes.stealth?.details || false;

        sheetData.hasImmunities = sheetData.data.traits.di.value.length ? sheetData.data.traits.di.value : false;
        sheetData.hasResistances = sheetData.data.traits.dr.length ? Array.isArray(sheetData.data.traits.dr) : false;
        sheetData.hasWeaknesses = sheetData.data.traits.dv.length ? Array.isArray(sheetData.data.traits.dv) : false;
        sheetData.hasDescription = sheetData.data.details.description || false;
        sheetData.hasDisable = sheetData.data.details.disable || false;
        sheetData.hasRoutineDetails = sheetData.data.details.routine || false;
        sheetData.hasResetDetails = sheetData.data.details.reset || false;
        sheetData.hasHPDetails = sheetData.data.attributes.hp.details || false;
        sheetData.hasWillSave = sheetData.data.saves.will.value !== 0 || false;

        sheetData.brokenThreshold = Math.floor(sheetData.data.attributes.hp.max / 2);

        return sheetData;
    }

    override prepareItems(sheetData: any): void {
        const actorData = sheetData.actor;
        // Actions
        const attacks = {
            melee: { label: "NPC Melee Attack", items: [], type: "melee" },
            ranged: { label: "NPC Ranged Attack", items: [], type: "melee" },
        };

        // Actions
        const actions = {
            action: { label: "Actions", actions: [] },
            reaction: { label: "Reactions", actions: [] },
            free: { label: "Free Actions", actions: [] },
            passive: { label: "Passive Actions", actions: [] },
        };

        // Iterate through items, allocating to containers
        for (const i of actorData.items) {
            i.img = i.img || CONST.DEFAULT_TOKEN;

            // NPC Generic Attacks
            if (i.type === "melee") {
                const weaponType = (i.data.weaponType || {}).value || "melee";
                const isAgile = (i.data.traits.value || []).includes("agile");
                i.data.bonus.total = parseInt(i.data.bonus.value, 10) || 0;
                i.data.isAgile = isAgile;

                // get formated traits for read-only npc sheet
                const traits: { label: string; description: string }[] = [];
                if ((i.data.traits.value || []).length !== 0) {
                    for (let j = 0; j < i.data.traits.value.length; j++) {
                        const traitsObject = {
                            label:
                                CONFIG.PF2E.weaponTraits[i.data.traits.value[j]] ||
                                i.data.traits.value[j].charAt(0).toUpperCase() + i.data.traits.value[j].slice(1),
                            description: CONFIG.PF2E.traitsDescriptions[i.data.traits.value[j]] || "",
                        };
                        traits.push(traitsObject);
                    }
                }
                i.traits = traits.filter((p) => !!p);

                attacks[weaponType].items.push(i);
            }

            // Actions
            else if (i.type === "action") {
                const actionType = i.data.actionType.value || "action";
                i.img = HazardPF2e.getActionGraphics(
                    actionType,
                    parseInt((i.data.actions || {}).value, 10) || 1
                ).imageUrl;

                // get formated traits for read-only npc sheet
                const traits: { label: string; description: string }[] = [];
                if ((i.data.traits.value || []).length !== 0) {
                    for (let j = 0; j < i.data.traits.value.length; j++) {
                        const traitsObject = {
                            label:
                                CONFIG.PF2E.weaponTraits[i.data.traits.value[j]] ||
                                i.data.traits.value[j].charAt(0).toUpperCase() + i.data.traits.value[j].slice(1),
                            description: CONFIG.PF2E.traitsDescriptions[i.data.traits.value[j]] || "",
                        };
                        traits.push(traitsObject);
                    }
                }
                if (i.data.actionType.value) {
                    traits.push({
                        label:
                            CONFIG.PF2E.weaponTraits[i.data.actionType.value] ||
                            i.data.actionType.value.charAt(0).toUpperCase() + i.data.actionType.value.slice(1),
                        description: CONFIG.PF2E.traitsDescriptions[i.data.actionType.value] || "",
                    });
                }
                i.traits = traits.filter((p) => !!p);

                actions[actionType].actions.push(i);
            }
        }

        // Assign and return
        actorData.actions = actions;
        actorData.attacks = attacks;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers
    /* -------------------------------------------- */

    override activateListeners(html: JQuery): void {
        super.activateListeners(html);

        // Melee Attack summaries
        html.find(".item .melee-name h4").on("click", (event) => {
            this.onItemSummary(event);
        });

        // NPC Weapon Rolling
        html.find("button").on("click", (event) => {
            event.preventDefault();
            event.stopPropagation();

            const itemId = $(event.currentTarget).parents(".item").attr("data-item-id") ?? "";
            const item = this.actor.items.get(itemId);
            if (!item) {
                throw ErrorPF2e(`Item ${itemId} not found`);
            }

            // which function gets called depends on the type of button stored in the dataset attribute action
            switch (event.target.dataset.action) {
                case "weaponAttack":
                    item.rollWeaponAttack(event);
                    break;
                case "weaponAttack2":
                    item.rollWeaponAttack(event, 2);
                    break;
                case "weaponAttack3":
                    item.rollWeaponAttack(event, 3);
                    break;
                case "weaponDamage":
                    item.rollWeaponDamage(event);
                    break;
                case "weaponDamageCritical":
                    item.rollWeaponDamage(event, true);
                    break;
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
                case "spellAttack":
                    item.rollSpellAttack(event);
                    break;
                case "spellDamage":
                    item.rollSpellDamage(event);
                    break;
                case "consume":
                    if (item instanceof ConsumablePF2e) item.consume();
                    break;
                default:
                    throw new Error("Unknown action type");
            }
        });

        if (!this.options.editable) return;

        html.find<HTMLInputElement>(".isHazardEditable").on("change", (event) => {
            this.actor.setFlag("pf2e", "editHazard", { value: event.target.checked });
        });
    }
}
