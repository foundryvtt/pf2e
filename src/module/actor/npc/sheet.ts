import { CreatureSheetPF2e } from "../creature/sheet";
import { DicePF2e } from "@scripts/dice";
import { ABILITY_ABBREVIATIONS, SAVE_TYPES, SKILL_DICTIONARY } from "@actor/data/values";
import { NPCSkillsEditor } from "@actor/npc/skills-editor";
import { NPCPF2e } from "@actor/index";
import { identifyCreature, IdentifyCreatureData } from "@module/recall-knowledge";
import { RecallKnowledgePopup } from "../sheet/popups/recall-knowledge-popup";
import { PhysicalItemPF2e } from "@item/physical";
import {
    ActionData,
    ArmorData,
    ConditionData,
    ConsumableData,
    EffectData,
    EquipmentData,
    ItemDataPF2e,
    SpellcastingEntryData,
    TreasureData,
    WeaponData,
} from "@item/data";
import { ErrorPF2e, getActionGlyph, getActionIcon, objectHasKey } from "@util";
import { ActorSheetDataPF2e, InventoryItem, SheetInventory } from "../sheet/data-types";
import { LabeledString, ValuesList, ZeroToEleven } from "@module/data";
import { NPCArmorClass, NPCAttributes, NPCSaveData, NPCSkillData, NPCStrike, NPCSystemData } from "./data";
import { Abilities, AbilityData, CreatureTraitsData, SkillAbbreviation } from "@actor/creature/data";
import { AbilityString, HitPointsData, PerceptionData } from "@actor/data/base";
import { SaveType } from "@actor/data";
import { BookData } from "@item/book";
import { SpellcastingEntryListData } from "@item/spellcasting-entry/data";

interface NPCSheetLabeledValue extends LabeledString {
    localizedName?: string;
}

interface ActionsDetails {
    label: string;
    actions: SheetItemData<RawObject<ActionData>>[];
}

interface ActionActions {
    passive: ActionsDetails;
    free: ActionsDetails;
    reaction: ActionsDetails;
    action: ActionsDetails;
}

interface Attack {
    attack: NPCStrike;
    traits: {
        label: string;
        description: string;
    }[];
}

type Attacks = Attack[];

/** Highlight such a statistic if adjusted by data preparation */
interface WithAdjustments {
    adjustedHigher?: boolean;
    adjustedLower?: boolean;
}

interface NPCSystemSheetData extends NPCSystemData {
    attributes: NPCAttributes & {
        ac: NPCArmorClass & WithAdjustments;
        hp: HitPointsData & WithAdjustments;
        perception: PerceptionData & WithAdjustments;
        shieldBroken?: boolean;
    };
    details: NPCSystemData["details"] & {
        level: NPCSystemData["details"]["level"] & WithAdjustments;
        alignment: {
            localizedName?: string;
        };
    };
    sortedSkills: Record<string, NPCSkillData & WithAdjustments>;
    saves: Record<SaveType, NPCSaveData & WithAdjustments>;
    traits: CreatureTraitsData & {
        senses: NPCSheetLabeledValue[];
        size: {
            localizedName?: string;
        };
    };
}

