import { ItemPF2e } from "@item/base";
import { calculateBulk, formatBulk, indexBulkItemsById, itemsFromActorData } from "@item/physical/bulk";
import { getContainerMap } from "@item/container/helpers";
import { FeatSource, ItemDataPF2e, ItemSourcePF2e, LoreData, PhysicalItemData } from "@item/data";
import { calculateEncumbrance } from "@item/physical/encumbrance";
import { SpellcastingEntryPF2e } from "@item/spellcasting-entry";
import { MODIFIER_TYPE, ProficiencyModifier } from "@actor/modifiers";
import { CharacterPF2e } from ".";
import { CreatureSheetPF2e } from "../creature/sheet";
import { ManageCombatProficiencies } from "../sheet/popups/manage-combat-proficiencies";
import { ErrorPF2e, groupBy, objectHasKey } from "@util";
import { ConditionPF2e, LorePF2e } from "@item";
import { AncestryBackgroundClassManager } from "@item/abc/manager";
import { CharacterProficiency, CharacterStrike, MartialProficiencies } from "./data";
import { BaseWeaponType, WeaponGroup, WEAPON_CATEGORIES } from "@item/weapon/data";
import { CraftingFormula, craftItem, craftSpellConsumable } from "./crafting";
import { PhysicalItemType } from "@item/physical/data";
import { craft } from "@system/actions/crafting/craft";
import { CheckDC } from "@system/degree-of-success";
import { CharacterSheetData, CraftingEntriesSheetData } from "./data/sheet";
import { isSpellConsumable } from "@item/consumable/spell-consumables";
import { LocalizePF2e } from "@system/localize";
import { restForTheNight } from "@scripts/macros/rest-for-the-night";
import { PCSheetTabManager } from "./tab-manager";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types";

export class CharacterSheetPF2e extends CreatureSheetPF2e<CharacterPF2e> {
    // A cache of this PC's known formulas, for use by sheet callbacks
    private knownFormulas!: Map<string, CraftingFormula>;

    static override get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["default", "sheet", "actor", "character"],
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
        const sheetData = (await super.getData(options)) as CharacterSheetData;

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

