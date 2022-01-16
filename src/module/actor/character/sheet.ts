import { ItemPF2e } from "@item/base";
import { calculateBulk, formatBulk, indexBulkItemsById, itemsFromActorData } from "@item/physical/bulk";
import { getContainerMap } from "@item/container/helpers";
import { ClassData, FeatData, ItemDataPF2e, ItemSourcePF2e, LoreData, PhysicalItemData, WeaponData } from "@item/data";
import { calculateEncumbrance } from "@item/physical/encumbrance";
import { FeatSource } from "@item/feat/data";
import { SpellcastingEntryPF2e } from "@item/spellcasting-entry";
import { MODIFIER_TYPE, ProficiencyModifier } from "@module/modifiers";
import { goesToEleven } from "@module/data";
import { CharacterPF2e } from ".";
import { CreatureSheetPF2e } from "../creature/sheet";
import { ManageCombatProficiencies } from "../sheet/popups/manage-combat-proficiencies";
import { ErrorPF2e, groupBy, objectHasKey } from "@util";
import { FeatPF2e, LorePF2e } from "@item";
import { AncestryBackgroundClassManager } from "@item/abc/manager";
import { CharacterProficiency, MartialProficiencies } from "./data";
import { BaseWeaponType, WeaponGroup, WEAPON_CATEGORIES } from "@item/weapon/data";
import { CraftingFormula } from "@module/crafting/formula";
import { PhysicalItemType } from "@item/physical/data";
import { craft } from "@system/actions/crafting/craft";
import { CheckDC } from "@system/check-degree-of-success";
import { craftItem, craftSpellConsumable } from "@module/crafting/helpers";
import { CharacterSheetData } from "./data/sheet";
import { CraftingEntry } from "@module/crafting/crafting-entry";
import { isSpellConsumable } from "@item/consumable/spell-consumables";
import { LocalizePF2e } from "@system/localize";
import { PCSheetTabManager } from "./tab-manager";

