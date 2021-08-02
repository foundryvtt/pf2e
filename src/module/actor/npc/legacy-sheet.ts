import { NPCLegacyEditSheetPF2e } from "./legacy-edit-sheet";
import { DicePF2e } from "@scripts/dice";
import { ActorPF2e } from "../base";
import { NPCSheetPF2e } from "./sheet";
import { SheetInventory } from "../sheet/data-types";
import { ActionSource, ItemDataPF2e } from "@item/data";
import { ActionPF2e } from "@item/action";
import { MeleePF2e } from "@item/melee";

interface LootSheetData {
    actor: { name: string; items: ItemDataPF2e[] };
    options: { classes: string[] };
    inventory: SheetInventory;
}

export class NPCLegacySheetPF2e extends NPCLegacyEditSheetPF2e {
    override get template() {
        if (this.isLootSheet) {
            return "systems/pf2e/templates/actors/npc/loot-sheet.html";
        }

        const path = "systems/pf2e/templates/actors/";
        if (this.actor.getFlag("pf2e", "editNPC.value")) return `${path}npc-sheet.html`;
        return `${path}npc-sheet-no-edit.html`;
    }

    static override get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            classes: options.classes.concat("updatedNPCSheet"),
            width: 650,
            height: 680,
            showUnpreparedSpells: true,
        });
        return options;
    }

    override get title() {
        if (this.isLootSheet) {
            const actorName = this.token?.name ?? this.actor.name;
            return `${actorName} [${game.i18n.localize("PF2E.NPC.Dead")}]`;
        }
        return super.title;
    }

    override getData() {
        const sheetData = super.getData();
        /** Use the simple NPC loot-sheet variant if in loot mode */
        if (this.isLootSheet) {
            return this.getLootData(sheetData);
        }

        sheetData.flags = sheetData.actor.flags;
        if (sheetData.flags.pf2e_updatednpcsheet === undefined) sheetData.flags.pf2e_updatednpcsheet = {};
        if (sheetData.flags.pf2e_updatednpcsheet.editNPC === undefined)
            sheetData.flags.pf2e_updatednpcsheet.editNPC = { value: false };
        if (sheetData.flags.pf2e_updatednpcsheet.allSaveDetail === undefined)
            sheetData.flags.pf2e_updatednpcsheet.allSaveDetail = { value: "" };

        // Elite or Weak adjustment
        sheetData.npcEliteActive = this.npcIsElite ? " active" : "";
        sheetData.npcWeakActive = this.npcIsWeak ? " active" : "";
        sheetData.npcEliteHidden = this.npcIsWeak ? " hidden" : "";
        sheetData.npcWeakHidden = this.npcIsElite ? " hidden" : "";

        // rarity
        sheetData.actorRarities = CONFIG.PF2E.rarityTraits;
        sheetData.actorRarity = sheetData.actorRarities[sheetData.data.traits.rarity.value];
        sheetData.isNotCommon = sheetData.data.traits.rarity.value !== "common";
        // size
        sheetData.actorSize = sheetData.actorSizes[sheetData.data.traits.size.value];
        sheetData.actorTraits = (sheetData.data.traits.traits || {}).value;
        sheetData.actorAlignment = sheetData.data.details.alignment.value;
        sheetData.actorAttitudes = CONFIG.PF2E.attitude;
        sheetData.actorAttitude = sheetData.actorAttitudes[sheetData.data.traits.attitude?.value ?? "indifferent"];
        // languages
        sheetData.hasLanguages = false;
        if (
            sheetData.data.traits.languages.value &&
            Array.isArray(sheetData.data.traits.languages.value) &&
            sheetData.actor.data.traits.languages.value.length > 0
        ) {
            sheetData.hasLanguages = true;
        }

        // Skills
        sheetData.hasSkills = sheetData.actor.lores.length > 0;

        // AC Details
        sheetData.hasACDetails = sheetData.data.attributes.ac.details && sheetData.data.attributes.ac.details !== "";
        // HP Details
        sheetData.hasHPDetails = sheetData.data.attributes.hp.details && sheetData.data.attributes.hp.details !== "";

        // ********** This section needs work *************
        // Fort Details
        sheetData.hasFortDetails =
            sheetData.data.saves.fortitude.saveDetail && sheetData.data.saves.fortitude.saveDetail !== "";
        // Reflex Details
        sheetData.hasRefDetails =
            sheetData.data.saves.reflex.saveDetail && sheetData.data.saves.reflex.saveDetail !== "";
        // Will Details
        sheetData.hasWillDetails = sheetData.data.saves.will.saveDetail && sheetData.data.saves.will.saveDetail !== "";
        // All Save Details
        sheetData.hasAllSaveDetails =
            (sheetData.data.attributes.allSaves || {}).value && (sheetData.data.attributes.allSaves || {}).value !== "";

        // Immunities check
        sheetData.hasImmunities = sheetData.data.traits.di.value.length ? sheetData.data.traits.di.value : false;
        // Resistances check
        sheetData.hasResistances = sheetData.data.traits.dr.length ? Array.isArray(sheetData.data.traits.dr) : false;
        // Weaknesses check
        sheetData.hasWeaknesses = sheetData.data.traits.dv.length ? Array.isArray(sheetData.data.traits.dv) : false;

        // Speed Details check
        if (sheetData.data.attributes.speed && sheetData.data.attributes.speed.otherSpeeds)
            sheetData.hasSpeedDetails = sheetData.data.attributes.speed.otherSpeeds.length
                ? sheetData.data.attributes.speed.otherSpeeds
                : false;

        // Spellbook
        sheetData.hasSpells = sheetData.actor.spellcastingEntries.length ? sheetData.actor.spellcastingEntries : false;
        // sheetData.spellAttackBonus = sheetData.data.attributes.spelldc.value;

        const equipment: any[] = [];
        const reorgActions = {
            interaction: {
                label: "Interaction Actions",
                actions: {
                    action: { label: "Actions", actions: [] },
                    reaction: { label: "Reactions", actions: [] },
                    free: { label: "Free Actions", actions: [] },
                    passive: { label: "Passive Actions", actions: [] },
                },
            },
            defensive: {
                label: "Defensive Actions",
                actions: {
                    action: { label: "Actions", actions: [] },
                    reaction: { label: "Reactions", actions: [] },
                    free: { label: "Free Actions", actions: [] },
                    passive: { label: "Passive Actions", actions: [] },
                },
            },
            offensive: {
                label: "Offensive Actions",
                actions: {
                    action: { label: "Actions", actions: [] },
                    reaction: { label: "Reactions", actions: [] },
                    free: { label: "Free Actions", actions: [] },
                    passive: { label: "Passive Actions", actions: [] },
                },
            },
        };
        sheetData.hasInteractionActions = false;
        sheetData.hasDefensiveActions = false;
        sheetData.hasOffensiveActions = false;
        sheetData.hasEquipment = false;
        for (const i of sheetData.actor.items) {
            // Equipment
            if (
                i.type === "weapon" ||
                i.type === "armor" ||
                i.type === "equipment" ||
                i.type === "consumable" ||
                i.type === "treasure"
            ) {
                // non-strict because `quantity.value` can be a string
                // eslint-disable-next-line eqeqeq
                if (i.data.quantity.value != 1) {
                    // `i` is a copy, so we can append the quantity to it without updating the original
                    i.name += ` (${i.data.quantity.value})`;
                }
                equipment.push(i);
                sheetData.hasEquipment = true;
            }
            // Actions
            else if (i.type === "action") {
                const actionType = i.data.actionType.value || "action";
                const actionCategory = i.data.actionCategory?.value || "offensive";
                switch (actionCategory) {
                    case "interaction":
                        reorgActions.interaction.actions[actionType].actions.push(i);
                        sheetData.hasInteractionActions = true;
                        break;
                    case "defensive":
                        reorgActions.defensive.actions[actionType].actions.push(i);
                        sheetData.hasDefensiveActions = true;
                        break;
                    // Should be offensive but throw anything else in there too
                    default:
                        reorgActions.offensive.actions[actionType].actions.push(i);
                        sheetData.hasOffensiveActions = true;
                }
            }
            // Give Melee/Ranged an img
            else if (i.type === "melee" || i.type === "ranged") {
                i.img = ActorPF2e.getActionGraphics("action", 1).imageUrl;
            }
        }
        sheetData.actor.reorgActions = reorgActions;
        sheetData.actor.equipment = equipment;

        // Return data for rendering
        return sheetData;
    }

    private getLootData(data: LootSheetData) {
        data.actor.name = this.token?.name ?? this.actor.name;
        data.options.classes = data.options.classes
            .filter((cls) => !["npc-sheet", "updatedNPCSheet"].includes(cls))
            .concat("npc");
        data.inventory = NPCSheetPF2e.prototype.prepareInventory({ items: data.actor.items });

        return data;
    }

    override get isLootSheet(): boolean {
        const npcsAreLootable = game.settings.get("pf2e", "automation.lootableNPCs");
        return npcsAreLootable && !this.actor.isOwner && this.actor.isLootableBy(game.user);
    }

    /** Increases the NPC via the Elite/Weak adjustment rules */
    npcAdjustment(increase: boolean) {
        let traits = duplicate(this.actor.data.data.traits.traits.value) ?? [];
        const isElite = traits.some((trait) => trait === "elite");
        const isWeak = traits.some((trait) => trait === "weak");

        if (increase) {
            if (isWeak) {
                console.log(`PF2e System | Adjusting NPC to become less powerful`);
                traits = traits.filter((trait) => trait !== "weak");
            } else if (!isWeak && !isElite) {
                console.log(`PF2e System | Adjusting NPC to become more powerful`);
                traits.push("elite");
            }
        } else {
            if (isElite) {
                console.log(`PF2e System | Adjusting NPC to become less powerful`);
                traits = traits.filter((trait) => trait !== "elite");
            } else if (!isElite && !isWeak) {
                console.log(`PF2e System | Adjusting NPC to become less powerful`);
                traits.push("weak");
            }
        }
        this.actor.update({ ["data.traits.traits.value"]: traits });
    }

    /** Check if Elite */
    get npcIsElite() {
        return this.actor.data.data.traits.traits.value.some((trait) => trait === "elite");
    }

    /** Check if Weak */
    get npcIsWeak() {
        return this.actor.data.data.traits.traits.value.some((trait) => trait === "weak");
    }

    /**
     * Roll NPC Damage using DamageRoll
     * Rely upon the DicePF2e.damageRoll logic for the core implementation
     */
    rollNPCDamageRoll(event: any, damageRoll: any, item: any) {
        // Get data
        const itemData = item.data.data;
        const rollData = duplicate(item.actor.data.data);
        const weaponDamage = damageRoll.die;
        // abl = itemData.ability.value || "str",
        // abl = "str",
        const parts = [weaponDamage];
        const dtype = CONFIG.PF2E.damageTypes[damageRoll.damageType];

        // Append damage type to title
        let title = `${item.name} - Damage`;
        if (dtype) title += ` (${dtype})`;

        // Call the roll helper utility
        rollData.item = itemData;
        DicePF2e.damageRoll({
            event,
            parts,
            actor: item.actor,
            data: rollData,
            title,
            speaker: ChatMessage.getSpeaker({ actor: item.actor }),
            dialogOptions: {
                width: 400,
                top: event.clientY - 80,
                left: window.innerWidth - 710,
            },
        });
    }

    /** Toggle expansion of an attackEffect ability if it exists. */
    expandAttackEffect(attackEffectName: string, event: JQuery.TriggeredEvent) {
        const actionList = $(event.currentTarget).parents("form").find(".item.action-item");
        let toggledAnything = false;
        const mAbilities = CONFIG.PF2E.monsterAbilities();
        actionList.each((_index, element) => {
            // 'this' = element found
            if ($(element).attr("data-item-name")?.trim().toLowerCase() === attackEffectName.trim().toLowerCase()) {
                $(element).find("h4").trigger("click");
                toggledAnything = true;
            }
        });
        if (!toggledAnything) {
            const newAbilityInfo = mAbilities[attackEffectName];
            if (newAbilityInfo) {
                const newAction = {
                    name: attackEffectName,
                    type: "action",
                    data: {
                        actionType: { value: newAbilityInfo.actionType },
                        actionCategory: { value: "offensive" },
                        source: { value: "" },
                        description: { value: newAbilityInfo.description },
                        traits: { value: [] },
                        actions: { value: newAbilityInfo.actionCost },
                    },
                } as unknown as PreCreate<ActionSource>;

                const traitRegEx = /(?:Traits.aspx.+?">)(?:<\w+>)*(.+?)(?:<\/\w+>)*(?:<\/a>)/g;
                const matchTraits: any[][] = [...newAbilityInfo.description.matchAll(traitRegEx)];

                for (let i = 0; i < matchTraits.length; i++) {
                    if (matchTraits[i] && matchTraits[i].length >= 2 && matchTraits[i][1]) {
                        if (!newAction.data?.traits?.value?.includes(matchTraits[i][1]))
                            newAction.data?.traits?.value?.push(matchTraits[i][1]);
                    }
                }

                ActionPF2e.create(newAction, { parent: this.actor, renderSheet: false });
            }
        }
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers
    /* -------------------------------------------- */

    /**
     * Activate event listeners using the prepared sheet HTML
     * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
     */
    override activateListeners(html: JQuery) {
        super.activateListeners(html);

        // Set the inventory tab as active on a loot-sheet rendering.
        if (this.isLootSheet) {
            html.find(".tab.inventory").addClass("active");
        }

        if (!this.options.editable) return;

        html.find(".npc-detail-text textarea").on("focusout", async (event) => {
            event.target.style.height = "5px";
            event.target.style.height = `${event.target.scrollHeight}px`;
        });

        html.find(".npc-detail-text textarea").each((_index, element) => {
            element.style.height = "5px";
            element.style.height = `${element.scrollHeight}px`;
        });

        html.find<HTMLInputElement>(".isNPCEditable").on("change", (event) => {
            this.actor.setFlag("pf2e", "editNPC", { value: event.target.checked });
        });

        // NPC Weapon Rolling

        html.find("button.npc-damageroll").on("click", (event) => {
            event.preventDefault();
            event.stopPropagation();

            const itemId = $(event.currentTarget).parents(".item").attr("data-item-id") ?? "";
            const drId = Number($(event.currentTarget).attr("data-dmgRoll"));
            const item = this.actor.items.get(itemId, { strict: true });
            const damageRoll = item.data.flags.pf2e_updatednpcsheet.damageRolls[drId];

            // which function gets called depends on the type of button stored in the dataset attribute action
            switch (event.target.dataset.action) {
                case "npcDamageRoll":
                    this.rollNPCDamageRoll(event, damageRoll, item);
                    break;
                default:
            }
        });

        html.find("button.npc-attackEffect").on("click", (event) => {
            event.preventDefault();
            event.stopPropagation();

            const itemId = $(event.currentTarget).parents(".item").attr("data-item-id") ?? "";
            const aId = Number($(event.currentTarget).attr("data-attackEffect"));
            const item = this.actor.items.get(itemId);
            if (!(item instanceof MeleePF2e)) {
                console.log("PF2e System | clicked an attackEffect, but item was not a melee");
                return;
            }

            const attackEffect = item.data.data.attackEffects.value[aId];
            console.log("PF2e System | clicked an attackEffect:", attackEffect, event);

            // which function gets called depends on the type of button stored in the dataset attribute action
            switch (event.target.dataset.action) {
                case "npcAttackEffect":
                    this.expandAttackEffect(attackEffect, event);
                    break;
                default:
            }
        });

        html.find("a.npc-elite-adjustment").on("click", (event) => {
            event.preventDefault();
            console.log(`PF2e System | Adding Elite adjustment to NPC`);
            const eliteButton = $(event.currentTarget);
            const weakButton = eliteButton.siblings(".npc-weak-adjustment");
            eliteButton.toggleClass("active");
            weakButton.toggleClass("hidden");
            this.npcAdjustment(eliteButton.hasClass("active"));
        });
        html.find("a.npc-weak-adjustment").on("click", (event) => {
            event.preventDefault();
            console.log(`PF2e System | Adding Weak adjustment to NPC`);
            const weakButton = $(event.currentTarget);
            const eliteButton = weakButton.siblings(".npc-elite-adjustment");
            weakButton.toggleClass("active");
            eliteButton.toggleClass("hidden");
            this.npcAdjustment(!weakButton.hasClass("active"));
        });
    }
}