/** Additional fields added in sheet data preparation */
interface NPCSheetData extends ActorSheetDataPF2e<NPCPF2e> {
    actions: ActionActions;
    attacks: Attacks;
    data: NPCSystemSheetData;
    items: SheetItemData[];
    effectItems: EffectData[];
    conditions: ConditionData[];
    spellcastingEntries: SpellcastingSheetData[];
    orphanedSpells: boolean;
    orphanedSpellbook: any;
    identifyCreatureData: IdentifyCreatureData;
    identifySkillDC?: number;
    identifySkillAdjustment?: string;
    identifySkillProgression?: string;
    identificationSkills?: string[];
    identificationSkillList?: string;
    specificLoreDC?: number;
    specificLoreAdjustment?: string;
    specificLoreProgression?: string;
    unspecificLoreDC?: number;
    unspecificLoreAdjustment?: string;
    unspecificLoreProgression?: string;
    isNotCommon?: boolean;
    actorSize?: string;
    actorAttitudes?: ConfigPF2e["PF2E"]["attitude"];
    actorAttitude?: string;
    traits?: Record<string, string>;
    immunities?: Record<string, string>;
    hasImmunities?: boolean;
    languages?: Record<string, string>;
    isWeak?: boolean;
    isElite?: boolean;
    eliteState: "active" | "inactive";
    weakState: "active" | "inactive";
    notAdjusted: boolean;
    inventory: SheetInventory;
    hasShield?: boolean;
    hasHardness?: boolean;
    configLootableNpc?: boolean;
}

type SheetItemData<T extends ItemDataPF2e | RawObject<ItemDataPF2e> = ItemDataPF2e> = T & {
    glyph: string;
    imageUrl: string;
    traits: {
        label: string;
        description?: string;
    }[];
    chatData?: unknown;
    data: {
        bonus?: {
            value: number;
            total?: number;
        };
        isAgile?: boolean;
        prepared?: boolean;
        tradition?: {
            ritual: boolean;
            focus: boolean;
        };
        weaponType?: string;
    };
};

export type SpellcastingSheetData = SpellcastingEntryData & SpellcastingEntryListData;

