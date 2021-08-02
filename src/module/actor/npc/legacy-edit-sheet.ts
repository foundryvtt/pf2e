import { CreatureSheetPF2e } from "../creature/sheet";
import { SKILL_DICTIONARY } from "@actor/data/values";
import { NPCPF2e } from ".";
import { identifyCreature } from "@module/recall-knowledge";
import { RecallKnowledgePopup } from "../sheet/popups/recall-knowledge-popup";
import { getActionIcon, objectHasKey } from "@module/utils";
import { ConsumablePF2e, SpellcastingEntryPF2e } from "@item";
import { SpellcastingSheetData } from "./sheet";

export class NPCLegacyEditSheetPF2e extends CreatureSheetPF2e<NPCPF2e> {
    static override get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            classes: options.classes.concat("npc-sheet"),
            width: 650,
            height: 680,
            showUnpreparedSpells: true,
        });
        return options;
    }

    /** Get the correct HTML template path to use for rendering this particular sheet */
    override get template(): string {
        const path = "systems/pf2e/templates/actors/";
        return `${path}npc-sheet.html`;
    }

    /** Add some extra data when rendering the sheet to reduce the amount of logic required within the template. */
    override getData() {
        const sheetData = super.getData();

        sheetData.monsterTraits = CONFIG.PF2E.monsterTraits;

        // recall knowledge DCs
        const proficiencyWithoutLevel = game.settings.get("pf2e", "proficiencyVariant") === "ProficiencyWithoutLevel";
        const identifyCreatureData = identifyCreature(sheetData, { proficiencyWithoutLevel });

        sheetData.identifyCreatureData = identifyCreatureData;
        sheetData.identifySkillDC = identifyCreatureData.skill.dc;
        sheetData.identifySkillAdjustment = CONFIG.PF2E.dcAdjustments[identifyCreatureData.skill.start];
        sheetData.identifySkillProgression = identifyCreatureData.skill.progression.join("/");
        sheetData.identificationSkills = Array.from(identifyCreatureData.skills)
            .sort()
            .map((skillAcronym) => CONFIG.PF2E.skills[skillAcronym]);

        sheetData.specificLoreDC = identifyCreatureData.specificLoreDC.dc;
        sheetData.specificLoreAdjustment = CONFIG.PF2E.dcAdjustments[identifyCreatureData.specificLoreDC.start];
        sheetData.specificLoreProgression = identifyCreatureData.specificLoreDC.progression.join("/");

        sheetData.unspecificLoreDC = identifyCreatureData.unspecificLoreDC.dc;
        sheetData.unspecificLoreAdjustment = CONFIG.PF2E.dcAdjustments[identifyCreatureData.unspecificLoreDC.start];
        sheetData.unspecificLoreProgression = identifyCreatureData.unspecificLoreDC.progression.join("/");

        this.prepareSpellcasting(sheetData);

        // Return data for rendering
        return sheetData;
    }

    /** Organize and classify Items for NPC sheets */
    protected prepareItems(sheetData: any) {
        const actorData: any = sheetData.actor;
        // Actions
        const attacks = {
            melee: { label: "NPC Melee Attack", prefix: "PF2E.NPCAttackMelee", items: [], type: "melee" },
            ranged: { label: "NPC Ranged Attack", prefix: "PF2E.NPCAttackRanged", items: [], type: "melee" },
        };

        // Actions
        const actions = {
            action: { label: "Actions", actions: [] },
            reaction: { label: "Reactions", actions: [] },
            free: { label: "Free Actions", actions: [] },
            passive: { label: "Passive Actions", actions: [] },
        };

        // Skills
        const lores: { label: string; description: string }[] = [];

        // Iterate through items, allocating to containers
        for (const i of actorData.items) {
            i.img = i.img || CONST.DEFAULT_TOKEN;

            // Weapons
            if (i.type === "weapon") {
                // we don't want to do anything if they're a weapon. They should be using the melee attacks
            }

            // NPC Generic Attacks
            else if (i.type === "melee") {
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
                i.img = NPCPF2e.getActionGraphics(actionType, parseInt((i.data.actions || {}).value, 10) || 1).imageUrl;

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

            // Feats
            else if (i.type === "feat") {
                const actionType = i.data.actionType.value || "passive";

                if (Object.keys(actions).includes(actionType)) {
                    i.feat = true;
                    i.img = NPCPF2e.getActionGraphics(
                        actionType,
                        parseInt((i.data.actions || {}).value, 10) || 1
                    ).imageUrl;
                    actions[actionType].actions.push(i);
                }
            }

            // Lore Skills
            else if (i.type === "lore") {
                lores.push(i);
            }
        }

        const embeddedEntityUpdate: EmbeddedDocumentUpdateData<NPCPF2e>[] = [];

        // Update all embedded entities that have an incorrect location.
        if (embeddedEntityUpdate.length) {
            console.log(
                "PF2e System | Prepare Actor Data | Updating location for the following embedded entities: ",
                embeddedEntityUpdate
            );
            this.actor.updateEmbeddedDocuments("Item", embeddedEntityUpdate);
            ui.notifications.info(
                "PF2e actor data migration for orphaned spells applied. Please close actor and open again for changes to take affect."
            );
        }

        // Assign and return
        actorData.actions = actions;
        actorData.attacks = attacks;
        actorData.lores = lores;
    }

    protected prepareSpellcasting(sheetData: any) {
        // Spellcasting Entries
        const spellcastingEntries: SpellcastingSheetData[] = [];

        for (const i of sheetData.items) {
            // Spellcasting Entries
            if (i.type === "spellcastingEntry") {
                const entry = this.actor.items.get(i._id);
                if (!(entry instanceof SpellcastingEntryPF2e)) {
                    continue;
                }

                if ((i.data.prepared || {}).value === "prepared") i.data.prepared.preparedSpells = true;
                else i.data.prepared.preparedSpells = false;
                // Check if Ritual spellcasting tradtion and set Boolean
                if ((i.data.tradition || {}).value === "ritual") i.data.tradition.ritual = true;
                else i.data.tradition.ritual = false;

                // There are still some bestiary entries where these values are strings.
                i.data.spelldc.dc = Number(i.data.spelldc.dc);
                i.data.spelldc.value = Number(i.data.spelldc.value);

                if (this.actor.data.data.traits.traits.value.some((trait) => trait === "elite")) {
                    i.data.spelldc.dc += 2;
                    i.data.spelldc.value += 2;
                } else if (this.actor.data.data.traits.traits.value.some((trait) => trait === "weak")) {
                    i.data.spelldc.dc -= 2;
                    i.data.spelldc.value -= 2;
                }

                // Update all spells to have the action icon
                const data = entry.getSpellData();
                for (const level of data.levels) {
                    for (const active of level.active) {
                        if (!active) continue;
                        const spellType = active.spell.data.data.time.value;
                        active.chatData.img = getActionIcon(spellType, active.spell.img);
                    }
                }

                const eid = spellcastingEntries.length;
                spellcastingEntries.push(mergeObject(i, { eid, ...data }));
            }
        }

        sheetData.spellcastingEntries = spellcastingEntries;
        sheetData.actor.spellcastingEntries = spellcastingEntries;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Activate event listeners using the prepared sheet HTML
     * @param html The prepared HTML object ready to be rendered into the DOM
     */
    override activateListeners(html: JQuery) {
        super.activateListeners(html);

        // Melee Attack summaries
        html.find(".item .melee-name h4").on("click", (event) => {
            this.onItemSummary(event);
        });

        // Melee Weapon Rolling
        html.find("button:not(.recall-knowledge-breakdown)").on("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();

            const itemId = $(ev.currentTarget).parents(".item").attr("data-item-id") ?? "";
            const item = this.actor.items.get(itemId, { strict: true });

            // which function gets called depends on the type of button stored in the dataset attribute action
            switch (ev.target.dataset.action) {
                case "weaponAttack":
                    item.rollWeaponAttack(ev);
                    break;
                case "weaponAttack2":
                    item.rollWeaponAttack(ev, 2);
                    break;
                case "weaponAttack3":
                    item.rollWeaponAttack(ev, 3);
                    break;
                case "weaponDamage":
                    item.rollWeaponDamage(ev);
                    break;
                case "weaponDamageCritical":
                    item.rollWeaponDamage(ev, true);
                    break;
                case "npcAttack":
                    item.rollNPCAttack(ev);
                    break;
                case "npcAttack2":
                    item.rollNPCAttack(ev, 2);
                    break;
                case "npcAttack3":
                    item.rollNPCAttack(ev, 3);
                    break;
                case "npcDamage":
                    item.rollNPCDamage(ev);
                    break;
                case "npcDamageCritical":
                    item.rollNPCDamage(ev, true);
                    break;
                case "spellAttack":
                    item.rollSpellAttack(ev);
                    break;
                case "spellDamage":
                    item.rollSpellDamage(ev);
                    break;
                case "consume":
                    if (item instanceof ConsumablePF2e) item.consume();
                    break;
                default:
                    throw new Error("Unknown action type");
            }
        });

        if (!this.options.editable) return;

        // NPC SKill Rolling
        html.find(".rollable[data-skill]").on("click", (event) => {
            const $target = $(event.delegateTarget);
            const shortform = $target.attr("data-skill") ?? "";
            if (!objectHasKey(SKILL_DICTIONARY, shortform)) return;
            const opts = this.actor.getRollOptions(["all", "skill-check", SKILL_DICTIONARY[shortform] ?? shortform]);
            const extraOptions = $target.attr("data-options");
            if (extraOptions) {
                const split = extraOptions
                    .split(",")
                    .map((o) => o.trim())
                    .filter((o) => !!o);
                opts.push(...split);
            }
            this.actor.data.data.skills[shortform]?.roll({ event, options: opts }); // eslint-disable-line no-unused-expressions
        });

        html.find<HTMLInputElement>(".skill-input").on("change", async (event) => {
            const itemId = $(event.target).attr("data-item-id") ?? "";
            await this.actor.updateEmbeddedDocuments("Item", [
                {
                    _id: itemId,
                    "data.mod.value": Number(event.target.value),
                },
            ]);
        });

        html.find<HTMLInputElement>(".spelldc-input").on("change", async (event) => {
            event.preventDefault();

            const li = $(event.currentTarget).parents(".item-container");
            const itemId = li.attr("data-container-id") ?? "";
            const spelldcType = $(event.currentTarget).parents(".npc-defense").attr("data-spelldc-attribute") ?? "";

            if (["dc", "value"].includes(spelldcType)) {
                await this.actor.updateEmbeddedDocuments("Item", [
                    {
                        _id: itemId,
                        [`data.spelldc.${spelldcType}`]: Number(event.target.value),
                    },
                ]);
            } else if (spelldcType === "ability") {
                await this.actor.updateEmbeddedDocuments("Item", [
                    {
                        _id: itemId,
                        ["data.ability.value"]: event.target.value,
                    },
                ]);
            }
        });

        html.find(".recall-knowledge-breakdown").on("click", (event) => {
            event.preventDefault();
            const { identifyCreatureData } = this.getData();
            new RecallKnowledgePopup({}, identifyCreatureData).render(true);
        });
    }
}
