import { ActorSheetPF2e } from "@actor/sheet/base";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types";
import { SAVE_TYPES } from "@actor/values";
import { ConsumablePF2e, SpellPF2e } from "@item";
import { ItemDataPF2e } from "@item/data";
import { ErrorPF2e, tagify } from "@util";
import { HazardPF2e } from ".";
import { HazardSystemData } from "./data";
import { HazardActionSheetData, HazardSaveSheetData, HazardSheetData } from "./types";

export class HazardSheetPF2e extends ActorSheetPF2e<HazardPF2e> {
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
        const enrich = async (content: string): Promise<string> => {
            return TextEditor.enrichHTML(content, { rollData, async: true });
        };
        sheetData.enrichedContent = mergeObject(sheetData.enrichedContent, {
            stealthDetails: await enrich(systemData.attributes.stealth.details),
            description: await enrich(systemData.details.description),
            disable: await enrich(systemData.details.disable),
            routine: await enrich(systemData.details.routine),
            reset: await enrich(systemData.details.reset),
        });

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
            hasDescription: !!systemData.details.description.trim(),
            hasDisable: !!systemData.details.disable.trim(),
            hasRoutineDetails: !!systemData.details.routine.trim(),
            hasResetDetails: !!systemData.details.reset.trim(),
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

    override async prepareItems(sheetData: ActorSheetDataPF2e<HazardPF2e>): Promise<void> {
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
                const weaponType: "melee" | "ranged" = itemData.system.weaponType.value || "melee";
                const traits: string[] = itemData.system.traits.value;
                const isAgile = traits.includes("agile");
                itemData.attackRollType = weaponType === "melee" ? "PF2E.NPCAttackMelee" : "PF2E.NPCAttackRanged";
                itemData.system.bonus.total = Number(itemData.system.bonus.value) || 0;
                itemData.system.isAgile = isAgile;

                // get formated traits for read-only npc sheet
                itemData.traits = traits.map((trait) => ({
                    label: weaponTraits[trait] ?? trait.charAt(0).toUpperCase() + trait.slice(1),
                    description: traitsDescriptions[trait] ?? "",
                }));

                // Enrich description
                const item = this.actor.items.get(itemData._id);
                const rollData = { ...this.actor.getRollData(), ...item?.getRollData() };
                itemData.system.description.value = await TextEditor.enrichHTML(itemData.system.description.value, {
                    rollData,
                    async: true,
                });

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
        const html = $html[0]!;
        super.activateListeners($html);

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
            const baseValue: number = getProperty(this.actor._source, propertyPath);
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
