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
            scrollY: [".container > section"],
            width: 700,
            height: 680,
        });
        return options;
    }

    override get template(): string {
        return "systems/pf2e/templates/actors/hazard/sheet-new.html";
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

        const hasHealth = !!actor.hitPoints?.max;
        const hasImmunities = systemData.traits.di.value.length > 0;
        const hasResistances = systemData.traits.dr.length > 0;
        const hasWeaknesses = systemData.traits.dv.length > 0;
        const hasIWR = hasHealth || hasImmunities || hasResistances || hasWeaknesses;
        const stealthMod = actor.data.data.attributes.stealth.value;
        const stealthDC = stealthMod ? stealthMod + 10 : null;
        const hasStealthDescription = !!systemData.attributes.stealth?.details;

        return {
            ...sheetData,
            actions: this.prepareActions(),
            editing: this.editing,
            actorTraits: systemData.traits.traits.value,
            rarity: CONFIG.PF2E.rarityTraits,
            rarityLabel: CONFIG.PF2E.rarityTraits[this.actor.rarity],
            brokenThreshold: systemData.attributes.hp.brokenThreshold,
            stealthDC,
            saves: this.prepareSaves(),

            // Hazard visibility, in order of appearance on the sheet
            hasHealth,
            hasHPDetails: !!systemData.attributes.hp.details.trim(),
            hasSaves: Object.keys(actor.saves ?? {}).length > 0,
            hasIWR,
            hasStealth: stealthDC !== null || hasStealthDescription,
            hasStealthDescription,
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
                    label: game.i18n.localize(`PF2E.Saves${saveType.titleCase()}Short`),
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
        const attacks: ItemDataPF2e[] = [];

        // Iterate through items, allocating to containers
        const weaponTraits: Record<string, string> = CONFIG.PF2E.npcAttackTraits;
        const traitsDescriptions: Record<string, string | undefined> = CONFIG.PF2E.traitsDescriptions;
        for (const itemData of actorData.items) {
            itemData.img = itemData.img || CONST.DEFAULT_TOKEN;

            // NPC Generic Attacks
            if (itemData.type === "melee") {
                const weaponType: "melee" | "ranged" = itemData.data.weaponType.value || "melee";
                const traits: string[] = itemData.data.traits.value;
                const isAgile = traits.includes("agile");
                itemData.attackRollType = weaponType === "melee" ? "PF2E.NPCAttackMelee" : "PF2E.NPCAttackRanged";
                itemData.data.bonus.total = Number(itemData.data.bonus.value) || 0;
                itemData.data.isAgile = isAgile;

                // get formated traits for read-only npc sheet
                itemData.traits = traits.map((trait) => ({
                    label: weaponTraits[trait] ?? trait.charAt(0).toUpperCase() + trait.slice(1),
                    description: traitsDescriptions[trait] ?? "",
                }));
                attacks.push(itemData);
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

        // Toggle Edit mode
        $html.find(".edit-mode-button").on("click", () => {
            this.actor.setFlag("pf2e", "editHazard.value", !this.editing);
        });

        // Handlers for number inputs of properties subject to modification by AE-like rules elements
        $html.find<HTMLInputElement>("input[data-property]").on("focus", (event) => {
            const $input = $(event.target);
            const propertyPath = $input.attr("data-property") ?? "";
            const baseValue: number = getProperty(this.actor.data._source, propertyPath);
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
                const preparedValue = getProperty(this.actor.data, propertyPath);
                $input.val(preparedValue !== null && preparedValue >= 0 ? `+${preparedValue}` : preparedValue);
            }
        });

        $html.find('[data-action="edit-section"]').on("click", (event) => {
            const $parent = $(event.target).closest(".section-container");
            const name = $parent.find("[data-edit]").attr("data-edit");
            if (name) {
                this.activateEditor(name);
            }
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