export class NPCSheetPF2e extends CreatureSheetPF2e<NPCPF2e> {
    static override get defaultOptions() {
        const options = super.defaultOptions;

        // Mix default options with new ones
        mergeObject(options, {
            classes: options.classes.concat("npc"),
            width: 650,
            height: 680,
            showUnpreparedSpells: true, // Not sure what it does in an NPC, copied from old code
            tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }],
            scrollY: [".tab.main", ".tab.inventory", ".tab.spells", ".tab.notes"],
        });
        return options;
    }

    /** Show either the actual NPC sheet or a briefened lootable version if the NPC is dead */
    override get template(): string {
        if (this.isLootSheet) {
            return "systems/pf2e/templates/actors/npc/loot-sheet.html";
        } else if (this.actor.limited) {
            return "systems/pf2e/templates/actors/limited/npc-sheet.html";
        }
        return "systems/pf2e/templates/actors/npc/sheet.html";
    }

    /** Use the token name as the title if showing a lootable NPC sheet */
    override get title() {
        if (this.isLootSheet) {
            const actorName = this.token?.name ?? this.actor.name;
            if (this.actor.isDead) {
                return `${actorName} [${game.i18n.localize("PF2E.NPC.Dead")}]`; // `;
            } else {
                return actorName;
            }
        }
        return super.title;
    }

    override get isLootSheet(): boolean {
        return this.actor.isLootable && !this.actor.isOwner && this.actor.isLootableBy(game.user);
    }

    /**
     * Prepares items in the actor for easier access during sheet rendering.
     * @param sheetData Data from the actor associated to this sheet.
     */
    protected prepareItems(sheetData: NPCSheetData) {
        this.prepareAbilities(sheetData.data.abilities);
        this.prepareSize(sheetData.data);
        this.prepareAlignment(sheetData.data);
        this.prepareSkills(sheetData.data);
        this.prepareSpeeds(sheetData.data);
        this.prepareSaves(sheetData.data);
        this.prepareActions(sheetData);
        sheetData.inventory = this.prepareInventory(sheetData);
        sheetData.attacks = this.prepareAttacks(sheetData.data);
        sheetData.conditions = sheetData.items.filter(
            (data): data is SheetItemData<ConditionData> => data.type === "condition"
        );
        sheetData.effectItems = sheetData.items.filter(
            (data): data is SheetItemData<EffectData> => data.type === "effect"
        );
        this.prepareSpellcasting(sheetData);
    }

    private prepareIWR(sheetData: NPCSheetData) {
        sheetData.immunities = this.prepareOptions(CONFIG.PF2E.immunityTypes, sheetData.data.traits.di);
        sheetData.hasImmunities = Object.keys(sheetData.immunities).length !== 0;
        const weaknessTypes: Record<string, string> = CONFIG.PF2E.weaknessTypes;
        for (const weakness of sheetData.data.traits.dv) {
            weakness.label = weaknessTypes[weakness.type];
        }

        const resistanceTypes: Record<string, string> = CONFIG.PF2E.resistanceTypes;
        for (const resistance of sheetData.data.traits.dr) {
            resistance.label = resistanceTypes[resistance.type] ?? resistance.label;
        }
    }

    private getIdentifyCreatureData(): IdentifyCreatureData {
        const proficiencyWithoutLevel = game.settings.get("pf2e", "proficiencyVariant") === "ProficiencyWithoutLevel";
        return identifyCreature(this.actor.data, { proficiencyWithoutLevel });
    }

    override async getData(): Promise<NPCSheetData> {
        const sheetData: NPCSheetData = await super.getData();

        // recall knowledge DCs
        const identifyCreatureData = (sheetData.identifyCreatureData = this.getIdentifyCreatureData());
        sheetData.identifySkillDC = identifyCreatureData.skill.dc;
        sheetData.identifySkillAdjustment = CONFIG.PF2E.dcAdjustments[identifyCreatureData.skill.start];
        sheetData.identifySkillProgression = identifyCreatureData.skill.progression.join("/");
        sheetData.identificationSkills = Array.from(sheetData.identifyCreatureData.skills)
            .sort()
            .map((skillAcronym) => CONFIG.PF2E.skills[skillAcronym as SkillAbbreviation]);

        sheetData.specificLoreDC = identifyCreatureData.specificLoreDC.dc;
        sheetData.specificLoreAdjustment = CONFIG.PF2E.dcAdjustments[identifyCreatureData.specificLoreDC.start];
        sheetData.specificLoreProgression = identifyCreatureData.specificLoreDC.progression.join("/");

        sheetData.unspecificLoreDC = identifyCreatureData.unspecificLoreDC.dc;
        sheetData.unspecificLoreAdjustment = CONFIG.PF2E.dcAdjustments[identifyCreatureData.unspecificLoreDC.start];
        sheetData.unspecificLoreProgression = identifyCreatureData.unspecificLoreDC.progression.join("/");

        sheetData.isNotCommon = sheetData.data.traits.rarity.value !== "common";
        sheetData.actorSize = CONFIG.PF2E.actorSizes[sheetData.data.traits.size.value];
        sheetData.actorAttitudes = CONFIG.PF2E.attitude;
        sheetData.actorAttitude = sheetData.actorAttitudes[sheetData.data.traits.attitude?.value ?? "indifferent"];
        sheetData.traits = this.prepareOptions(CONFIG.PF2E.creatureTraits, sheetData.data.traits.traits);
        this.prepareIWR(sheetData);
        sheetData.languages = this.prepareOptions(CONFIG.PF2E.languages, sheetData.data.traits.languages);
        sheetData.limited = this.actor.limited;

        // Shield
        const shield = this.actor.heldShield;
        const actorShieldData = sheetData.data.attributes.shield;
        if (shield) {
            sheetData.hasShield = true;
            sheetData.data.attributes.shieldBroken = shield.isBroken;
        } else if (actorShieldData.max > 0) {
            sheetData.hasShield = true;
            sheetData.data.attributes.shieldBroken = actorShieldData.value > actorShieldData.max / 2;
        }

        const isElite = this.isElite;
        const isWeak = this.isWeak;
        sheetData.isElite = isElite;
        sheetData.isWeak = isWeak;
        sheetData.notAdjusted = !isElite && !isWeak;

        if (isElite && isWeak) {
            throw ErrorPF2e("NPC is both, Elite and Weak at the same time.");
        } else if (isElite) {
            sheetData.eliteState = "active";
            sheetData.weakState = "inactive";
        } else if (isWeak) {
            sheetData.eliteState = "inactive";
            sheetData.weakState = "active";
        } else {
            sheetData.eliteState = "inactive";
            sheetData.weakState = "inactive";
        }

        // Data for lootable token-actor sheets
        if (this.isLootSheet) {
            sheetData.actor.name = this.token?.name ?? this.actor.name;
        }

        const { level } = sheetData.data.details;
        level.adjustedHigher = level.value > Number(level.base);
        level.adjustedLower = level.value < Number(level.base);
        const { ac, hp, perception, hardness } = sheetData.data.attributes;
        ac.adjustedHigher = ac.value > Number(ac.base);
        ac.adjustedLower = ac.value < Number(ac.base);
        hp.adjustedHigher = hp.max > Number(hp.base);
        hp.adjustedLower = hp.max < Number(hp.base);
        perception.adjustedHigher = perception.totalModifier > Number(perception.base);
        perception.adjustedLower = perception.totalModifier < Number(perception.base);

        sheetData.hasHardness = this.actor.traits.has("construct") || (Number(hardness?.value) || 0) > 0;

        sheetData.configLootableNpc = game.settings.get("pf2e", "automation.lootableNPCs");

        // Return data for rendering
        return sheetData;
    }

    /**
     * Subscribe to events from the sheet.
     * @param html HTML content ready to render the sheet.
     */
    override activateListeners(html: JQuery<HTMLElement>) {
        super.activateListeners(html);

        // Subscribe to roll events
        const rollables = ["a.rollable", ".rollable a", ".item-icon.rollable"].join(", ");
        html.find(rollables).on("click", (event) => this.onClickRollable(event));
        html.find("a.chat, .spell-icon.rollable").on("click", (event) => this.onClickToChat(event));

        // Don't subscribe to edit buttons it the sheet is NOT editable
        if (!this.options.editable) return;

        html.find(".trait-edit").on("click", (event) => this.onTraitSelector(event));
        html.find(".skills-edit").on("click", () => {
            new NPCSkillsEditor(this.actor).render(true);
        });

        // Adjustments
        html.find(".npc-elite-adjustment").on("click", () => this.onClickMakeElite());
        html.find(".npc-weak-adjustment").on("click", () => this.onClickMakeWeak());

        // Handle spellcastingEntry attack and DC updates
        html.find(".spellcasting-entry")
            .find<HTMLInputElement | HTMLSelectElement>(".attack-input, .dc-input, .ability-score select")
            .on("change", (event) => this.onChangeSpellcastingEntry(event));

        // Spontaneous Spell slot reset handler:
        html.find(".spell-slots-increment-reset").on("click", (event) => this.onSpellSlotIncrementReset(event));

        html.find(".effects-list > .effect > .item-image").on("contextmenu", (event) => this.onClickDeleteItem(event));

        html.find(".recall-knowledge button.breakdown").on("click", (event) => {
            event.preventDefault();
            const identifyCreatureData = this.getIdentifyCreatureData();
            new RecallKnowledgePopup({}, identifyCreatureData).render(true);
        });
    }

    // TRAITS MANAGEMENT
    private prepareOptions<T extends string>(
        options: Record<T, string>,
        selections: ValuesList<T>
    ): Record<string, string> {
        const mainSelections = selections.value.map(
            (trait): Record<string, string> => ({ value: trait, label: options[trait] })
        );
        const customSelections = selections.custom
            .split(/\s*[,;|]\s*/)
            .filter((trait) => trait)
            .map((trait): Record<string, string> => ({ value: trait.replace(/\.$/, ""), label: trait }));

        return mainSelections
            .concat(customSelections)
            .filter((selection) => selection.label)
            .reduce((selections, selection) => mergeObject(selections, { [selection.value]: selection.label }), {});
    }

    private prepareAbilities(abilities: Abilities) {
        for (const key of ABILITY_ABBREVIATIONS) {
            interface SheetAbilityData extends AbilityData {
                localizedCode?: string;
                localizedName?: string;
            }
            const data: SheetAbilityData = abilities[key];
            const localizedCode = game.i18n.localize(`PF2E.AbilityId.${key}`);
            const nameKey = this.getAbilityNameKey(key);
            const localizedName = game.i18n.localize(nameKey);

            data.localizedCode = localizedCode;
            data.localizedName = localizedName;
        }
    }

    private prepareSize(sheetSystemData: NPCSystemSheetData) {
        const size = sheetSystemData.traits.size.value;
        const localizationKey = this.getSizeLocalizedKey(size);
        const localizedName = game.i18n.localize(localizationKey);

        sheetSystemData.traits.size.localizedName = localizedName;
    }

    private prepareAlignment(sheetSystemData: NPCSystemSheetData) {
        const alignmentCode = sheetSystemData.details.alignment.value;
        const localizedName = game.i18n.localize(`PF2E.Alignment${alignmentCode}`);

        sheetSystemData.details.alignment.localizedName = localizedName;
    }

    protected prepareSenses(sheetSystemData: NPCSystemSheetData) {
        const configSenses = CONFIG.PF2E.senses;
        for (const sense of sheetSystemData.traits.senses) {
            sense.localizedName = objectHasKey(configSenses, sense.type) ? configSenses[sense.type] : sense.type;
        }
    }

    private prepareSkills(sheetSystemData: NPCSystemSheetData) {
        // Prepare a list of skill IDs sorted by their localized name
        // This will help in displaying the skills in alphabetical order in the sheet
        const sortedSkillsIds = Object.keys(sheetSystemData.skills);

        const skills = sheetSystemData.skills;
        for (const skillId of sortedSkillsIds) {
            const skill = skills[skillId];
            skill.label = objectHasKey(CONFIG.PF2E.skillList, skill.expanded)
                ? game.i18n.localize(CONFIG.PF2E.skillList[skill.expanded])
                : skill.name;
            skill.adjustedHigher = skill.value > Number(skill.base);
            skill.adjustedLower = skill.value < Number(skill.base);
        }

        sortedSkillsIds.sort((a: string, b: string) => {
            const skillA = skills[a];
            const skillB = skills[b];

            if (skillA.label < skillB.label) return -1;
            if (skillA.label > skillB.label) return 1;

            return 0;
        });

        const sortedSkills: Record<string, NPCSkillData> = {};

        for (const skillId of sortedSkillsIds) {
            sortedSkills[skillId] = skills[skillId];
        }

        sheetSystemData.sortedSkills = sortedSkills;
    }

    private prepareSpeeds(sheetData: NPCSystemSheetData) {
        const configSpeedTypes = CONFIG.PF2E.speedTypes;
        sheetData.attributes.speed.otherSpeeds.forEach((speed) => {
            // Try to convert it to a recognizable speed name
            // This is done to recognize speed types for NPCs from the compendium
            const speedName: string = speed.type.trim().toLowerCase().replace(/\s+/g, "-");
            let value = speed.value;
            if (typeof value === "string" && value.includes("feet")) {
                value = value.replace("feet", "").trim(); // Remove `feet` at the end, wi will localize it later
            }
            speed.label = objectHasKey(configSpeedTypes, speedName) ? configSpeedTypes[speedName] : "";
        });
        // Make sure regular speed has no `feet` at the end, we will add it localized later on
        // This is usally the case for NPCs from the compendium
        if (typeof sheetData.attributes.speed.value === "string") {
            sheetData.attributes.speed.value = sheetData.attributes.speed.value.replace("feet", "").trim();
        }
    }

    private prepareSaves(systemData: NPCSystemSheetData) {
        for (const saveType of SAVE_TYPES) {
            const save = systemData.saves[saveType];
            save.labelShort = game.i18n.localize(`PF2E.Saves${saveType.titleCase()}Short`);
            save.adjustedHigher = save.totalModifier > Number(save.base);
            save.adjustedLower = save.totalModifier < Number(save.base);
        }
    }

    /**
     * Prepares the actions list to be accessible from the sheet.
     * @param sheetData Data of the actor to be shown in the sheet.
     */
    private prepareActions(sheetData: NPCSheetData) {
        const actions: ActionActions = {
            passive: { label: game.i18n.localize("PF2E.ActionTypePassive"), actions: [] },
            free: { label: game.i18n.localize("PF2E.ActionTypeFree"), actions: [] },
            reaction: { label: game.i18n.localize("PF2E.ActionTypeReaction"), actions: [] },
            action: { label: game.i18n.localize("PF2E.ActionTypeAction"), actions: [] },
        };

        for (const item of this.actor.itemTypes.action) {
            const itemData = item.toObject(false);
            const chatData = item.getChatData();
            const traits = chatData.traits;

            // Create trait with the type of action
            const systemData = itemData.data;
            const hasType = systemData.actionType && systemData.actionType.value;

            if (hasType) {
                const configTraitDescriptions = CONFIG.PF2E.traitsDescriptions;
                const configAttackTraits = CONFIG.PF2E.npcAttackTraits;

                const actionTrait = systemData.actionType.value;
                const label = objectHasKey(configAttackTraits, actionTrait)
                    ? configAttackTraits[actionTrait]
                    : actionTrait.charAt(0).toUpperCase() + actionTrait.slice(1);
                const description = objectHasKey(configTraitDescriptions, actionTrait)
                    ? configTraitDescriptions[actionTrait]
                    : "";

                const trait = {
                    label,
                    description,
                    value: "",
                };

                traits.splice(0, 0, trait);
            }

            const actionType = item.actionCost?.type || "passive";
            if (objectHasKey(actions, actionType)) {
                actions[actionType].actions.push({
                    ...itemData,
                    glyph: getActionGlyph(item.actionCost),
                    imageUrl: getActionIcon(item.actionCost),
                    chatData,
                    traits,
                });
            }
        }

        sheetData.actions = actions;
    }

    private prepareAttacks(sheetData: NPCSystemSheetData): Attacks {
        const attackTraits: Record<string, string | undefined> = CONFIG.PF2E.npcAttackTraits;
        const traitDescriptions: Record<string, string | undefined> = CONFIG.PF2E.traitsDescriptions;

        return sheetData.actions.map((attack) => {
            const traits = attack.traits
                .map((strikeTrait) => ({
                    label: attackTraits[strikeTrait.label] ?? strikeTrait.label,
                    description: traitDescriptions[strikeTrait.name] ?? "",
                }))
                .sort((a, b) => {
                    if (a.label < b.label) return -1;
                    if (a.label > b.label) return 1;
                    return 0;
                });
            return { attack, traits };
        });
    }

    /**
     * Prepare spells and spell entries
     * @param sheetData Data of the actor to show in the sheet.
     */
    private prepareSpellcasting(sheetData: NPCSheetData) {
        sheetData.spellcastingEntries = [];

        for (const item of sheetData.items) {
            if (item.type === "spellcastingEntry") {
                const entry = this.actor.spellcasting.get(item._id);
                if (!entry) continue;
                sheetData.spellcastingEntries.push(mergeObject(item, entry.getSpellData()));
            }
        }
    }

    /**
     * Prepares the equipment list of the actor.
     * @param sheetData Data of the sheet.
     */
    prepareInventory(sheetData: { items: ItemDataPF2e[] }): SheetInventory {
        const itemsData = sheetData.items;
        return {
            weapon: {
                label: game.i18n.localize("PF2E.InventoryWeaponsHeader"),
                type: "weapon",
                items: itemsData.filter(
                    (itemData): itemData is InventoryItem<WeaponData> => itemData.type === "weapon"
                ),
            },
            armor: {
                label: game.i18n.localize("PF2E.InventoryArmorHeader"),
                type: "armor",
                items: itemsData.filter((itemData): itemData is InventoryItem<ArmorData> => itemData.type === "armor"),
            },
            equipment: {
                label: game.i18n.localize("PF2E.InventoryEquipmentHeader"),
                type: "equipment",
                items: itemsData.filter(
                    (itemData): itemData is InventoryItem<EquipmentData | BookData> =>
                        itemData.type === "equipment" || itemData.type === "book"
                ),
            },
            consumable: {
                label: game.i18n.localize("PF2E.InventoryConsumablesHeader"),
                type: "consumable",
                items: itemsData.filter(
                    (itemData): itemData is InventoryItem<ConsumableData> => itemData.type === "consumable"
                ),
            },
            treasure: {
                label: game.i18n.localize("PF2E.InventoryTreasureHeader"),
                type: "treasure",
                items: itemsData.filter(
                    (itemData): itemData is InventoryItem<TreasureData> => itemData.type === "treasure"
                ),
            },
        };
    }

    private get isWeak(): boolean {
        return this.actor.traits.has("weak");
    }

    private get isElite(): boolean {
        return this.actor.traits.has("elite");
    }

    private getSizeLocalizedKey(size: string): string {
        const actorSizes = CONFIG.PF2E.actorSizes;
        return objectHasKey(actorSizes, size) ? actorSizes[size] : "";
    }

    private getAbilityNameKey(abilityCode: AbilityString): string {
        return CONFIG.PF2E.abilities[abilityCode];
    }

    // ROLLS

    private rollPerception(event: JQuery.ClickEvent) {
        const options = this.actor.getRollOptions(["all", "perception-check"]);
        const perception = this.actor.data.data.attributes.perception;
        if (perception?.roll) {
            perception.roll({ event, options });
        }
    }

    private rollAbility(event: JQuery.ClickEvent, abilityId: AbilityString) {
        const bonus = this.actor.data.data.abilities[abilityId].mod;
        const parts = ["@bonus"];
        const title = game.i18n.localize(`PF2E.AbilityCheck.${abilityId}`);
        const data = { bonus };
        const speaker = ChatMessage.getSpeaker({ token: this.token, actor: this.actor });

        DicePF2e.d20Roll({
            event,
            parts,
            data,
            title,
            speaker,
        });
    }

    rollSkill(event: JQuery.ClickEvent, skillKey: SkillAbbreviation) {
        const skill = this.actor.data.data.skills[skillKey];
        if (!skill?.roll) return;

        const longForms: Record<string, string | undefined> = SKILL_DICTIONARY;
        const opts = this.actor.getRollOptions(["all", "skill-check", longForms[skillKey] ?? skillKey]);
        const extraOptions = $(event.currentTarget).attr("data-options");

        if (extraOptions) {
            const split = extraOptions
                .split(",")
                .map((o) => o.trim())
                .filter((o) => !!o);
            opts.push(...split);
        }

        skill.roll({ event, options: opts });
    }

    rollSave(event: JQuery.ClickEvent, saveId: SaveType) {
        const save = this.actor.data.data.saves[saveId];

        if (save?.roll) {
            const options = this.actor.getRollOptions(["all", "saving-throw", saveId]);
            save.roll({ event, options });
        } else {
            this.actor.rollSave(event, saveId);
        }
    }

    private onClickRollable(event: JQuery.ClickEvent) {
        event.preventDefault();
        const $label = $(event.currentTarget).closest(".rollable");

        const ability = $label.parent().attr("data-attribute") as "perception" | AbilityString;
        const skill = $label.parent().attr("data-skill") as SkillAbbreviation;
        const save = $label.parent().attr("data-save") as SaveType;
        const action = $label.parent().parent().attr("data-action");
        const item = $label.parent().parent().attr("data-item");
        const spell = $label.parent().parent().attr("data-spell");

        if (ability) {
            switch (ability) {
                case "perception":
                    this.rollPerception(event);
                    break;
                default:
                    this.rollAbility(event, ability);
            }
        } else if (skill) {
            this.rollSkill(event, skill);
        } else if (save) {
            this.rollSave(event, save);
        } else if (action || item || spell) {
            this.onClickExpandable(event);
        }
    }

    private onClickExpandable(event: JQuery.ClickEvent): void {
        const $details = $(event.currentTarget).closest("li.item").find(".sub-section.expandable");

        const isExpanded = $details.hasClass("expanded");
        if (isExpanded) {
            $details.slideUp(200, () => {
                $details.removeClass("expanded");
            });
        } else {
            $details.slideDown(200, () => {
                $details.addClass("expanded");
            });
        }
    }

    private onClickToChat(event: JQuery.ClickEvent): void {
        event.preventDefault();

        const itemId = $(event.currentTarget).parents(".item").attr("data-item-id") ?? "";
        const item = this.actor.items.get(itemId);

        if (item) {
            if (item instanceof PhysicalItemPF2e && !item.isIdentified) {
                return;
            }

            item.toChat(event);
        } else {
            console.error(`Clicked item with ID ${itemId}, but unable to find item with that ID.`);
        }
    }

    private onClickMakeWeak() {
        if (this.actor.isWeak) {
            this.actor.applyAdjustment("normal");
        } else {
            this.actor.applyAdjustment("weak");
        }
    }

    private onClickMakeElite() {
        if (this.actor.isElite) {
            this.actor.applyAdjustment("normal");
        } else {
            this.actor.applyAdjustment("elite");
        }
    }

    private async onChangeSpellcastingEntry(event: JQuery.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        event.preventDefault();

        const $input: JQuery<HTMLInputElement | HTMLSelectElement> = $(event.currentTarget);
        const itemId = $input.closest(".spellcasting-entry").attr("data-container-id") ?? "";
        const key = $input.attr("data-base-property")?.replace(/data\.items\.\d+\./, "") ?? "";
        const value =
            $input.hasClass("focus-points") || $input.hasClass("focus-pool")
                ? Math.min(Number($input.val()), 3)
                : $input.is("select")
                ? String($input.val())
                : Number($input.val());
        await this.actor.updateEmbeddedDocuments("Item", [
            {
                _id: itemId,
                [key]: value,
            },
        ]);
    }

    private async onSpellSlotIncrementReset(event: JQuery.ClickEvent) {
        const $target = $(event.currentTarget);
        const itemId = $target.attr("data-item-id");
        const itemLevel =
            typeof $target.attr("data-level") === "string"
                ? (Number($target.attr("data-level") || 0) as ZeroToEleven)
                : null;
        const actor = this.actor;
        const item = actor.items.get(itemId ?? "");

        if (itemLevel === null || item?.data.type !== "spellcastingEntry") {
            return;
        }

        const systemData = item.data.toObject().data;
        if (!systemData.slots) return;
        const slot = `slot${itemLevel}` as const;
        systemData.slots[slot].value = systemData.slots[slot].max;

        await item.update({ "data.slots": systemData.slots });
    }

    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // do not update max health if the value has not actually changed
        if (this.isElite || this.isWeak) {
            const { max } = this.actor.data.data.attributes.hp;
            if (formData["data.attributes.hp.max"] === max) {
                delete formData["data.attributes.hp.max"];
            }
        }

        // update shield hp
        const shield = this.actor.heldShield;
        if (shield && Number.isInteger(formData["data.attributes.shield.value"])) {
            await shield.update({
                "data.hp.value": formData["data.attributes.shield.value"],
            });
        }
        await super._updateObject(event, formData);
    }
}