export class CharacterSheetPF2e extends CreatureSheetPF2e<CharacterPF2e> {
    // A cache of this PC's known formulas, for use by sheet callbacks
    private knownFormulas!: Map<string, CraftingFormula>;

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["default", "sheet", "actor", "pc"],
            width: 750,
            height: 800,
            tabs: [
                { navSelector: ".sheet-navigation", contentSelector: ".sheet-content", initial: "character" },
                { navSelector: ".actions-nav", contentSelector: ".actions-panels", initial: "encounter" },
            ],
            showUnpreparedSpells: false,
        });
    }

    override get template() {
        const template = this.actor.limited && !game.user.isGM ? "limited" : "sheet";
        return `systems/pf2e/templates/actors/character/${template}.html`;
    }

    override async getData(options?: ActorSheetOptions): Promise<CharacterSheetData> {
        const sheetData: CharacterSheetData = await super.getData(options);

        // Martial Proficiencies
        const proficiencies = Object.entries(sheetData.data.martial);
        for (const [key, proficiency] of proficiencies) {
            const groupMatch = /^weapon-group-([-\w]+)$/.exec(key);
            const baseWeaponMatch = /^weapon-base-([-\w]+)$/.exec(key);
            const label = ((): string => {
                if (objectHasKey(CONFIG.PF2E.martialSkills, key)) {
                    return CONFIG.PF2E.martialSkills[key];
                }
                if (objectHasKey(CONFIG.PF2E.weaponCategories, key)) {
                    return CONFIG.PF2E.weaponCategories[key];
                }
                if (Array.isArray(groupMatch)) {
                    const weaponGroup = groupMatch[1] as WeaponGroup;
                    return CONFIG.PF2E.weaponGroups[weaponGroup];
                }
                if (Array.isArray(baseWeaponMatch)) {
                    const baseWeapon = baseWeaponMatch[1] as BaseWeaponType;
                    return LocalizePF2e.translations.PF2E.Weapon.Base[baseWeapon];
                }
                return proficiency.label ?? key;
            })();

            // proficiency.icon = this.getProficiencyIcon(proficiency.rank);
            // proficiency.hover = CONFIG.PF2E.proficiencyLevels[proficiency.rank];
            proficiency.label = game.i18n.localize(label);
            proficiency.value = ProficiencyModifier.fromLevelAndRank(
                sheetData.data.details.level.value,
                proficiency.rank || 0
            ).modifier;
        }

        // ABC
        sheetData.ancestry = this.actor.ancestry;
        sheetData.heritage = this.actor.heritage;
        sheetData.background = this.actor.background;
        sheetData.class = this.actor.class;

        // Update hero points label
        sheetData.data.resources.heroPoints.icon = this.getHeroPointsIcon(sheetData.data.resources.heroPoints.value);
        sheetData.data.resources.heroPoints.hover = game.i18n.format(
            this.actor.heroPoints.value === 1 ? "PF2E.HeroPointRatio.One" : "PF2E.HeroPointRatio.Many",
            this.actor.heroPoints
        );

        // Update class DC label
        sheetData.data.attributes.classDC.icon = this.getProficiencyIcon(sheetData.data.attributes.classDC.rank);
        sheetData.data.attributes.classDC.hover = CONFIG.PF2E.proficiencyLevels[sheetData.data.attributes.classDC.rank];

        // Spell Details
        sheetData.magicTraditions = CONFIG.PF2E.magicTraditions;
        sheetData.preparationType = CONFIG.PF2E.preparationType;
        sheetData.showUnpreparedSpells = sheetData.options.showUnpreparedSpells;

        // Update dying icon and container width
        sheetData.data.attributes.dying.icon = this.getDyingIcon(sheetData.data.attributes.dying.value);

        // Update wounded, maximum wounded, and doomed.
        sheetData.data.attributes.wounded.icon = this.getWoundedIcon(sheetData.data.attributes.wounded.value);
        sheetData.data.attributes.wounded.max = sheetData.data.attributes.dying.max - 1;
        sheetData.data.attributes.doomed.icon = this.getDoomedIcon(sheetData.data.attributes.doomed.value);
        sheetData.data.attributes.doomed.max = sheetData.data.attributes.dying.max - 1;

        // preparing the name of the rank, as this is displayed on the sheet
        sheetData.data.attributes.perception.rankName = game.i18n.format(
            `PF2E.ProficiencyLevel${sheetData.data.attributes.perception.rank}`
        );

        // ensure saves are displayed in the following order:
        sheetData.data.saves = {
            fortitude: sheetData.data.saves.fortitude,
            reflex: sheetData.data.saves.reflex,
            will: sheetData.data.saves.will,
        };
        for (const save of Object.values(sheetData.data.saves as Record<any, any>)) {
            save.rankName = game.i18n.format(`PF2E.ProficiencyLevel${save.rank}`);
        }
        sheetData.data.attributes.classDC.rankName = game.i18n.format(
            `PF2E.ProficiencyLevel${sheetData.data.attributes.classDC.rank}`
        );

        // limiting the amount of characters for the save labels
        for (const save of Object.values(sheetData.data.saves as Record<any, any>)) {
            save.short = game.i18n.format(`PF2E.Saves${save.label}Short`);
        }

        // Is the character's key ability score overridden by an Active Effect?
        sheetData.data.details.keyability.singleOption = this.actor.class?.data.data.keyAbility.value.length === 1;

        sheetData.data.effects = {};

        sheetData.data.effects.conditions = game.pf2e.ConditionManager.getFlattenedConditions(
            this.actor.itemTypes.condition
        );
        // Is the stamina variant rule enabled?
        sheetData.hasStamina = game.settings.get("pf2e", "staminaVariant") > 0;

        this.prepareSpellcasting(sheetData);

        const formulasByLevel = await this.prepareCraftingFormulas();
        sheetData.crafting = {
            noCost: this.actor.data.flags.pf2e.freeCrafting || this.actor.data.flags.pf2e.quickAlchemy,
            hasQuickAlchemy: this.actor.itemTypes.action.some((a) => a.slug === "quick-alchemy"),
            knownFormulas: formulasByLevel,
            entries: await this.prepareCraftingEntries(),
        };
        this.knownFormulas = new Map(
            Object.values(formulasByLevel)
                .flat()
                .map((formula): [string, CraftingFormula] => [formula.uuid, formula])
        );

        sheetData.abpEnabled = game.settings.get("pf2e", "automaticBonusVariant") !== "noABP";

        // Sort attack/defense proficiencies
        const combatProficiencies = sheetData.data.martial;
        const weaponCategories: readonly string[] = WEAPON_CATEGORIES;
        const isWeaponProficiency = (key: string): boolean => weaponCategories.includes(key) || /\bweapon\b/.test(key);
        sheetData.data.martial = Object.entries(combatProficiencies)
            .sort(([keyA, valueA], [keyB, valueB]) =>
                isWeaponProficiency(keyA) && !isWeaponProficiency(keyB)
                    ? -1
                    : !isWeaponProficiency(keyA) && isWeaponProficiency(keyB)
                    ? 1
                    : (valueA.label ?? "").localeCompare(valueB.label ?? "")
            )
            .reduce(
                (proficiencies: Record<string, CharacterProficiency>, [key, proficiency]) => ({
                    ...proficiencies,
                    [key]: proficiency,
                }),
                {}
            ) as MartialProficiencies;

        // show hints for some things being modified
        const baseData = this.actor.toObject();
        sheetData.adjustedBonusEncumbranceBulk =
            this.actor.attributes.bonusEncumbranceBulk !== baseData.data.attributes.bonusEncumbranceBulk;
        sheetData.adjustedBonusLimitBulk =
            this.actor.attributes.bonusLimitBulk !== baseData.data.attributes.bonusLimitBulk;

        sheetData.tabVisibility = deepClone(this.actor.data.flags.pf2e.sheetTabs);

        // Return data for rendering
        return sheetData;
    }

    /**
     * Organize and classify Items for Character sheets
     */
    protected prepareItems(sheetData: CharacterSheetData) {
        const actorData: any = sheetData.actor;
        // Inventory
        const inventory: Record<
            Exclude<PhysicalItemType, "book">,
            {
                label: string;
                items: PhysicalItemData[];
                investedItemCount?: number;
                investedMax?: number;
                overInvested?: boolean;
            }
        > = {
            weapon: { label: game.i18n.localize("PF2E.InventoryWeaponsHeader"), items: [] },
            armor: { label: game.i18n.localize("PF2E.InventoryArmorHeader"), items: [] },
            equipment: { label: game.i18n.localize("PF2E.InventoryEquipmentHeader"), items: [], investedItemCount: 0 },
            consumable: { label: game.i18n.localize("PF2E.InventoryConsumablesHeader"), items: [] },
            treasure: { label: game.i18n.localize("PF2E.InventoryTreasureHeader"), items: [] },
            backpack: { label: game.i18n.localize("PF2E.InventoryBackpackHeader"), items: [] },
        };

        // Feats
        interface GrantedFeat {
            feat: FeatPF2e;
            grants: GrantedFeat[];
        }
        interface SlottedFeat {
            feat?: FeatData;
            id: string;
            level: number | string;
            grants: GrantedFeat[];
        }
        interface FeatSlot {
            label: string;
            feats: SlottedFeat[];
            bonusFeats: { data: FeatData; grants: GrantedFeat[] }[];
            featFilter?: string;
        }

        const tempFeats: FeatData[] = [];
        const featSlots: Record<string, FeatSlot> = {
            ancestryfeature: { label: "PF2E.FeaturesAncestryHeader", feats: [], bonusFeats: [] },
            classfeature: { label: "PF2E.FeaturesClassHeader", feats: [], bonusFeats: [] },
            ancestry: {
                label: "PF2E.FeatAncestryHeader",
                feats: [],
                bonusFeats: [],
                featFilter: "ancestry-" + this.actor.ancestry?.slug,
            },
            class: {
                label: "PF2E.FeatClassHeader",
                feats: [],
                bonusFeats: [],
                featFilter: "classes-" + this.actor.class?.slug,
            },
            dualclass: { label: "PF2E.FeatDualClassHeader", feats: [], bonusFeats: [] },
            archetype: { label: "PF2E.FeatArchetypeHeader", feats: [], bonusFeats: [] },
            skill: { label: "PF2E.FeatSkillHeader", feats: [], bonusFeats: [] },
            general: { label: "PF2E.FeatGeneralHeader", feats: [], bonusFeats: [] },
            bonus: { label: "PF2E.FeatBonusHeader", feats: [], bonusFeats: [] },
        };
        if (game.settings.get("pf2e", "dualClassVariant")) {
            featSlots.dualclass.feats.push({ id: "dualclass-1", level: 1, grants: [] });
            for (let level = 2; level <= actorData.data.details.level.value; level += 2) {
                featSlots.dualclass.feats.push({ id: `dualclass-${level}`, level, grants: [] });
            }
        } else {
            // Use delete so it is in the right place on the sheet
            delete featSlots.dualclass;
        }
        if (game.settings.get("pf2e", "freeArchetypeVariant")) {
            for (let level = 2; level <= actorData.data.details.level.value; level += 2) {
                featSlots.archetype.feats.push({ id: `archetype-${level}`, level, grants: [] });
            }
        } else {
            // Use delete so it is in the right place on the sheet
            delete featSlots.archetype;
        }
        const pfsBoons: FeatData[] = [];
        const deityBoonsCurses: FeatData[] = [];

        // Actions
        const actions: Record<string, { label: string; actions: any[] }> = {
            action: { label: game.i18n.localize("PF2E.ActionsActionsHeader"), actions: [] },
            reaction: { label: game.i18n.localize("PF2E.ActionsReactionsHeader"), actions: [] },
            free: { label: game.i18n.localize("PF2E.ActionsFreeActionsHeader"), actions: [] },
        };

        const readonlyEquipment: unknown[] = [];

        const attacks: { weapon: { label: string; items: WeaponData[]; type: "weapon" } } = {
            weapon: { label: "Compendium Weapon", items: [], type: "weapon" },
        };

        // Skills
        const lores: LoreData[] = [];

        // Iterate through items, allocating to containers
        const bulkConfig = {
            ignoreCoinBulk: game.settings.get("pf2e", "ignoreCoinBulk"),
        };

        const bulkItems = itemsFromActorData(actorData);
        const bulkItemsById = indexBulkItemsById(bulkItems);
        const containers = getContainerMap({
            items: actorData.items.filter((itemData: ItemDataPF2e) => itemData.isPhysical),
            bulkItemsById,
            bulkConfig,
            actorSize: this.actor.size,
        });

        let investedCount = 0; // Tracking invested items
        const investedMax = actorData.data.resources.investiture.max;

        for (const itemData of sheetData.items) {
            const physicalData: ItemDataPF2e = itemData;
            if (physicalData.isPhysical) {
                itemData.showEdit = sheetData.user.isGM || physicalData.isIdentified;
                itemData.img ||= CONST.DEFAULT_TOKEN;

                const containerData = containers.get(itemData._id)!;
                itemData.containerData = containerData;
                itemData.isInContainer = containerData.isInContainer;
                itemData.isInvestable =
                    physicalData.isEquipped && physicalData.isIdentified && physicalData.isInvested !== null;

                // Read-Only Equipment
                if (
                    physicalData.type === "armor" ||
                    physicalData.type === "equipment" ||
                    physicalData.type === "consumable" ||
                    physicalData.type === "backpack"
                ) {
                    readonlyEquipment.push(itemData);
                    actorData.hasEquipment = true;
                }

                itemData.canBeEquipped = !containerData.isInContainer;
                itemData.isSellableTreasure =
                    itemData.showEdit &&
                    physicalData.type === "treasure" &&
                    physicalData.data.stackGroup.value !== "coins";
                if (physicalData.isInvested) {
                    investedCount += 1;
                }

                // Inventory
                if (Object.keys(inventory).includes(itemData.type)) {
                    itemData.data.quantity.value = physicalData.data.quantity.value || 0;
                    itemData.data.weight.value = physicalData.data.weight.value || 0;
                    const bulkItem = bulkItemsById.get(physicalData._id);
                    const [approximatedBulk] = calculateBulk({
                        items: bulkItem === undefined ? [] : [bulkItem],
                        bulkConfig: bulkConfig,
                        actorSize: this.actor.data.data.traits.size.value,
                    });
                    itemData.totalWeight = formatBulk(approximatedBulk);
                    itemData.hasCharges = physicalData.type === "consumable" && physicalData.data.charges.max > 0;
                    if (physicalData.type === "weapon") {
                        itemData.isTwoHanded = physicalData.data.traits.value.some((trait: string) =>
                            trait.startsWith("two-hand")
                        );
                        itemData.wieldedTwoHanded = physicalData.data.hands.value;
                        attacks.weapon.items.push(itemData);
                    }
                    if (physicalData.type === "book") {
                        inventory.equipment.items.push(itemData);
                    } else {
                        inventory[physicalData.type].items.push(itemData);
                    }
                }
            }

            // Feats
            else if (itemData.type === "feat") {
                const actionType = itemData.data.actionType.value || "passive";

                tempFeats.push(itemData);

                if (Object.keys(actions).includes(actionType)) {
                    itemData.feat = true;
                    itemData.img = CharacterPF2e.getActionGraphics(
                        actionType,
                        parseInt((itemData.data.actions || {}).value, 10) || 1
                    ).imageUrl;
                    actions[actionType].actions.push(itemData);
                }
            }

            // Lore Skills
            else if (itemData.type === "lore") {
                itemData.data.icon = this.getProficiencyIcon((itemData.data.proficient || {}).value);
                itemData.data.hover = CONFIG.PF2E.proficiencyLevels[(itemData.data.proficient || {}).value];

                const rank = itemData.data.proficient?.value || 0;
                const proficiency = ProficiencyModifier.fromLevelAndRank(
                    actorData.data.details.level.value,
                    rank
                ).modifier;
                const modifier = actorData.data.abilities.int.mod;
                const itemBonus = Number((itemData.data.item || {}).value || 0);
                itemData.data.itemBonus = itemBonus;
                itemData.data.value = modifier + proficiency + itemBonus;
                itemData.data.breakdown = `int modifier(${modifier}) + proficiency(${proficiency}) + item bonus(${itemBonus})`;

                lores.push(itemData);
            }

            // Actions
            else if (itemData.type === "action") {
                const actionType = ["free", "reaction", "passive"].includes(itemData.data.actionType.value)
                    ? itemData.data.actionType.value
                    : "action";
                itemData.img = CharacterPF2e.getActionGraphics(
                    actionType,
                    parseInt((itemData.data.actions || {}).value, 10) || 1
                ).imageUrl;
                if (actionType === "passive") actions.free.actions.push(itemData);
                else actions[actionType].actions.push(itemData);
            }

            // class
            else if (itemData.type === "class") {
                const classItem: ClassData = itemData;
                const mapFeatLevels = (featLevels: number[], prefix: string): SlottedFeat[] => {
                    if (!featLevels) {
                        return [];
                    }
                    return featLevels
                        .filter((featSlotLevel: number) => actorData.data.details.level.value >= featSlotLevel)
                        .map((level) => ({ id: `${prefix}-${level}`, level, grants: [] }));
                };

                featSlots.ancestry.feats = mapFeatLevels(classItem.data.ancestryFeatLevels?.value, "ancestry");
                featSlots.class.feats = mapFeatLevels(classItem.data.classFeatLevels?.value, "class");
                featSlots.skill.feats = mapFeatLevels(classItem.data.skillFeatLevels?.value, "skill");
                featSlots.general.feats = mapFeatLevels(classItem.data.generalFeatLevels?.value, "general");
            }
        }

        if (game.settings.get("pf2e", "ancestryParagonVariant")) {
            featSlots.ancestry.feats.unshift({
                id: "ancestry-bonus",
                level: 1,
                grants: [],
            });
            for (let level = 3; level <= actorData.data.details.level.value; level += 4) {
                const index = (level + 1) / 2;
                featSlots.ancestry.feats.splice(index, 0, { id: `ancestry-${level}`, level, grants: [] });
            }
        }

        const background = this.actor.background;
        if (background && Object.keys(background.data.data.items).length > 0) {
            featSlots.skill.feats.unshift({
                id: background.id,
                level: game.i18n.localize("PF2E.FeatBackgroundShort"),
                grants: [],
            });
        }

        inventory.equipment.investedItemCount = investedCount; // Tracking invested items
        inventory.equipment.investedMax = investedMax;
        inventory.equipment.overInvested = investedMax < investedCount;

        // put the feats in their feat slots
        const allFeatSlots = Object.values(featSlots).flatMap((slot) => slot.feats);
        for (const featData of tempFeats) {
            if (featData.flags.pf2e.grantedBy && !featData.data.location) {
                const granter = this.actor.items.get(featData.flags.pf2e.grantedBy);
                if (granter instanceof FeatPF2e) continue;
            }

            let slotIndex = allFeatSlots.findIndex((slotted) => slotted.id === featData.data.location);
            const existing = allFeatSlots[slotIndex]?.feat;
            if (slotIndex !== -1 && existing) {
                console.debug(`Foundry VTT | Multiple feats with same index: ${featData.name}, ${existing.name}`);
                slotIndex = -1;
            }

            const getGrants = (grantedIds: string[]): GrantedFeat[] => {
                return grantedIds.flatMap((grantedId: string) => {
                    const item = this.actor.items.get(grantedId);
                    return item instanceof FeatPF2e && !item.data.data.location
                        ? { feat: item, grants: getGrants(item.data.flags.pf2e.itemGrants) }
                        : [];
                });
            };

            if (slotIndex !== -1) {
                const slot = allFeatSlots[slotIndex];
                slot.feat = featData;
                slot.grants = getGrants(featData.flags.pf2e.itemGrants);
            } else {
                let featType = featData.data.featType.value || "bonus";

                if (featType === "pfsboon") {
                    pfsBoons.push(featData);
                } else if (["deityboon", "curse"].includes(featType)) {
                    deityBoonsCurses.push(featData);
                } else {
                    if (!["ancestryfeature", "classfeature"].includes(featType)) {
                        featType = "bonus";
                    }

                    if (objectHasKey(featSlots, featType)) {
                        const slots = featSlots[featType];
                        const bonusFeat = {
                            data: featData,
                            grants: getGrants(featData.flags.pf2e.itemGrants),
                        };
                        slots.bonusFeats.push(bonusFeat);
                    }
                }
            }
        }
        featSlots.classfeature.bonusFeats.sort((a, b) => (a.data.data.level.value > b.data.data.level.value ? 1 : -1));

        // assign mode to actions
        Object.values(actions)
            .flatMap((section) => section.actions)
            .forEach((action: any) => {
                action.downtime = action.data.traits.value.includes("downtime");
                action.exploration = action.data.traits.value.includes("exploration");
                action.encounter = !(action.downtime || action.exploration);
            });

        // Assign and return
        actorData.inventory = inventory;

        actorData.featSlots = featSlots;
        actorData.pfsBoons = pfsBoons;
        actorData.deityBoonsCurses = deityBoonsCurses;
        actorData.attacks = attacks;
        actorData.actions = actions;
        actorData.readonlyEquipment = readonlyEquipment;
        actorData.lores = lores;

        const bonusEncumbranceBulk: number = actorData.data.attributes.bonusEncumbranceBulk ?? 0;
        const bonusLimitBulk: number = actorData.data.attributes.bonusLimitBulk ?? 0;
        const [bulk] = calculateBulk({
            items: bulkItems,
            bulkConfig: bulkConfig,
            actorSize: this.actor.data.data.traits.size.value,
        });
        actorData.data.attributes.encumbrance = calculateEncumbrance(
            actorData.data.abilities.str.mod,
            bonusEncumbranceBulk,
            bonusLimitBulk,
            bulk,
            actorData.data?.traits?.size?.value ?? "med"
        );
    }

    protected prepareSpellcasting(sheetData: CharacterSheetData) {
        sheetData.spellcastingEntries = [];
        for (const itemData of sheetData.items) {
            if (itemData.type === "spellcastingEntry") {
                const entry = this.actor.spellcasting.get(itemData._id);
                if (!(entry instanceof SpellcastingEntryPF2e)) continue;
                sheetData.spellcastingEntries.push({
                    ...itemData,
                    ...entry.getSpellData(),
                });
            }
        }
    }

    protected async prepareCraftingFormulas(): Promise<Record<number, CraftingFormula[]>> {
        const craftingFormulas = await this.actor.getCraftingFormulas();
        return Object.fromEntries(groupBy(craftingFormulas, (formula) => formula.level));
    }

    protected async prepareCraftingEntries() {
        const actorCraftingEntries = await this.actor.getCraftingEntries();
        const craftingEntries = {
            other: <CraftingEntry[]>[],
            alchemical: {
                entries: <CraftingEntry[]>[],
                totalReagentCost: 0,
                infusedReagents: this.actor.data.data.resources.crafting.infusedReagents,
            },
        };
        actorCraftingEntries.forEach((entry) => {
            if (entry.isAlchemical) {
                craftingEntries.alchemical.entries.push(entry);
                craftingEntries.alchemical.totalReagentCost += entry.reagentCost || 0;
            } else {
                craftingEntries.other.push(entry);
            }
        });
        return craftingEntries;
    }

    /** Disable the initiative button located on the sidebar */
    disableInitiativeButton(): void {
        this.element
            .find(".sidebar a.roll-init")
            .addClass("disabled")
            .attr({ title: game.i18n.localize("PF2E.Encounter.NoActiveEncounter") });
    }

    /** Enable the initiative button located on the sidebar */
    enableInitiativeButton(): void {
        this.element.find(".sidebar a.roll-init").removeClass("disabled").removeAttr("title");
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        // Initiative button
        if (game.combat) {
            this.enableInitiativeButton();
        } else {
            this.disableInitiativeButton();
        }

        // Recheck for the presence of an encounter in case the button state has somehow fallen out of sync
        $html.find(".roll-init").on("mouseenter", (event) => {
            const $target = $(event.currentTarget);
            if ($target.hasClass("disabled") && game.combat) {
                this.enableInitiativeButton();
            } else if (!$target.hasClass("disabled") && !game.combat) {
                this.disableInitiativeButton();
            }
        });

        // Left/right-click adjustments (increment or decrement) of actor and item stats
        $html.find(".adjust-stat").on("click contextmenu", (event) => this.onClickAdjustStat(event));
        $html.find(".adjust-stat-select").on("change", (event) => this.onChangeAdjustStat(event));
        $html.find(".adjust-item-stat").on("click contextmenu", (event) => this.onClickAdjustItemStat(event));
        $html.find(".adjust-item-stat-select").on("change", (event) => this.onChangeAdjustItemStat(event));

        {
            // ensure correct tab name is displayed after actor update
            const title = $(".sheet-navigation .active").data("tabTitle");
            if (title) {
                $html.find(".navigation-title").text(title);
            }
        }

        $html.find(".sheet-navigation").on("mouseover", ".item,.manage-tabs", (event) => {
            const title = event.currentTarget.dataset.tabTitle;
            if (title) {
                $(event.currentTarget).parents(".sheet-navigation").find(".navigation-title").text(title);
            }
        });

        $html.find(".sheet-navigation").on("mouseout", ".item,.manage-tabs", (event) => {
            const parent = $(event.currentTarget).parents(".sheet-navigation");
            const title = parent.find(".item.active").data("tabTitle");
            if (title) {
                parent.find(".navigation-title").text(title);
            }
        });

        // open ancestry, background, or class compendium
        $html.find(".open-compendium").on("click", (event) => {
            if (event.currentTarget.dataset.compendium) {
                const compendium = game.packs.get(event.currentTarget.dataset.compendium);
                if (compendium) {
                    compendium.render(true);
                }
            }
        });

        $html.find(".crb-trait-selector").on("click", (event) => this.onTraitSelector(event));

        // ACTIONS
        const $actions = $html.find(".tab.actions");

        // filter strikes
        $actions.find(".toggle-unready-strikes").on("click", () => {
            this.actor.setFlag(
                game.system.id,
                "showUnreadyStrikes",
                !this.actor.getFlag(game.system.id, "showUnreadyStrikes")
            );
        });

        $actions.find(".actions-list span[data-roll-option]").on("click", (event) => {
            const { rollName, rollOption } = event.currentTarget.dataset;
            if (!(rollName && rollOption)) return;
            this.actor.toggleRollOption(rollName, rollOption);
        });

        const $strikesList = $actions.find(".strikes-list");

        // Set damage-formula tooltips on damage buttons
        const damageButtonSelectors = [
            'button[data-action="strike-damage"]',
            'button[data-action="strike-critical"]',
        ].join(", ");
        const $damageButtons = $strikesList.find<HTMLButtonElement>(damageButtonSelectors);
        for (const damageButton of $damageButtons) {
            const $button = $(damageButton);
            const method = $button.attr("data-action") === "strike-damage" ? "damage" : "critical";
            const strike = this.getStrikeFromDOM($button[0]);
            const formula = strike?.[method]?.({ getFormula: true });
            if (formula) {
                $button.attr({ title: formula });
                $button.tooltipster({
                    position: "bottom",
                    theme: "crb-hover",
                });
            }
        }

        $strikesList.find(".item-summary .item-properties.tags .tag").each((_idx, span) => {
            if (span.dataset.description) {
                $(span).tooltipster({
                    content: game.i18n.localize(span.dataset.description),
                    maxWidth: 400,
                    theme: "crb-hover",
                });
            }
        });

        $strikesList.find(".melee-icon").tooltipster({
            content: game.i18n.localize("PF2E.Item.Weapon.MeleeUsage.Label"),
            position: "left",
            theme: "crb-hover",
        });

        $strikesList.find('select[name="ammo-used"]').on("change", (event) => {
            event.stopPropagation();

            const actionIndex = $(event.currentTarget).parents(".item").attr("data-action-index");
            const action = this.actor.data.data.actions[Number(actionIndex)];
            const weapon = this.actor.items.get(action.item);
            const ammo = this.actor.items.get($(event.currentTarget).val() as string);

            if (weapon) weapon.update({ data: { selectedAmmoId: ammo?.id ?? null } });
        });

        $html.find(".add-modifier .fas.fa-plus-circle").on("click", (event) => this.onIncrementModifierValue(event));
        $html.find(".add-modifier .fas.fa-minus-circle").on("click", (event) => this.onDecrementModifierValue(event));
        $html.find(".add-modifier .add-modifier-submit").on("click", (event) => this.onAddCustomModifier(event));
        $html.find(".modifier-list .remove-modifier").on("click", (event) => this.onRemoveCustomModifier(event));

        // Toggle invested state
        $html.find(".item-toggle-invest").on("click", (event) => {
            const f = $(event.currentTarget);
            const itemId = f.parents(".item").attr("data-item-id") ?? "";
            this.actor.toggleInvested(itemId);
        });

        $html.find("i.fa-info-circle.small[title]").tooltipster({
            maxWidth: 275,
            position: "right",
            theme: "crb-hover",
            contentAsHTML: true,
        });

        {
            // Add and remove combat proficiencies
            const $tab = $html.find(".tab.proficiencies");
            const $header = $tab.find("ol.combat-proficiencies");
            $header.find("a.add").on("click", (event) => {
                ManageCombatProficiencies.add(this.actor, event);
            });
            const $list = $tab.find("ol.combat-list");
            $list.find("li.skill.custom a.delete").on("click", (event) => {
                ManageCombatProficiencies.remove(this.actor, event);
            });
        }

        $html.find(".hover").tooltipster({
            trigger: "click",
            arrow: false,
            contentAsHTML: true,
            debug: BUILD_MODE === "development",
            interactive: true,
            side: ["right", "bottom"],
            theme: "crb-hover",
            minWidth: 120,
        });

        // Toggle Dying, Wounded, or Doomed
        $html
            .find("aside > .sidebar > .hitpoints")
            .find(".dots.dying, .dots.wounded, .dots.doomed")
            .on("click contextmenu", (event) => {
                type ConditionName = "dying" | "wounded" | "doomed";
                const condition = Array.from(event.delegateTarget.classList).find(
                    (className): className is ConditionName => ["dying", "wounded", "doomed"].includes(className)
                );
                if (condition) {
                    this.onClickDyingWoundedDoomed(condition, event);
                }
            });

        // Spontaneous Spell slot reset handler:
        $html.find(".spell-slots-increment-reset").on("click", (event) => {
            const target = $(event.currentTarget);
            const itemId = target.data().itemId;
            const itemLevel = target.data().level;
            const actor = this.actor;
            const item = actor.items.get(itemId);
            if (item?.data.type !== "spellcastingEntry") return;

            const data = item.data.toObject();
            if (!data.data.slots) return;
            const slotLevel = goesToEleven(itemLevel) ? (`slot${itemLevel}` as const) : "slot0";
            data.data.slots[slotLevel].value = data.data.slots[slotLevel].max;

            item.update(data);
        });

        const $craftingOptions = $html.find(".crafting-options").find("input:checkbox");
        $craftingOptions.on("click", async (event) => {
            const flags: string[] = [];
            $craftingOptions.each((_index, element) => {
                if (element !== event.target) {
                    flags.push($(element).attr("flag") as string);
                }
            });
            flags.forEach(async (flag) => {
                await this.actor.setFlag("pf2e", flag, false);
            });
        });

        const $formulas = $html.find(".craftingEntry-list");

        $formulas.find(".craft-item").on("click", async (event) => {
            const { itemUuid } = event.currentTarget.dataset;
            const itemQuantity =
                Number($(event.currentTarget).parent().siblings(".formula-quantity").children("input").val()) || 1;
            const formula = this.knownFormulas.get(itemUuid ?? "");
            if (!formula) return;

            if (this.actor.data.flags.pf2e.quickAlchemy) {
                const reagentValue = this.actor.data.data.resources.crafting.infusedReagents.value - itemQuantity;
                if (reagentValue < 0) {
                    ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.MissingReagents"));
                    return;
                }
                await this.actor.update({ "data.resources.crafting.infusedReagents.value": reagentValue });
                craftItem(formula.item, itemQuantity, this.actor, true);
                return;
            }

            if (this.actor.data.flags.pf2e.freeCrafting) {
                const itemId = itemUuid?.split(".").pop() ?? "";
                if (isSpellConsumable(itemId)) {
                    craftSpellConsumable(formula.item, itemQuantity, this.actor);
                    return;
                }
                craftItem(formula.item, itemQuantity, this.actor);
                return;
            }

            const dc: CheckDC = {
                value: formula.dc,
                visibility: "all",
                adjustments: this.actor.data.data.skills["cra"].adjustments,
                scope: "CheckOutcome",
            };

            craft({ dc, item: formula.item, quantity: itemQuantity, event, actors: this.actor });
        });

        $formulas.find(".formula-increase-quantity, .formula-decrease-quantity").on("click", async (event) => {
            const $target = $(event.currentTarget);

            const itemUUID = $target.closest("li.formula-item").attr("data-item-id");
            const entrySelector = $target.closest("li.crafting-entry").attr("data-entry-selector");
            if (entrySelector) {
                const craftingEntry = await this.actor.getCraftingEntry(entrySelector);
                if (!craftingEntry) throw ErrorPF2e("Crafting entry not found");
                const index = $target.closest("li.formula-item").attr("data-item-index");
                $target.text().trim() === "+"
                    ? await craftingEntry.increaseFormulaQuantity(Number(index), itemUUID ?? "")
                    : await craftingEntry.decreaseFormulaQuantity(Number(index), itemUUID ?? "");
                return;
            }

            const formula = this.knownFormulas.get(itemUUID ?? "");
            if (!formula) throw ErrorPF2e("Formula not found");

            const batchSize = formula.minimumBatchSize;
            const step = $target.text().trim() === "+" ? batchSize : -batchSize;
            const value = Number($target.siblings("input").val()) || step;
            $target.siblings("input").val(Math.max(value + step, batchSize));
        });

        $formulas.find(".formula-unprepare").on("click", async (event) => {
            const $target = $(event.currentTarget);
            const itemUUID = $target.closest("li.formula-item").attr("data-item-id");
            const index = $target.closest("li.formula-item").attr("data-item-index");
            const entrySelector = $target.closest("li.crafting-entry").attr("data-entry-selector");

            if (!itemUUID || !index || !entrySelector) return;

            const craftingEntry = await this.actor.getCraftingEntry(entrySelector);
            if (!craftingEntry) throw ErrorPF2e("Crafting entry not found");
            await craftingEntry.unprepareFormula(Number(index), itemUUID);
        });

        $formulas.find(".toggle-formula-expended").on("click", async (event) => {
            const $target = $(event.currentTarget);
            const itemUUID = $target.closest("li.formula-item").attr("data-item-id");
            const index = $target.closest("li.formula-item").attr("data-item-index");
            const entrySelector = $target.closest("li.crafting-entry").attr("data-entry-selector");

            if (!itemUUID || !index || !entrySelector) return;

            const craftingEntry = await this.actor.getCraftingEntry(entrySelector);
            if (!craftingEntry) throw ErrorPF2e("Crafting entry not found");
            await craftingEntry.toggleFormulaExpended(Number(index), itemUUID);
        });

        $formulas.find(".toggle-signature-item").on("click", async (event) => {
            const $target = $(event.currentTarget);
            const itemUUID = $target.closest("li.formula-item").attr("data-item-id");
            const index = $target.closest("li.formula-item").attr("data-item-index");
            const entrySelector = $target.closest("li.crafting-entry").attr("data-entry-selector");

            if (!itemUUID || !index || !entrySelector) return;

            const craftingEntry = await this.actor.getCraftingEntry(entrySelector);
            if (!craftingEntry) throw ErrorPF2e("Crafting entry not found");
            await craftingEntry.toggleSignatureItem(Number(index), itemUUID);
        });

        $formulas.find(".infused-reagents").on("change", (event) => {
            const change = Number($(event.target).val());
            const infusedReagents = this.actor.data.data.resources.crafting.infusedReagents;
            const value = Math.clamped(change, 0, infusedReagents?.max ?? 0);
            this.actor.update({ "data.resources.crafting.infusedReagents.value": value });
        });

        $formulas.find(".daily-crafting").on("click", async () => await this.actor.performDailyCrafting());

        PCSheetTabManager.initialize(this.actor, $html.find<HTMLAnchorElement>('a[data-action="manage-tabs"]')[0]);
    }

    /** Handle changing of proficiency-rank via dropdown */
    private async onChangeAdjustStat(event: JQuery.TriggeredEvent<HTMLElement>): Promise<void> {
        const $select = $(event.delegateTarget);
        const propertyKey = $select.attr("data-property") ?? "";
        const currentValue = getProperty(this.actor.data, propertyKey);
        const selectedValue = Number($select.val());

        if (typeof currentValue !== "number") throw ErrorPF2e("Actor property not found");

        const newValue = Math.clamped(selectedValue, 0, 4);

        await this.actor.update({ [propertyKey]: newValue });
        if (newValue !== getProperty(this.actor.data, propertyKey)) {
            ui.notifications.info(game.i18n.localize("PF2E.ErrorMessage.MinimumProfLevelSetByFeatures"));
        }
    }

    /** Handle clicking of proficiency-rank adjustment buttons */
    private async onClickAdjustStat(event: JQuery.TriggeredEvent<HTMLElement>): Promise<void> {
        const $button = $(event.delegateTarget);
        const propertyKey = $button.attr("data-property") ?? "";
        const currentValue = getProperty(this.actor.data, propertyKey);

        if (typeof currentValue !== "number") throw ErrorPF2e("Actor property not found");

        const change = event.type === "click" ? 1 : -1;
        const max = propertyKey.includes("heroPoints") ? 3 : 4;
        const update = currentValue + change;
        const newValue = Math.clamped(update, 0, max);

        await this.actor.update({ [propertyKey]: newValue });
    }

    /** Handle changing of lore and spellcasting entry proficiency-rank via dropdown */
    private async onChangeAdjustItemStat(event: JQuery.TriggeredEvent<HTMLElement>): Promise<void> {
        const $select = $(event.delegateTarget);
        const propertyKey = $select.attr("data-item-property") ?? "";
        const selectedValue = Number($select.val());

        const itemId = $select.closest(".item").attr("data-item-id") ?? "";
        const item = this.actor.items.get(itemId);
        if (!item) throw ErrorPF2e("Item not found");

        // Retrieve and validate the updated value
        const newValue = ((): number | undefined => {
            if (item instanceof SpellcastingEntryPF2e) {
                const dispatch: Record<string, () => number> = {
                    "data.proficiency.value": () => Math.clamped(selectedValue, 0, 4),
                };
                return dispatch[propertyKey]?.();
            } else if (item instanceof LorePF2e) {
                return Math.clamped(selectedValue, 0, 4);
            } else {
                throw ErrorPF2e("Item not recognized");
            }
        })();

        if (typeof newValue === "number") {
            await item.update({ [propertyKey]: newValue });
        }
    }

    /** Handle clicking of lore and spellcasting entry adjustment buttons */
    private async onClickAdjustItemStat(event: JQuery.TriggeredEvent<HTMLElement>): Promise<void> {
        const $button = $(event.delegateTarget);
        const itemId = $button.closest(".item").attr("data-item-id") ?? "";
        const item = this.actor.items.get(itemId);
        if (!item) throw ErrorPF2e("Item not found");

        const propertyKey = $button.attr("data-item-property") ?? "";
        const change = event.type === "click" ? 1 : -1;

        // Retrieve and validate the updated value
        const newValue = ((): number | undefined => {
            if (item instanceof SpellcastingEntryPF2e) {
                const proficiencyRank = item.data.data.proficiency.value;
                const dispatch: Record<string, () => number> = {
                    "data.proficiency.value": () => Math.clamped(proficiencyRank + change, 0, 4),
                };
                return dispatch[propertyKey]?.();
            } else if (item instanceof LorePF2e) {
                const currentRank = item.data.data.proficient.value;
                return Math.clamped(currentRank + change, 0, 4);
            } else {
                throw ErrorPF2e("Item not recognized");
            }
        })();

        if (typeof newValue === "number") {
            await item.update({ [propertyKey]: newValue });
        }
    }

    private onIncrementModifierValue(event: JQuery.ClickEvent) {
        const parent = $(event.currentTarget).parents(".add-modifier");
        (parent.find(".add-modifier-value input[type=number]")[0] as HTMLInputElement).stepUp();
    }

    private onDecrementModifierValue(event: JQuery.ClickEvent) {
        const parent = $(event.currentTarget).parents(".add-modifier");
        (parent.find(".add-modifier-value input[type=number]")[0] as HTMLInputElement).stepDown();
    }

    private onAddCustomModifier(event: JQuery.ClickEvent<HTMLElement, undefined, HTMLElement>) {
        const parent = $(event.currentTarget).parents(".add-modifier");
        const stat = $(event.currentTarget).attr("data-stat") ?? "";
        const modifier = Number(parent.find(".add-modifier-value input[type=number]").val()) || 1;
        const type = parent.find<HTMLSelectElement>(".add-modifier-type")[0]?.value ?? "";
        const name =
            (parent.find<HTMLInputElement>(".add-modifier-name")[0]?.value ?? "").trim() ||
            game.i18n.localize(`PF2E.ModifierType.${type}`);
        const errors: string[] = [];
        if (!stat.trim()) {
            // This is a UI error rather than a user error
            throw ErrorPF2e("No character attribute found");
        }
        const modifierTypes: string[] = Object.values(MODIFIER_TYPE);
        if (!modifierTypes.includes(type)) {
            errors.push("Type is required.");
        }
        if (errors.length > 0) {
            ui.notifications.error(errors.join(" "));
        } else {
            this.actor.addCustomModifier(stat, name, modifier, type);
        }
    }

    private onRemoveCustomModifier(event: JQuery.ClickEvent) {
        const stat = $(event.currentTarget).attr("data-stat") ?? "";
        const slug = $(event.currentTarget).attr("data-slug") ?? "";
        const errors: string[] = [];
        if (!stat.trim()) {
            errors.push("Statistic is required.");
        }
        if (!slug.trim()) {
            errors.push("Slug is required.");
        }
        if (errors.length > 0) {
            ui.notifications.error(errors.join(" "));
        } else {
            this.actor.removeCustomModifier(stat, slug);
        }
    }

    private isFeatValidInFeatSlot(_slotId: string, featSlotType: string, feat: FeatSource) {
        let featType = feat.data?.featType?.value;
        if (featType === "archetype") {
            if (feat.data.traits.value.includes("skill")) {
                featType = "skill";
            } else {
                featType = "class";
            }
        }

        if (featSlotType === "archetype" || featSlotType === "dualclass") {
            // Archetype feat slots are class feat slots
            featSlotType = "class";
        }

        if (featSlotType === "ancestryfeature") {
            featType = "ancestryfeature";
        }

        if (featSlotType === "general") {
            return ["general", "skill"].includes(featType);
        }

        return featSlotType === featType;
    }

    /** Handle cycling of dying, wounded, or doomed */
    private onClickDyingWoundedDoomed(condition: "dying" | "wounded" | "doomed", event: JQuery.TriggeredEvent) {
        if (event.type === "click") {
            this.actor.increaseCondition(condition, { max: this.actor.data.data.attributes[condition].max });
        } else if (event.type === "contextmenu") {
            this.actor.decreaseCondition(condition);
        }
    }

    private getNearestSlotId(event: ElementDragEvent): JQuery.PlainObject {
        const data = $(event.target).closest(".item").data();
        if (!data) {
            return { slotId: undefined, featType: undefined };
        }
        return data;
    }

    protected override async _onDropItem(
        event: ElementDragEvent,
        data: DropCanvasData<"Item", ItemPF2e>
    ): Promise<ItemPF2e[]> {
        const actor = this.actor;
        const isSameActor = data.actorId === actor.id || (actor.isToken && data.tokenId === actor.token?.id);
        if (isSameActor) {
            return super._onDropItem(event, data);
        }

        event.preventDefault();

        const item = await ItemPF2e.fromDropData(data);
        if (!item) throw ErrorPF2e("Unable to create item from drop data!");
        const itemData = item.toObject();

        const { slotId, featType }: { slotId?: string; featType?: string } = this.getNearestSlotId(event);

        if (itemData.type === "feat") {
            if (slotId && featType && this.isFeatValidInFeatSlot(slotId, featType, itemData)) {
                itemData.data.location = slotId;
                const items = await Promise.all([
                    this.actor.createEmbeddedDocuments("Item", [itemData]),
                    this.actor.updateEmbeddedDocuments(
                        "Item",
                        this.actor.items
                            .filter((x) => x.data.type === "feat" && x.data.data.location === slotId)
                            .map((x) => ({ _id: x.id, "data.location": "" }))
                    ),
                ]);
                return items.flatMap((item) => item);
            }
        } else if (itemData.type === "ancestry" || itemData.type === "background" || itemData.type === "class") {
            return AncestryBackgroundClassManager.addABCItem(itemData, actor);
        }

        return super._onDropItem(event, data);
    }

    protected override async _onDrop(event: ElementDragEvent) {
        const dataString = event.dataTransfer?.getData("text/plain");
        const dropData = JSON.parse(dataString ?? "");
        if ("pf2e" in dropData && dropData.pf2e.type === "CraftingFormula") {
            // Prepare formula if dropped on a crafting entry.
            const $containerEl = $(event.target).closest(".item-container");
            const dropContainerType = $containerEl.attr("data-container-type");
            if (dropContainerType === "craftingEntry") {
                const entrySelector = $containerEl.attr("data-entry-selector") ?? "";
                const craftingEntry = await this.actor.getCraftingEntry(entrySelector);

                if (!craftingEntry) return;

                const craftingFormulas = await this.actor.getCraftingFormulas();
                const formula = craftingFormulas.find((f) => f.uuid === dropData.pf2e.itemUuid);

                if (formula) await craftingEntry.prepareFormula(formula);
                return;
            }
        }
        return super._onDrop(event);
    }

    /**
     * Handle a drop event for an existing Owned Item to sort that item
     * @param event
     * @param itemData
     */
    protected override async _onSortItem(event: ElementDragEvent, itemData: ItemSourcePF2e): Promise<ItemPF2e[]> {
        if (itemData.type === "feat") {
            const { slotId, featType } = this.getNearestSlotId(event);
            if (slotId && featType) {
                if (this.isFeatValidInFeatSlot(slotId, featType, itemData)) {
                    return this.actor.updateEmbeddedDocuments("Item", [
                        {
                            _id: itemData._id,
                            "data.location": slotId,
                        },
                        ...this.actor.items
                            .filter((x) => x.data.type === "feat" && x.data.data.location === slotId)
                            .map((x) => ({ _id: x.id, "data.location": "" })),
                    ]);
                } else {
                    // if they're dragging it away from a slot
                    if (itemData.data.location) {
                        return this.actor.updateEmbeddedDocuments("Item", [
                            {
                                _id: itemData._id,
                                "data.location": "",
                            },
                        ]);
                    }
                }
            }
        }

        return super._onSortItem(event, itemData);
    }

    /** Get the font-awesome icon used to display a certain level of dying */
    private getDyingIcon(level: number) {
        const maxDying = this.object.data.data.attributes.dying.max || 4;
        const doomed = this.object.data.data.attributes.doomed.value || 0;
        const circle = '<i class="far fa-circle"></i>';
        const cross = '<i class="fas fa-times-circle"></i>';
        const skull = '<i class="fas fa-skull"></i>';
        const redOpen = "<span>";
        const redClose = "</span>";
        const icons: Record<number, string> = {};

        for (let dyingLevel = 0; dyingLevel <= maxDying; dyingLevel++) {
            icons[dyingLevel] = dyingLevel === maxDying ? redOpen : "";
            for (let column = 1; column <= maxDying; column++) {
                if (column >= maxDying - doomed || dyingLevel === maxDying) {
                    icons[dyingLevel] += skull;
                } else if (dyingLevel < column) {
                    icons[dyingLevel] += circle;
                } else {
                    icons[dyingLevel] += cross;
                }
            }
            icons[dyingLevel] += dyingLevel === maxDying ? redClose : "";
        }

        return icons[level];
    }

    /**
     * Get the font-awesome icon used to display a certain level of wounded
     */
    private getWoundedIcon(level: number) {
        const maxDying = this.object.data.data.attributes.dying.max || 4;
        const icons: Record<number, string> = {};
        const usedPoint = '<i class="fas fa-dot-circle"></i>';
        const unUsedPoint = '<i class="far fa-circle"></i>';

        for (let i = 0; i < maxDying; i++) {
            let iconHtml = "";
            for (let iconColumn = 1; iconColumn < maxDying; iconColumn++) {
                iconHtml += iconColumn <= i ? usedPoint : unUsedPoint;
            }
            icons[i] = iconHtml;
        }

        return icons[level];
    }

    /**
     * Get the font-awesome icon used to display a certain level of doomed
     */
    private getDoomedIcon(level: number): string {
        const maxDying = this.object.data.data.attributes.dying.max || 4;
        const icons: Record<number, string> = {};
        const usedPoint = '<i class="fas fa-skull"></i>';
        const unUsedPoint = '<i class="far fa-circle"></i>';

        for (let i = 0; i < maxDying; i++) {
            let iconHtml = "";
            for (let iconColumn = 1; iconColumn < maxDying; iconColumn++) {
                iconHtml += iconColumn <= i ? usedPoint : unUsedPoint;
            }
            icons[i] = iconHtml;
        }

        return icons[level] ?? icons[0];
    }

    /** Get the font-awesome icon used to display hero points */
    private getHeroPointsIcon(level: number): string {
        const icons = [
            '<i class="far fa-circle"></i><i class="far fa-circle"></i><i class="far fa-circle"></i>',
            '<i class="fas fa-hospital-symbol"></i><i class="far fa-circle"></i><i class="far fa-circle"></i>',
            '<i class="fas fa-hospital-symbol"></i><i class="fas fa-hospital-symbol"></i><i class="far fa-circle"></i>',
            '<i class="fas fa-hospital-symbol"></i><i class="fas fa-hospital-symbol"></i><i class="fas fa-hospital-symbol"></i>',
        ];
        return icons[level] ?? icons[0];
    }
}