            proficiency.label = game.i18n.localize(label);
            proficiency.value = ProficiencyModifier.fromLevelAndRank(
                sheetData.data.details.level.value,
                proficiency.rank || 0
            ).modifier;
        }

        // A(H)BCD
        sheetData.ancestry = this.actor.ancestry;
        sheetData.heritage = this.actor.heritage;
        sheetData.background = this.actor.background;
        sheetData.class = this.actor.class;
        sheetData.deity = this.actor.deity;

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
        sheetData.data.attributes.dying.icon = this.getDyingIcon();
        sheetData.dyingLabel = this.getDyingLabel();

        // Update wounded
        sheetData.data.attributes.wounded.max = sheetData.data.attributes.dying.max - 1;

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
        const flags = this.actor.data.flags.pf2e;
        const hasQuickAlchemy = !!this.actor.rollOptions.all["feature:quick-alchemy"];
        const useQuickAlchemy = hasQuickAlchemy && flags.quickAlchemy;

        sheetData.crafting = {
            noCost: flags.freeCrafting || useQuickAlchemy,
            hasQuickAlchemy,
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
        const combatProficiencies: MartialProficiencies = sheetData.data.martial;
        const weaponCategories: Set<string> = WEAPON_CATEGORIES;
        const isWeaponProficiency = (key: string): boolean => weaponCategories.has(key) || /\bweapon\b/.test(key);
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

    /** Organize and classify Items for Character sheets */
    protected prepareItems(sheetData: ActorSheetDataPF2e<CharacterPF2e>): void {
        const actorData = sheetData.actor;

        // Inventory
        interface InventorySheetData {
            label: string;
            items: PhysicalItemData[];
            investedItemCount?: number;
            investedMax?: number;
            overInvested?: boolean;
        }

        const inventory: Record<Exclude<PhysicalItemType, "book">, InventorySheetData> = {
            weapon: { label: game.i18n.localize("PF2E.InventoryWeaponsHeader"), items: [] },
            armor: { label: game.i18n.localize("PF2E.InventoryArmorHeader"), items: [] },
            equipment: { label: game.i18n.localize("PF2E.InventoryEquipmentHeader"), items: [], investedItemCount: 0 },
            consumable: { label: game.i18n.localize("PF2E.InventoryConsumablesHeader"), items: [] },
            treasure: { label: game.i18n.localize("PF2E.InventoryTreasureHeader"), items: [] },
            backpack: { label: game.i18n.localize("PF2E.InventoryBackpackHeader"), items: [] },
        };

        // Actions
        const actions: Record<string, { label: string; actions: any[] }> = {
            action: { label: game.i18n.localize("PF2E.ActionsActionsHeader"), actions: [] },
            reaction: { label: game.i18n.localize("PF2E.ActionsReactionsHeader"), actions: [] },
            free: { label: game.i18n.localize("PF2E.ActionsFreeActionsHeader"), actions: [] },
        };

        const readonlyEquipment: unknown[] = [];

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
        sheetData.hasRealContainers = this.actor.itemTypes.backpack.some((c) => c.data.data.stowing);

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
                    itemData.showEdit && physicalData.type === "treasure" && physicalData.data.stackGroup !== "coins";
                if (physicalData.isInvested) {
                    investedCount += 1;
                }

                // Inventory
                if (Object.keys(inventory).includes(itemData.type)) {
                    itemData.data.quantity = physicalData.data.quantity || 0;
                    itemData.data.weight.value = physicalData.data.weight.value || 0;
                    const bulkItem = bulkItemsById.get(physicalData._id);
                    const [approximatedBulk] = calculateBulk({
                        items: bulkItem === undefined ? [] : [bulkItem],
                        bulkConfig: bulkConfig,
                        actorSize: this.actor.data.data.traits.size.value,
                    });
                    itemData.totalWeight = formatBulk(approximatedBulk);
                    itemData.hasCharges = physicalData.type === "consumable" && physicalData.data.charges.max > 0;
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
        }

        inventory.equipment.investedItemCount = investedCount; // Tracking invested items
        inventory.equipment.investedMax = investedMax;
        inventory.equipment.overInvested = investedMax < investedCount;

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

        actorData.featSlots = this.actor.featGroups;
        actorData.pfsBoons = this.actor.pfsBoons;
        actorData.deityBoonsCurses = this.actor.deityBoonsCurses;
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
        const craftingEntries: CraftingEntriesSheetData = {
            dailyCrafting: false,
            other: [],
            alchemical: {
                entries: [],
                totalReagentCost: 0,
                infusedReagents: this.actor.data.data.resources.crafting.infusedReagents,
            },
        };

        for (const entry of actorCraftingEntries) {
            if (entry.isAlchemical) {
                craftingEntries.alchemical.entries.push(entry);
                craftingEntries.alchemical.totalReagentCost += entry.reagentCost || 0;
                craftingEntries.dailyCrafting = true;
            } else {
                craftingEntries.other.push(entry);
                if (entry.isDailyPrep) craftingEntries.dailyCrafting = true;
            }
        }

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
            const title = $(".sheet-navigation .active").attr("title");
            if (title) {
                $html.find(".navigation-title").text(title);
            }
        }

        $html.find(".sheet-navigation").on("mouseover", ".item,.manage-tabs", (event) => {
            const title = event.currentTarget.title;
            if (title) {
                $(event.currentTarget).parents(".sheet-navigation").find(".navigation-title").text(title);
            }
        });

        $html.find(".sheet-navigation").on("mouseout", ".item,.manage-tabs", (event) => {
            const parent = $(event.currentTarget).parents(".sheet-navigation");
            const title = parent.find(".item.active").attr("title");
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
            this.actor.setFlag("pf2e", "showUnreadyStrikes", !this.actor.data.flags.pf2e.showUnreadyStrikes);
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
            const meleeUsage = Boolean($button.attr("data-melee-usage"));
            const strike = this.getStrikeFromDOM($button[0]);
            strike?.[method]?.({ getFormula: true, meleeUsage }).then((formula) => {
                if (!formula) return;
                $button.attr({ title: formula });
                $button.tooltipster({
                    position: "bottom",
                    theme: "crb-hover",
                });
            });
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

        const auxiliaryActionSelector = 'button[data-action="auxiliary-action"]';
        $strikesList.find(auxiliaryActionSelector).on("click", (event) => {
            const auxiliaryActionIndex = $(event.currentTarget)
                .closest("[data-auxiliary-action-index]")
                .attr("data-auxiliary-action-index");

            const strike = this.getStrikeFromDOM(event.currentTarget);
            strike?.auxiliaryActions?.[Number(auxiliaryActionIndex)]?.execute();
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
            const weapon = this.actor.items.get(action.item?.id ?? "");
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
            .find("aside > .sidebar > .hitpoints-ac")
            .find(".dying")
            .tooltipster({ theme: "crb-hover" })
            .on("click contextmenu", (event) => {
                this.onClickDyingWounded(event);
            });

        // Roll recovery flat check when Dying
        $html
            .find("a[data-action=recovery-check]")
            .tooltipster({ theme: "crb-hover" })
            .filter(":not(.disabled)")
            .on("click", (event) => {
                this.actor.rollRecovery(event);
            });

        $html
            .find("a[data-action=rest]")
            .tooltipster({ theme: "crb-hover" })
            .on("click", (event) => {
                restForTheNight({ event, actors: this.actor });
            });

        $html.find("a[data-action=perception-check]").tooltipster({ theme: "crb-hover" });

        // Decrease effect value
        $html.find(".tab.effects .effects-list .decrement").on("click", async (event) => {
            const actor = this.actor;
            const target = $(event.currentTarget);
            const parent = target.parents(".item");
            const effect = actor.items.get(parent.attr("data-item-id") ?? "");
            if (effect instanceof ConditionPF2e) {
                await actor.decreaseCondition(effect);
            }
        });

        // Increase effect value
        $html.find(".tab.effects .effects-list .increment").on("click", async (event) => {
            type ConditionName = "dying" | "wounded" | "doomed";
            const actor = this.actor;
            const target = $(event.currentTarget);
            const parent = target.parents(".item");
            const effect = actor?.items.get(parent.attr("data-item-id") ?? "");
            if (effect instanceof ConditionPF2e) {
                if (["dying", "wounded", "doomed"].includes(effect.slug)) {
                    const condition = effect.slug as ConditionName;
                    this.actor.increaseCondition(condition, {
                        max: this.actor.data.data.attributes[condition].max,
                    });
                } else {
                    await actor.increaseCondition(effect);
                }
            }
        });

        const $craftingTab = $html.find(".tab.crafting");

        const $craftingOptions = $craftingTab.find(".crafting-options input:checkbox");
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

        $craftingTab.find("a[data-action=quick-add]").on("click", async (event) => {
            const { itemUuid } = event.currentTarget.dataset;
            const craftingFormulas = await this.actor.getCraftingFormulas();
            const formula = craftingFormulas.find((f) => f.uuid === itemUuid);
            if (!formula) return;

            const entries = (await this.actor.getCraftingEntries()).filter(
                (e) => !!e.selector && e.checkEntryRequirements(formula, { warn: false })
            );
            for (const entry of entries) {
                await entry.prepareFormula(formula);
            }

            if (entries.length === 0) {
                ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.NoEligibleEntry"));
            }
        });

        const $formulas = $craftingTab.find(".craftingEntry-list");

        $formulas.find("a[data-action=craft-item]").on("click", async (event) => {
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

            const difficultyClass: CheckDC = {
                value: formula.dc,
                visibility: "all",
                adjustments: this.actor.data.data.skills["cra"].adjustments,
                scope: "check",
            };

            craft({ difficultyClass, item: formula.item, quantity: itemQuantity, event, actors: this.actor });
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

        // Feat Browser shortcut links
        $html.find(".feat-browse").on("click", (event) => this.onClickBrowseFeatCompendia(event));
    }

    /** Contextually search the feats tab of the Compendium Browser */
    private async onClickBrowseFeatCompendia(event: JQuery.ClickEvent): Promise<void> {
        const maxLevel = Number($(event.currentTarget).attr("data-level")) || this.actor.level;
        const button: HTMLElement = event.currentTarget;
        const filter = button.dataset.filter?.split(",").filter((f) => !!f) ?? [];
        if (filter.includes("feattype-general")) filter.push("feattype-skill");

        await game.pf2e.compendiumBrowser.openTab("feat", filter, maxLevel);
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
            ui.notifications.warn(game.i18n.localize("PF2E.ErrorMessage.MinimumProfLevelSetByFeatures"));
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
        if (newValue !== getProperty(item.data, propertyKey)) {
            ui.notifications.warn(game.i18n.localize("PF2E.ErrorMessage.MinimumProfLevelSetByFeatures"));
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

        const group = this.actor.featGroups[featSlotType];
        if (!group) return false;

        return group.supported === "all" || group.supported.includes(featType);
    }

    /** Handle cycling of dying, wounded, or doomed */
    private onClickDyingWounded(event: JQuery.TriggeredEvent) {
        const wounded: number = this.object.data.data.attributes.wounded.value || 0;
        const woundedMax: number = this.object.data.data.attributes.wounded.max || 0;
        const dying: number = this.object.data.data.attributes.dying.value || 0;
        const dyingMax: number = this.object.data.data.attributes.dying.max || 0;

        if (event.type === "click") {
            const min = dying === 0 ? wounded + 1 : 0;
            this.actor.increaseCondition("dying", { min, max: dyingMax });
        } else if (event.type === "contextmenu") {
            if (dying > 0) {
                this.actor.decreaseCondition("dying");
                if (dying === 1) {
                    this.actor.increaseCondition("wounded", { max: woundedMax });
                }
            } else {
                this.actor.decreaseCondition("wounded");
            }
        }
    }

    private getNearestSlotId(event: ElementDragEvent): JQuery.PlainObject {
        const data = $(event.target).closest("[data-slot-id]").data();
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
        if (isSameActor) return super._onDropItem(event, data);

        const item = await ItemPF2e.fromDropData(data);
        if (!item) throw ErrorPF2e("Unable to create item from drop data!");
        const source = item.toObject();

        const { slotId, featType }: { slotId?: string; featType?: string } = this.getNearestSlotId(event);

        switch (source.type) {
            case "feat": {
                if (!(slotId && featType && this.isFeatValidInFeatSlot(slotId, featType, source))) {
                    return super._onDropItem(event, data);
                }

                source.data.location = slotId;
                const items = await Promise.all([
                    this.actor.createEmbeddedDocuments("Item", [source]),
                    this.actor.updateEmbeddedDocuments(
                        "Item",
                        this.actor.itemTypes.feat
                            .filter((i) => i.data.data.location === slotId)
                            .map((i) => ({ _id: i.id, "data.location": null }))
                    ),
                ]);

                return items.flat();
            }
            case "ancestry":
            case "background":
            case "class":
                return AncestryBackgroundClassManager.addABCItem(source, actor);
            default:
                return super._onDropItem(event, data);
        }
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
            const group = this.actor.featGroups[featType];
            const resorting = group && !group.slotted && itemData.data.location === featType;
            if (slotId && featType && !resorting) {
                if (this.isFeatValidInFeatSlot(slotId, featType, itemData)) {
                    const existing = this.actor.itemTypes.feat.filter((x) => x.data.data.location === slotId);
                    const itemUpdate = { _id: itemData._id, "data.location": slotId };
                    return this.actor.updateEmbeddedDocuments("Item", [
                        itemUpdate,
                        // If this is a slotted group, replace existing entries in that slot
                        ...(group.slotted ? existing.map((x) => ({ _id: x.id, "data.location": "" })) : []),
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
    private getDyingIcon() {
        const skull = (filled: boolean) => `
            <svg width="19" height="19" viewBox="0 0 22 22" class="${filled ? "filled" : ""}">
                <path class="outline" d="M 9.9960938 0.33789062 C 9.9830526 0.33777368 8.5561503 0.33023634 6.7929688 0.67773438 C 5.0217516 1.0270094 2.8523857 1.715275 1.3652344 3.328125 C -0.22286043 5.0504322 -0.13950155 7.4977526 0.20703125 9.4199219 C 0.53209731 11.22302 1.090538 12.500799 1.1660156 12.675781 C 1.1565656 12.867844 1.0907668 13.985623 1.2851562 15.074219 C 1.3969106 15.700041 1.902741 16.109214 2.3183594 16.292969 C 2.7339778 16.476716 3.1390189 16.539821 3.5214844 16.574219 C 3.7455712 16.594249 3.7530934 16.566106 3.9492188 16.566406 C 3.9499038 16.648966 3.9464687 16.641156 3.9492188 16.728516 C 3.9687237 17.348094 3.9030288 18.012379 4.4140625 18.736328 C 4.6852269 19.120466 4.9558115 19.183888 5.1972656 19.267578 C 5.438719 19.351268 5.6893906 19.408785 5.9570312 19.453125 C 6.4923123 19.541805 7.1046657 19.585371 7.7011719 19.615234 C 8.8941839 19.674954 10.017578 19.660156 10.017578 19.660156 C 10.045738 19.660609 11.120925 19.674274 12.298828 19.615234 C 12.895401 19.585374 13.513501 19.541804 14.048828 19.453125 C 14.316493 19.408785 14.561267 19.351268 14.802734 19.267578 C 15.044202 19.183888 15.314743 19.120511 15.585938 18.736328 C 16.096972 18.012383 16.039105 17.348094 16.058594 16.728516 C 16.062994 16.589487 16.051181 16.595671 16.050781 16.470703 C 16.291289 16.447643 16.324757 16.457896 16.619141 16.410156 C 16.997719 16.348546 17.391921 16.274689 17.769531 16.130859 C 18.147141 15.987029 18.657971 15.81113 18.847656 15.097656 L 18.863281 15.060547 L 18.863281 15.023438 C 19.064881 13.894405 18.875304 12.900042 18.833984 12.652344 C 18.915724 12.462397 19.46994 11.211741 19.792969 9.4199219 C 20.139493 7.4981746 20.222869 5.0504288 18.634766 3.328125 C 17.147603 1.715287 14.986186 1.0270354 13.214844 0.67773438 C 11.451536 0.33002037 10.024777 0.33777363 10.011719 0.33789062 L 9.9960938 0.33789062 z M 9.9960938 2.1835938 L 10.003906 2.1835938 L 10.011719 2.1835938 C 10.011719 2.1835938 11.276128 2.1692548 12.853516 2.4804688 C 14.430904 2.7915276 16.246588 3.4519565 17.283203 4.5761719 C 18.218942 5.5909595 18.286661 7.4189525 17.984375 9.0957031 C 17.68209 10.772454 17.083984 12.144531 17.083984 12.144531 L 16.972656 12.394531 L 17.017578 12.660156 C 17.017578 12.660156 17.095765 13.682412 17.046875 14.417969 C 16.869308 14.479019 16.608268 14.549511 16.324219 14.595703 C 15.70422 14.696592 15.076172 14.728516 15.076172 14.728516 L 14.130859 14.765625 L 14.197266 15.710938 C 14.197266 15.710938 14.228851 16.161107 14.212891 16.669922 C 14.198751 17.118933 14.072937 17.520179 14.09375 17.556641 C 14.00276 17.582341 13.904413 17.610519 13.746094 17.636719 C 13.335548 17.704719 12.768887 17.74941 12.210938 17.777344 C 11.095033 17.833214 10.017578 17.814453 10.017578 17.814453 L 10.003906 17.814453 L 9.9882812 17.814453 C 9.9882812 17.814453 8.9048231 17.833284 7.7890625 17.777344 C 7.2311646 17.749374 6.6643949 17.704724 6.2539062 17.636719 C 6.0956098 17.610639 5.9972317 17.582121 5.90625 17.556641 C 5.927078 17.519971 5.8012316 17.118933 5.7871094 16.669922 C 5.7711194 16.161107 5.8027344 15.710935 5.8027344 15.710938 L 5.8847656 14.617188 L 4.7910156 14.728516 C 4.7910156 14.728516 4.2280313 14.784398 3.6914062 14.736328 C 3.4358453 14.713267 3.2075338 14.654925 3.09375 14.609375 C 2.9796471 13.78845 2.9980469 12.556641 2.9980469 12.556641 L 3.0039062 12.34375 L 2.9238281 12.144531 C 2.9238281 12.144531 2.3257253 10.772454 2.0234375 9.0957031 C 1.7211508 7.4189525 1.7810898 5.5909595 2.7167969 4.5761719 C 3.7534503 3.4518995 5.5692423 2.7915088 7.1464844 2.4804688 C 8.7237265 2.1694102 9.9960938 2.1835935 9.9960938 2.1835938 z M 13.078125 6.9335938 C 12.548629 6.9462947 11.96986 6.9987344 11.5 7.1269531 C 10.560281 7.3834018 10.905871 9.4887784 11.080078 9.8183594 C 11.254284 10.147948 12.238011 11.103141 12.601562 11.150391 C 12.965117 11.197631 15.192709 10.477312 15.224609 9.2636719 C 15.267039 7.649666 14.361328 6.9824219 14.361328 6.9824219 C 14.089031 6.9487419 13.607622 6.9207419 13.078125 6.9335938 z M 7.2128906 7.0097656 C 6.6833942 6.9971026 6.2019822 7.0229986 5.9296875 7.0566406 C 5.9296875 7.0566406 5.0259284 7.7238847 5.0683594 9.3378906 C 5.1002648 10.55153 7.3259009 11.271859 7.6894531 11.224609 C 8.0530057 11.177411 9.0367309 10.22415 9.2109375 9.8945312 C 9.3851437 9.5649541 9.7307336 7.4595624 8.7910156 7.203125 C 8.3211568 7.0749063 7.7423866 7.0222394 7.2128906 7.0097656 z M 10.203125 11.380859 C 10.203125 11.380859 8.5687957 14.44658 8.9960938 14.572266 C 9.423392 14.697922 10.203125 14.699219 10.203125 14.699219 C 10.203125 14.699219 10.982858 14.697952 11.410156 14.572266 C 11.837455 14.446595 10.203125 11.380859 10.203125 11.380859 z"/>
                <path class="fill" d="M 9.9960938 0.33789062 C 9.9830526 0.33777367 8.5561503 0.33023635 6.7929688 0.67773438 C 5.0217516 1.0270094 2.8523857 1.715275 1.3652344 3.328125 C -0.2228604 5.0504322 -0.13950155 7.4977526 0.20703125 9.4199219 C 0.53209731 11.22302 1.090538 12.500799 1.1660156 12.675781 C 1.1565656 12.867844 1.0907667 13.985623 1.2851562 15.074219 C 1.3969106 15.700041 1.902741 16.109214 2.3183594 16.292969 C 2.7339778 16.476716 3.1390189 16.539821 3.5214844 16.574219 C 3.7455712 16.594249 3.7530935 16.566106 3.9492188 16.566406 C 3.9499039 16.648966 3.9464688 16.641156 3.9492188 16.728516 C 3.9687238 17.348094 3.9030288 18.012379 4.4140625 18.736328 C 4.6852269 19.120466 4.9558115 19.183888 5.1972656 19.267578 C 5.438719 19.351268 5.6893906 19.408785 5.9570312 19.453125 C 6.4923123 19.541805 7.1046657 19.585371 7.7011719 19.615234 C 8.8941839 19.674954 10.017578 19.660156 10.017578 19.660156 C 10.045738 19.660609 11.120925 19.674274 12.298828 19.615234 C 12.895401 19.585374 13.513501 19.541804 14.048828 19.453125 C 14.316493 19.408785 14.561267 19.351268 14.802734 19.267578 C 15.044202 19.183888 15.314744 19.120511 15.585938 18.736328 C 16.096972 18.012383 16.039105 17.348094 16.058594 16.728516 C 16.062994 16.589487 16.051181 16.595671 16.050781 16.470703 C 16.291289 16.447643 16.324757 16.457896 16.619141 16.410156 C 16.997719 16.348546 17.391921 16.274689 17.769531 16.130859 C 18.147141 15.987029 18.657971 15.81113 18.847656 15.097656 L 18.863281 15.060547 L 18.863281 15.023438 C 19.064881 13.894405 18.875304 12.900042 18.833984 12.652344 C 18.915724 12.462397 19.46994 11.211741 19.792969 9.4199219 C 20.139493 7.4981746 20.222869 5.0504288 18.634766 3.328125 C 17.147603 1.715287 14.986186 1.0270354 13.214844 0.67773438 C 11.451536 0.33002037 10.024777 0.33777363 10.011719 0.33789062 L 9.9960938 0.33789062 z M 13.078125 6.9335938 C 13.607622 6.9207418 14.089031 6.9487419 14.361328 6.9824219 C 14.361328 6.9824219 15.267043 7.649666 15.224609 9.2636719 C 15.192709 10.477312 12.965116 11.197634 12.601562 11.150391 C 12.23801 11.103141 11.254284 10.147948 11.080078 9.8183594 C 10.905871 9.4887784 10.560281 7.3834018 11.5 7.1269531 C 11.96986 6.9987344 12.548629 6.9462947 13.078125 6.9335938 z M 7.2128906 7.0097656 C 7.7423866 7.0222396 8.3211568 7.0749063 8.7910156 7.203125 C 9.7307336 7.4595624 9.3851437 9.5649539 9.2109375 9.8945312 C 9.0367309 10.22415 8.0530057 11.177411 7.6894531 11.224609 C 7.3259009 11.271859 5.1002648 10.55153 5.0683594 9.3378906 C 5.0259284 7.7238847 5.9296875 7.0566406 5.9296875 7.0566406 C 6.2019822 7.0229986 6.6833942 6.9971026 7.2128906 7.0097656 z M 10.203125 11.380859 C 10.203125 11.380859 11.837455 14.446595 11.410156 14.572266 C 10.982858 14.697952 10.203125 14.699219 10.203125 14.699219 C 10.203125 14.699219 9.4233921 14.697922 8.9960938 14.572266 C 8.5687957 14.44658 10.203125 11.380859 10.203125 11.380859 z "/>
            </svg>`;
        const circle = (filled: boolean) => `
            <svg width="19" height="19" viewBox="0 0 22 22" class="${filled ? "filled" : ""}">
                <path class="outline" d="M 10,0.00195313 C 4.4934621,0.00195313 0,4.4954232 0,10.001953 0,15.508493 4.4934621,20 10,20 15.506538,20 20,15.508493 20,10.001953 20,4.4954232 15.506538,0.00195313 10,0.00195313 Z m 0,1.89062497 c 4.481692,0 8.107422,3.6279481 8.107422,8.1093749 0,4.481445 -3.625985,8.107422 -8.107422,8.107422 -4.4814375,0 -8.1074219,-3.625977 -8.1074219,-8.107422 0,-4.4814268 3.6257291,-8.1093749 8.1074219,-8.1093749 z"/>
                <path class="fill" d="M 10,0.00169 C 4.4934621,0.00169 0,4.49515 0,10.00168 0,15.50822 4.4934621,20 10,20 15.506538,20 20,15.50822 20,10.00168 20,4.49515 15.506538,0.00169 10,0.00169 Z"/>
            </svg>`;
        const woundIcon = (filled: boolean) => `
            <svg width="19" height="19" viewBox="0 0 22 22" class="${filled ? "filled" : ""}">
                <path class="outline" d="M 10 0.001953125 C 4.4934621 0.001953125 0 4.4954232 0 10.001953 C 0 15.508493 4.4934621 20 10 20 C 15.506538 20 20 15.508493 20 10.001953 C 20 4.4954232 15.506538 0.001953125 10 0.001953125 z M 10 1.8925781 C 14.481692 1.8925781 18.107422 5.5205262 18.107422 10.001953 C 18.107422 14.483398 14.481437 18.109375 10 18.109375 C 5.5185625 18.109375 1.8925781 14.483398 1.8925781 10.001953 C 1.8925781 5.5205262 5.5183072 1.8925781 10 1.8925781 z M 7.4394531 5.5839844 L 5.5839844 7.4394531 L 8.1445312 10 L 5.5839844 12.560547 L 7.4394531 14.416016 L 10 11.855469 L 12.560547 14.416016 L 14.416016 12.560547 L 11.855469 10 L 14.416016 7.4394531 L 12.560547 5.5839844 L 10 8.1445312 L 7.4394531 5.5839844 z "/>
                <path class="fill" d="M 10,0.00195298 C 4.493462,0.00195298 0,4.495423 0,10.001953 0,15.508493 4.493462,20 10,20 15.506538,20 20,15.508493 20,10.001953 20,4.495423 15.506538,0.00195298 10,0.00195298 Z M 7.439453,5.5839843 10,8.1445311 12.560547,5.5839843 14.416016,7.439453 11.855469,9.9999999 14.416016,12.560547 12.560547,14.416016 10,11.855469 7.439453,14.416016 5.583985,12.560547 8.144531,9.9999999 5.583985,7.439453 Z"/>
            </svg>`;

        const maxDying = this.object.data.data.attributes.dying.max || 4;
        const wounded = this.object.data.data.attributes.wounded.value || 0;
        const dying = this.object.data.data.attributes.dying.value || 0;
        const doomed = this.object.data.data.attributes.doomed.value || 0;

        if (dying >= maxDying - doomed) {
            return [...Array(maxDying).keys()].map(() => skull(true)).join("");
        }

        const ret = [];
        while (ret.length < wounded && ret.length < maxDying - 1 - doomed) {
            ret.push(woundIcon);
        }

        while (ret.length < maxDying - 1 - doomed) {
            ret.push(circle);
        }

        ret.push(skull);

        while (ret.length < maxDying) {
            ret.push(skull);
        }

        return ret.map((v: (filled: boolean) => string, i) => v(i < dying)).join("");
    }

    private getDyingLabel() {
        const wounded = this.object.data.data.attributes.wounded.value || 0;
        const dying = this.object.data.data.attributes.dying.value || 0;

        if (dying === 0 && wounded > 0) {
            return `${game.i18n.format("PF2E.condition.wounded.name")} ${wounded}`;
        }
        return `${game.i18n.format("PF2E.condition.dying.name")} ${dying}`;
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

export interface CharacterSheetPF2e extends CreatureSheetPF2e<CharacterPF2e> {
    getStrikeFromDOM(target: HTMLElement): CharacterStrike | null;
}
