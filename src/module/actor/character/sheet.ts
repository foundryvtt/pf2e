import { SkillAbbreviation } from "@actor/creature/data.ts";
import { CreatureSheetData } from "@actor/creature/index.ts";
import { MODIFIER_TYPES, createProficiencyModifier } from "@actor/modifiers.ts";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types.ts";
import { SaveType } from "@actor/types.ts";
import { AncestryPF2e, BackgroundPF2e, ClassPF2e, DeityPF2e, FeatPF2e, HeritagePF2e, ItemPF2e, LorePF2e } from "@item";
import { isSpellConsumable } from "@item/consumable/spell-consumables.ts";
import { ActionCost, Frequency } from "@item/data/base.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { MagicTradition } from "@item/spell/types.ts";
import { SpellcastingSheetData } from "@item/spellcasting-entry/types.ts";
import { toggleWeaponTrait } from "@item/weapon/helpers.ts";
import { BaseWeaponType, WeaponGroup } from "@item/weapon/types.ts";
import { WEAPON_CATEGORIES } from "@item/weapon/values.ts";
import { DropCanvasItemDataPF2e } from "@module/canvas/drop-canvas-data.ts";
import { PROFICIENCY_RANKS } from "@module/data.ts";
import { ActorPF2e } from "@module/documents.ts";
import { MigrationList, MigrationRunner } from "@module/migration/index.ts";
import { SheetOptions, createSheetTags } from "@module/sheet/helpers.ts";
import { craft } from "@system/action-macros/crafting/craft.ts";
import { CheckDC } from "@system/degree-of-success.ts";
import {
    ErrorPF2e,
    fontAwesomeIcon,
    getActionIcon,
    htmlClosest,
    htmlQuery,
    htmlQueryAll,
    isObject,
    objectHasKey,
    setHasElement,
} from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import * as R from "remeda";
import { CreatureSheetPF2e } from "../creature/sheet.ts";
import { AbilityBuilderPopup } from "../sheet/popups/ability-builder.ts";
import { ManageAttackProficiencies } from "../sheet/popups/manage-attack-proficiencies.ts";
import { AutomaticBonusProgression } from "./automatic-bonus-progression.ts";
import { CharacterConfig } from "./config.ts";
import { PreparedFormulaData } from "./crafting/entry.ts";
import {
    CraftingEntry,
    CraftingFormula,
    CraftingFormulaData,
    craftItem,
    craftSpellConsumable,
} from "./crafting/index.ts";
import {
    CharacterProficiency,
    CharacterSaveData,
    CharacterSkillData,
    CharacterStrike,
    CharacterSystemData,
    ClassDCData,
    MartialProficiencies,
} from "./data.ts";
import { CharacterPF2e } from "./document.ts";
import { FeatGroup } from "./feats.ts";
import { PCSheetTabManager } from "./tab-manager.ts";
import { CHARACTER_SHEET_TABS } from "./values.ts";

class CharacterSheetPF2e<TActor extends CharacterPF2e> extends CreatureSheetPF2e<TActor> {
    protected readonly actorConfigClass = CharacterConfig;

    /** A cache of this PC's known formulas, for use by sheet callbacks */
    private knownFormulas: Record<string, CraftingFormula> = {};

    /** Non-persisted tweaks to formula data */
    private formulaQuantities: Record<string, number> = {};

    static override get defaultOptions(): ActorSheetOptions {
        const options = super.defaultOptions;
        options.classes = [...options.classes, "character"];
        options.width = 750;
        options.height = 800;
        options.scrollY.push(".tab.active .tab-content");
        options.tabs = [
            { navSelector: ".sheet-navigation", contentSelector: ".sheet-content", initial: "character" },
            { navSelector: ".actions-nav", contentSelector: ".actions-panels", initial: "encounter" },
        ];
        return options;
    }

    override get template(): string {
        const template = this.actor.limited && !game.user.isGM ? "limited" : "sheet";
        return `systems/pf2e/templates/actors/character/${template}.hbs`;
    }

    override async getData(options?: ActorSheetOptions): Promise<CharacterSheetData<TActor>> {
        const sheetData = (await super.getData(options)) as CharacterSheetData<TActor>;

        // Martial Proficiencies
        const proficiencies = Object.entries(sheetData.data.martial);
        for (const [key, proficiency] of proficiencies) {
            // Let's not clutter the list
            if (["light-barding", "heavy-barding"].includes(key) && proficiency.rank === 0) {
                delete sheetData.data.martial[key];
                continue;
            }

            const groupMatch = /^weapon-group-([-\w]+)$/.exec(key);
            const baseWeaponMatch = /^weapon-base-([-\w]+)$/.exec(key);
            const label = ((): string => {
                if (objectHasKey(CONFIG.PF2E.armorCategories, key)) {
                    return CONFIG.PF2E.armorCategories[key];
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
                    return CONFIG.PF2E.baseWeaponTypes[baseWeapon];
                }
                return proficiency.label ?? key;
            })();

            proficiency.label = game.i18n.localize(label);
            const rank = proficiency.rank ?? 0;
            proficiency.value = createProficiencyModifier({ actor: this.actor, rank, domains: [] }).modifier;
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

        // Class DCs
        const allClassDCs = Object.values(sheetData.data.proficiencies.classDCs);
        const classDCs = allClassDCs
            .filter((cdc) => cdc.rank > 0 || allClassDCs.length > 1)
            .map(
                (classDC): ClassDCSheetData => ({
                    ...classDC,
                    icon: this.getProficiencyIcon(classDC.rank),
                    hover: CONFIG.PF2E.proficiencyLevels[classDC.rank],
                    rankSlug: PROFICIENCY_RANKS[classDC.rank],
                    rankName: game.i18n.format(`PF2E.ProficiencyLevel${classDC.rank}`),
                })
            )
            .sort((a, b) => (a.primary ? -1 : b.primary ? 1 : a.slug.localeCompare(b.slug)));
        const primaryClassDC = sheetData.data.attributes.classDC?.slug ?? null;

        sheetData.classDCs = {
            dcs: classDCs,
            primary: primaryClassDC,
            perDCDetails: classDCs.length > 1 || !primaryClassDC,
        };

        // Spell Details
        sheetData.magicTraditions = CONFIG.PF2E.magicTraditions;
        sheetData.preparationType = CONFIG.PF2E.preparationType;

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
        for (const save of Object.values(sheetData.data.saves)) {
            save.rankName = game.i18n.format(`PF2E.ProficiencyLevel${save.rank}`);
        }

        // limiting the amount of characters for the save labels
        for (const save of Object.values(sheetData.data.saves)) {
            save.short = game.i18n.format(`PF2E.Saves${save.label}Short`);
        }

        // Is the character's key ability score overridden by an Active Effect?
        sheetData.data.details.keyability.singleOption = this.actor.class?.system.keyAbility.value.length === 1;

        // Is the stamina variant rule enabled?
        sheetData.hasStamina = game.settings.get("pf2e", "staminaVariant") > 0;

        sheetData.spellcastingEntries = await this.prepareSpellcasting();
        sheetData.actions = this.#prepareActions();
        sheetData.feats = [...this.actor.feats, this.actor.feats.unorganized];

        const craftingFormulas = await this.actor.getCraftingFormulas();
        const formulasByLevel = R.groupBy(craftingFormulas, (f) => f.level);
        const flags = this.actor.flags.pf2e;
        const hasQuickAlchemy = !!(
            this.actor.rollOptions.all["feature:quick-alchemy"] || this.actor.rollOptions.all["feat:quick-alchemy"]
        );

        sheetData.crafting = {
            noCost: flags.freeCrafting,
            hasQuickAlchemy,
            knownFormulas: formulasByLevel,
            entries: await this.#prepareCraftingEntries(craftingFormulas),
        };

        this.knownFormulas = Object.values(formulasByLevel)
            .flat()
            .reduce((result: Record<string, CraftingFormula>, entry) => {
                entry.batchSize = this.formulaQuantities[entry.uuid] ?? entry.batchSize;
                result[entry.uuid] = entry;
                return result;
            }, {});

        sheetData.abpEnabled = AutomaticBonusProgression.isEnabled(this.actor);

        // Sort attack/defense proficiencies
        const combatProficiencies: MartialProficiencies = sheetData.data.martial;

        const isWeaponProficiency = (key: string): boolean =>
            setHasElement(WEAPON_CATEGORIES, key) || /\bweapon\b/.test(key);
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

        // Sort skills by localized label
        sheetData.data.skills = Object.fromEntries(
            Object.entries(sheetData.data.skills).sort(([_keyA, skillA], [_keyB, skillB]) =>
                game.i18n
                    .localize(skillA.label ?? "")
                    .localeCompare(game.i18n.localize(skillB.label ?? ""), game.i18n.lang)
            )
        ) as Record<SkillAbbreviation, CharacterSkillData>;

        // Show hints for some things being modified
        const baseData = this.actor.toObject();
        sheetData.adjustedBonusEncumbranceBulk =
            this.actor.attributes.bonusEncumbranceBulk !== baseData.system.attributes.bonusEncumbranceBulk;
        sheetData.adjustedBonusLimitBulk =
            this.actor.attributes.bonusLimitBulk !== baseData.system.attributes.bonusLimitBulk;

        sheetData.tabVisibility = deepClone(this.actor.flags.pf2e.sheetTabs);

        // Enrich content
        const rollData = this.actor.getRollData();
        const { biography } = this.actor.system.details;
        sheetData.enrichedContent.appearance = await TextEditor.enrichHTML(biography.appearance, {
            rollData,
            async: true,
        });
        sheetData.enrichedContent.backstory = await TextEditor.enrichHTML(biography.backstory, {
            rollData,
            async: true,
        });
        sheetData.enrichedContent.campaignNotes = await TextEditor.enrichHTML(biography.campaignNotes, {
            rollData,
            async: true,
        });
        sheetData.enrichedContent.allies = await TextEditor.enrichHTML(biography.allies, {
            rollData,
            async: true,
        });
        sheetData.enrichedContent.enemies = await TextEditor.enrichHTML(biography.enemies, {
            rollData,
            async: true,
        });
        sheetData.enrichedContent.organaizations = await TextEditor.enrichHTML(biography.organaizations, {
            rollData,
            async: true,
        });

        // Return data for rendering
        return sheetData;
    }

    /** Organize and classify Items for Character sheets */
    override async prepareItems(sheetData: ActorSheetDataPF2e<CharacterPF2e>): Promise<void> {
        const actorData = sheetData.actor;

        // Skills
        const lores: LorePF2e<TActor>[] = [];

        for (const itemData of sheetData.items) {
            // Lore Skills
            if (itemData.type === "lore") {
                itemData.system.icon = this.getProficiencyIcon((itemData.system.proficient || {}).value);
                itemData.system.hover = CONFIG.PF2E.proficiencyLevels[(itemData.system.proficient || {}).value];

                const rank = itemData.system.proficient?.value || 0;
                const proficiency = createProficiencyModifier({ actor: this.actor, rank, domains: [] }).modifier;
                const modifier = actorData.system.abilities.int.mod;
                const itemBonus = Number((itemData.system.item || {}).value || 0);
                itemData.system.itemBonus = itemBonus;
                itemData.system.value = modifier + proficiency + itemBonus;
                itemData.system.breakdown = `int modifier(${modifier}) + proficiency(${proficiency}) + item bonus(${itemBonus})`;

                lores.push(itemData);
            }
        }

        // Assign and return
        actorData.pfsBoons = this.actor.pfsBoons;
        actorData.deityBoonsCurses = this.actor.deityBoonsCurses;
        actorData.lores = lores;
    }

    /** Prepares all ability type items that create an action in the sheet */
    #prepareActions(): CharacterSheetData["actions"] {
        const actor = this.actor;
        const result: CharacterSheetData["actions"] = {
            combat: {
                action: { label: game.i18n.localize("PF2E.ActionsActionsHeader"), actions: [] },
                reaction: { label: game.i18n.localize("PF2E.ActionsReactionsHeader"), actions: [] },
                free: { label: game.i18n.localize("PF2E.ActionsFreeActionsHeader"), actions: [] },
            },
            exploration: { active: [], other: [] },
            downtime: [],
        };

        for (const item of actor.items) {
            if (!item.isOfType("action") && !(item.isOfType("feat") && item.actionCost)) {
                continue;
            }

            const traits = item.system.traits.value;
            const traitDescriptions = item.isOfType("feat") ? CONFIG.PF2E.featTraits : CONFIG.PF2E.actionTraits;
            const action: ActionSheetData = {
                ...R.pick(item, ["id", "name", "actionCost", "frequency"]),
                img: getActionIcon(item.actionCost),
                traits: createSheetTags(traitDescriptions, traits),
                feat: item.isOfType("feat") ? item : null,
            };

            if (traits.includes("exploration")) {
                const active = actor.system.exploration.includes(item.id);
                action.exploration = { active };
                (active ? result.exploration.active : result.exploration.other).push(action);
            } else if (traits.includes("downtime")) {
                result.downtime.push(action);
            } else {
                const category = result.combat[item.actionCost?.type ?? "free"];
                category?.actions.push(action);
            }
        }

        return result;
    }

    async #prepareCraftingEntries(formulas: CraftingFormula[]): Promise<CraftingEntriesSheetData> {
        const craftingEntries: CraftingEntriesSheetData = {
            dailyCrafting: false,
            other: [],
            alchemical: {
                entries: [],
                totalReagentCost: 0,
                infusedReagents: this.actor.system.resources.crafting.infusedReagents,
            },
        };

        for (const entry of await this.actor.getCraftingEntries(formulas)) {
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
        const html = $html[0];

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
        $html.find(".adjust-stat").on("click contextmenu", (event) => this.#onClickAdjustStat(event));
        for (const selectElem of htmlQueryAll<HTMLSelectElement>(html, "select.adjust-stat-select")) {
            selectElem.addEventListener("change", () => this.#onChangeAdjustStat(selectElem));
        }
        $html.find(".adjust-item-stat").on("click contextmenu", (event) => this.#onClickAdjustItemStat(event));
        $html.find(".adjust-item-stat-select").on("change", (event) => this.#onChangeAdjustItemStat(event));

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

        // Ancestry/Heritage/Class/Background/Deity context menu
        new ContextMenu(
            $html,
            ".detail-item-control",
            [
                {
                    name: "PF2E.EditItemTitle",
                    icon: fontAwesomeIcon("edit").outerHTML,
                    callback: (target) => {
                        const itemId = $(target).closest("[data-item-id]").attr("data-item-id");
                        const item = this.actor.items.get(itemId ?? "");
                        item?.sheet.render(true, { focus: true });
                    },
                },
                {
                    name: "PF2E.DeleteItemTitle",
                    icon: fontAwesomeIcon("trash").outerHTML,
                    callback: (target) => {
                        const row = htmlClosest(target[0], "[data-item-id]");
                        const itemId = row?.dataset.itemId;
                        const item = this.actor.items.get(itemId ?? "");

                        if (row && item) {
                            this.deleteItem(row, item);
                        } else {
                            throw ErrorPF2e("Item not found");
                        }
                    },
                },
            ],
            { eventName: "click" }
        );

        for (const link of htmlQueryAll(html, ".crb-tag-selector")) {
            link.addEventListener("click", () => this.openTagSelector(link, { allowCustom: false }));
        }

        // ACTIONS
        const actionsPanel = htmlQuery(html, ".tab.actions");
        if (!actionsPanel) throw ErrorPF2e("Unexpected failure finding actions panel");

        // Filter strikes
        htmlQuery(actionsPanel, ".toggle-unready-strikes")?.addEventListener("click", () => {
            this.actor.setFlag("pf2e", "showUnreadyStrikes", !this.actor.flags.pf2e.showUnreadyStrikes);
        });

        for (const strikeElem of htmlQueryAll(actionsPanel, ".strikes-list li")) {
            // Summary traits & tags
            for (const tagElem of htmlQueryAll(strikeElem, ".item-summary .item-properties.tags .tag")) {
                if (tagElem.dataset.description) {
                    $(tagElem).tooltipster({
                        content: game.i18n.localize(tagElem.dataset.description),
                        maxWidth: 400,
                        theme: "crb-hover",
                    });
                }
            }

            // Versatile-damage toggles
            const versatileToggleButtons = htmlQueryAll<HTMLButtonElement>(
                strikeElem,
                "button[data-action=toggle-versatile]"
            );
            for (const button of versatileToggleButtons) {
                button.addEventListener("click", () => {
                    const weapon = this.getStrikeFromDOM(button)?.item;
                    const baseType = weapon?.system.damage.damageType ?? null;
                    const selection =
                        button.classList.contains("selected") || button.value === baseType ? null : button.value;
                    const selectionIsValid = objectHasKey(CONFIG.PF2E.damageTypes, selection) || selection === null;
                    if (weapon && selectionIsValid) {
                        toggleWeaponTrait({ trait: "versatile", weapon, selection });
                    }
                });
            }

            // Auxiliary actions
            const auxActionButtons = htmlQueryAll<HTMLButtonElement>(
                strikeElem,
                "button[data-action=auxiliary-action]"
            );
            for (const button of auxActionButtons) {
                const modularSelect = htmlQuery(button, "select");
                button.addEventListener("click", () => {
                    const auxiliaryActionIndex = Number(button.dataset.auxiliaryActionIndex ?? NaN);
                    const strike = this.getStrikeFromDOM(button);
                    const selection = modularSelect?.value ?? null;
                    strike?.auxiliaryActions?.at(auxiliaryActionIndex)?.execute({ selection });
                });
                // Selecting a damage type isn't committed until the button is pressed
                for (const eventType of ["change", "click", "dragenter", "input"]) {
                    modularSelect?.addEventListener(eventType, (event) => {
                        event.stopImmediatePropagation();
                    });
                }
            }

            const meleeIcon = htmlQuery(strikeElem, ".melee-icon");
            if (meleeIcon) {
                $(meleeIcon).tooltipster({
                    content: game.i18n.localize("PF2E.Item.Weapon.MeleeUsage.Label"),
                    position: "left",
                    theme: "crb-hover",
                });
            }

            const ammoSelect = htmlQuery<HTMLSelectElement>(strikeElem, "select[data-action=link-ammo]");
            ammoSelect?.addEventListener("change", (event) => {
                event.stopPropagation();
                const action = this.getStrikeFromDOM(ammoSelect);
                const weapon = action?.item;
                const ammo = this.actor.items.get(ammoSelect.value);
                weapon?.update({ system: { selectedAmmoId: ammo?.id ?? null } });
            });
        }

        for (const activeToggle of htmlQueryAll(actionsPanel, "[data-action=toggle-exploration]")) {
            activeToggle.addEventListener("click", () => {
                const actionId = htmlClosest(activeToggle, "[data-item-id]")?.dataset.itemId;
                if (!actionId) return;

                const exploration = this.actor.system.exploration.filter((id) => this.actor.items.has(id));
                if (!exploration.findSplice((id) => id === actionId)) {
                    exploration.push(actionId);
                }

                this.actor.update({ "system.exploration": exploration });
            });
        }

        htmlQuery(actionsPanel, "[data-action=clear-exploration]")?.addEventListener("click", () => {
            this.actor.update({ "system.exploration": [] });
        });

        $html.find(".add-modifier .fas.fa-plus-circle").on("click", (event) => this.#onIncrementModifierValue(event));
        $html.find(".add-modifier .fas.fa-minus-circle").on("click", (event) => this.#onDecrementModifierValue(event));
        $html.find(".add-modifier .add-modifier-submit").on("click", (event) => this.#onAddCustomModifier(event));
        $html.find(".modifier-list .remove-modifier").on("click", (event) => this.#onRemoveCustomModifier(event));

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
            const tab = html.querySelector(".tab.proficiencies");
            const header = tab?.querySelector("h3.attacks-defenses");
            header
                ?.querySelector<HTMLElement>("button[data-action=add-attack-proficiency]")
                ?.addEventListener("click", (event) => {
                    ManageAttackProficiencies.add(this.actor, event);
                });
            const list = tab?.querySelector("ol.combat-list") ?? null;
            const links = htmlQueryAll(list, "li.custom a[data-action=remove-attack-proficiency]");
            for (const link of links) {
                link.addEventListener("click", (event) => {
                    ManageAttackProficiencies.remove(this.actor, event);
                });
            }
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

        $html
            .find("a[data-action=rest]")
            .tooltipster({ theme: "crb-hover" })
            .on("click", (event) => {
                game.pf2e.actions.restForTheNight({ event, actors: [this.actor] });
            });

        $html.find("a[data-action=perception-check]").tooltipster({ theme: "crb-hover" });

        $html.find("button[data-action=edit-ability-scores]").on("click", async () => {
            await new AbilityBuilderPopup(this.actor).render(true);
        });

        // SPELLCASTING
        const castingPanel = htmlQuery(html, ".tab.spellcasting");

        // Focus pool pips
        const focusPips = htmlQueryAll(castingPanel, ".focus-pool");
        if (focusPips.length > 0) {
            const listener = (event: Event) => {
                const change = event.type === "click" ? 1 : -1;
                const points = this.actor.system.resources.focus.value + change;
                this.actor.update({ "system.resources.focus.value": points });
            };

            for (const pips of focusPips) {
                pips.addEventListener("click", listener);
                pips.addEventListener("contextmenu", listener);
            }
        }

        // CRAFTING
        const craftingTab = htmlQuery(html, ".tab.crafting");

        for (const element of htmlQueryAll<HTMLLIElement>(craftingTab, "li.formula-item")) {
            const quantity = htmlQuery<HTMLInputElement>(element, "input[data-action=enter-quantity]");

            quantity?.addEventListener("change", async () => {
                const itemUUID = element.dataset.itemId ?? "";
                const formula = this.knownFormulas[itemUUID];
                const minBatchSize = formula.minimumBatchSize;
                const newValue = Number(quantity.value) || minBatchSize;
                if (newValue < 1) return;

                const entrySelector = htmlClosest(element, "li.crafting-entry")?.dataset.entrySelector;
                if (entrySelector) {
                    const craftingEntry = await this.actor.getCraftingEntry(entrySelector);
                    if (!craftingEntry) throw ErrorPF2e("Crafting entry not found");

                    const index = element.dataset.itemIndex;
                    await craftingEntry.setFormulaQuantity(Number(index), itemUUID ?? "", newValue);
                    return;
                }
                this.formulaQuantities[formula.uuid] = Math.max(newValue, minBatchSize);
                this.render();
            });
            for (const button of htmlQueryAll(
                element,
                "[data-action=increase-quantity], [data-action=decrease-quantity]"
            )) {
                button.addEventListener("click", async () => {
                    if (!quantity) return;
                    const itemUUID = element.dataset.itemId ?? "";
                    const formula = this.knownFormulas[itemUUID];
                    const minBatchSize = formula.minimumBatchSize;
                    const step = button.dataset.action === "increase-quantity" ? minBatchSize : -minBatchSize;
                    const newValue = (Number(quantity.value) || step) + step;
                    if (newValue < 1) return;

                    const entrySelector = htmlClosest(element, "li.crafting-entry")?.dataset.entrySelector;
                    if (entrySelector) {
                        const craftingEntry = await this.actor.getCraftingEntry(entrySelector);
                        if (!craftingEntry) throw ErrorPF2e("Crafting entry not found");

                        const index = element.dataset.itemIndex;
                        await craftingEntry.setFormulaQuantity(Number(index), itemUUID ?? "", newValue);
                        return;
                    }
                    this.formulaQuantities[formula.uuid] = Math.max(newValue, minBatchSize);
                    this.render();
                });
            }

            const craftButton = htmlQuery(element, "a[data-action=craft-item]");
            craftButton?.addEventListener("click", async (event) => {
                const { itemUuid, free, prepared } = craftButton.dataset;
                const itemQuantity = Number(quantity?.value) || 1;
                const formula = this.knownFormulas[itemUuid ?? ""];
                if (!formula) return;

                if (prepared === "true") {
                    const expendedState = element.dataset.expendedState;
                    if (expendedState === "true") {
                        ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.FormulaExpended"));
                        return;
                    }
                    const index = element.dataset.itemIndex;
                    const entrySelector = htmlClosest(craftButton, "li.crafting-entry")?.dataset.entrySelector;
                    if (!itemUuid || !index || !entrySelector) return;
                    const craftingEntry = await this.actor.getCraftingEntry(entrySelector);
                    if (!craftingEntry) throw ErrorPF2e("Crafting entry not found");
                    await craftingEntry.toggleFormulaExpended(Number(index), itemUuid);
                }

                if (this.actor.flags.pf2e.quickAlchemy) {
                    const reagentValue = this.actor.system.resources.crafting.infusedReagents.value - 1;
                    if (reagentValue < 0) {
                        ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.MissingReagents"));
                        return;
                    }
                    await this.actor.update(
                        { "system.resources.crafting.infusedReagents.value": reagentValue },
                        { render: false }
                    );

                    return craftItem(formula.item, 1, this.actor, true);
                }

                if (this.actor.flags.pf2e.freeCrafting) {
                    const itemId = itemUuid?.split(".").pop() ?? "";
                    if (isSpellConsumable(itemId) && formula.item.isOfType("consumable")) {
                        return craftSpellConsumable(formula.item, itemQuantity, this.actor);
                    }

                    return craftItem(formula.item, itemQuantity, this.actor);
                }

                const difficultyClass: CheckDC = {
                    value: formula.dc,
                    visible: true,
                    scope: "check",
                };

                craft({
                    difficultyClass,
                    item: formula.item,
                    quantity: itemQuantity,
                    actors: this.actor,
                    event: event as unknown as JQuery.TriggeredEvent,
                    free: free === "true",
                });
            });

            htmlQuery(element, "a.formula-delete")?.addEventListener("click", async () => {
                const itemUuid = element.dataset.itemId;
                if (!itemUuid) return;

                // Render confirmation modal dialog
                const name = this.knownFormulas[itemUuid]?.name;
                const content = `<p class="note">${game.i18n.format("PF2E.CraftingTab.RemoveFormulaDialogQuestion", {
                    name,
                })}</p>`;
                const title = game.i18n.localize("PF2E.CraftingTab.RemoveFormulaDialogTitle");
                if (await Dialog.confirm({ title, content })) {
                    const actorFormulas = this.actor.toObject().system.crafting.formulas ?? [];
                    actorFormulas.findSplice((f) => f.uuid === itemUuid);
                    this.actor.update({ "system.crafting.formulas": actorFormulas });
                }
            });

            htmlQuery(element, "a.formula-unprepare")?.addEventListener("click", async () => {
                const itemUuid = element.dataset.itemId;
                const index = element.dataset.itemIndex;
                const entrySelector = element.dataset.entrySelector;

                if (!itemUuid || !index || !entrySelector) return;

                const craftingEntry = await this.actor.getCraftingEntry(entrySelector);
                if (!craftingEntry) throw ErrorPF2e("Crafting entry not found");

                // Render confirmation modal dialog
                const name = this.knownFormulas[itemUuid]?.name;
                const content = `<p class="note">${game.i18n.format("PF2E.CraftingTab.UnprepareFormulaDialogQuestion", {
                    name,
                })}</p>`;
                const title = game.i18n.localize("PF2E.CraftingTab.UnprepareFormulaDialogTitle");
                if (await Dialog.confirm({ title, content })) {
                    await craftingEntry.unprepareFormula(Number(index), itemUuid);
                }
            });
        }

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
            const entrySelector = $target.closest("li.crafting-entry").attr("data-entry-selector");

            if (!itemUUID || !entrySelector) return;

            const craftingEntry = await this.actor.getCraftingEntry(entrySelector);
            if (!craftingEntry) throw ErrorPF2e("Crafting entry not found");
            await craftingEntry.toggleSignatureItem(itemUUID);
        });

        $formulas.find(".infused-reagents").on("change", (event) => {
            const change = Number($(event.target).val());
            const infusedReagents = this.actor.system.resources.crafting.infusedReagents;
            const value = Math.clamped(change, 0, infusedReagents?.max ?? 0);
            this.actor.update({ "system.resources.crafting.infusedReagents.value": value });
        });

        $formulas.find(".daily-crafting").on("click", async () => await this.actor.performDailyCrafting());

        PCSheetTabManager.initialize(this.actor, $html.find<HTMLAnchorElement>("a[data-action=manage-tabs]")[0]);

        // Feat Browser shortcut links
        for (const link of html.querySelectorAll<HTMLElement>(".feat-browse").values()) {
            link.addEventListener("click", () => this.#onClickBrowseFeats(link));
        }
    }

    /** Contextually search the feats tab of the Compendium Browser */
    async #onClickBrowseFeats(element: HTMLElement): Promise<void> {
        const maxLevel = Number(element.dataset.level) || this.actor.level;
        const checkboxesFilterCodes = (element.dataset.filter ?? "")
            .split(",")
            .filter((s) => !!s)
            .map((s) => s.trim());

        const featTab = game.pf2e.compendiumBrowser.tabs.feat;
        const filter = await featTab.getFilterData();
        const level = filter.sliders.level;
        level.values.max = Math.min(maxLevel, level.values.upperLimit);
        level.isExpanded = level.values.max !== level.values.upperLimit;

        const { category } = filter.checkboxes;
        const { traits } = filter.multiselects;

        for (const filterCode of checkboxesFilterCodes) {
            const [filterType, value] = filterCode.split("-");
            if (!(filterType && value)) {
                throw ErrorPF2e(`Invalid filter value for opening the compendium browser: "${filterCode}"`);
            }
            if (filterType === "category") {
                if (value in category.options) {
                    category.isExpanded = true;
                    category.options[value].selected = true;
                    category.selected.push(value);
                }
            } else if (filterType === "traits") {
                const trait = traits.options.find((t) => t.value === value);
                if (trait) {
                    traits.selected.push(deepClone(trait));
                }
            } else if (filterType === "conjunction" && (value === "and" || value === "or")) {
                filter.multiselects.traits.conjunction = value;
            }
        }

        return featTab.open(filter);
    }

    /** Handle changing of proficiency-rank via dropdown */
    #onChangeAdjustStat(selectElem: HTMLSelectElement): void {
        const propertyKey = selectElem.dataset.property ?? "";
        const currentValue = getProperty(this.actor, propertyKey);
        const selectedValue = Number(selectElem.value);
        if (typeof currentValue !== "number" || Number.isNaN(selectedValue)) {
            throw ErrorPF2e("Actor property not found");
        }

        const newValue = Math.clamped(selectedValue, 0, 4);
        const clone = this.actor.clone({ [propertyKey]: newValue }, { keepId: true });
        if (newValue !== getProperty(clone, propertyKey)) {
            ui.notifications.warn("PF2E.ErrorMessage.MinimumProfLevelSetByFeatures", { localize: true });
            selectElem.value = currentValue.toString();
        }
    }

    /** Handle clicking of proficiency-rank adjustment buttons */
    async #onClickAdjustStat(event: JQuery.TriggeredEvent<HTMLElement>): Promise<void> {
        const $button = $(event.delegateTarget);
        const propertyKey = $button.attr("data-property") ?? "";
        const currentValue = getProperty(this.actor, propertyKey);

        if (typeof currentValue !== "number") throw ErrorPF2e("Actor property not found");

        const change = event.type === "click" ? 1 : -1;
        const max = propertyKey.includes("heroPoints") ? 3 : 4;
        const update = currentValue + change;
        const newValue = Math.clamped(update, 0, max);

        await this.actor.update({ [propertyKey]: newValue });
    }

    /** Handle changing of lore and spellcasting entry proficiency-rank via dropdown */
    async #onChangeAdjustItemStat(event: JQuery.TriggeredEvent<HTMLElement>): Promise<void> {
        const $select = $(event.delegateTarget);
        const propertyKey = $select.attr("data-item-property") ?? "";
        const selectedValue = Number($select.val());

        const itemId = $select.closest(".item").attr("data-item-id") ?? "";
        const item = this.actor.items.get(itemId);
        if (!item) throw ErrorPF2e("Item not found");

        // Retrieve and validate the updated value
        const newValue = ((): number | undefined => {
            if (item.isOfType("spellcastingEntry")) {
                const dispatch: Record<string, () => number> = {
                    "system.proficiency.value": () => Math.clamped(selectedValue, 0, 4),
                };
                return dispatch[propertyKey]?.();
            } else if (item.isOfType("lore")) {
                return Math.clamped(selectedValue, 0, 4);
            } else {
                throw ErrorPF2e("Item not recognized");
            }
        })();

        if (typeof newValue === "number") {
            await item.update({ [propertyKey]: newValue });
        }
        if (newValue !== getProperty(item, propertyKey)) {
            ui.notifications.warn(game.i18n.localize("PF2E.ErrorMessage.MinimumProfLevelSetByFeatures"));
        }
    }

    /** Handle clicking of lore and spellcasting entry adjustment buttons */
    async #onClickAdjustItemStat(event: JQuery.TriggeredEvent<HTMLElement>): Promise<void> {
        const $button = $(event.delegateTarget);
        const itemId = $button.closest(".item").attr("data-item-id") ?? "";
        const item = this.actor.items.get(itemId);
        if (!item) throw ErrorPF2e("Item not found");

        const propertyKey = $button.attr("data-item-property") ?? "";
        const change = event.type === "click" ? 1 : -1;

        // Retrieve and validate the updated value
        const newValue = ((): number | undefined => {
            if (item.isOfType("spellcastingEntry")) {
                const proficiencyRank = item.system.proficiency.value;
                const dispatch: Record<string, () => number> = {
                    "system.proficiency.value": () => Math.clamped(proficiencyRank + change, 0, 4),
                };
                return dispatch[propertyKey]?.();
            } else if (item.isOfType("lore")) {
                const currentRank = item.system.proficient.value;
                return Math.clamped(currentRank + change, 0, 4);
            } else {
                throw ErrorPF2e("Item not recognized");
            }
        })();

        if (typeof newValue === "number") {
            await item.update({ [propertyKey]: newValue });
        }
    }

    #onIncrementModifierValue(event: JQuery.ClickEvent): void {
        const parent = $(event.currentTarget).parents(".add-modifier");
        (parent.find(".add-modifier-value input[type=number]")[0] as HTMLInputElement).stepUp();
    }

    #onDecrementModifierValue(event: JQuery.ClickEvent): void {
        const parent = $(event.currentTarget).parents(".add-modifier");
        (parent.find(".add-modifier-value input[type=number]")[0] as HTMLInputElement).stepDown();
    }

    #onAddCustomModifier(event: JQuery.ClickEvent<HTMLElement, undefined, HTMLElement>): void {
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
        const modifierTypes: string[] = Array.from(MODIFIER_TYPES);
        if (!modifierTypes.includes(type)) {
            errors.push("Type is required.");
        }
        if (errors.length > 0) {
            ui.notifications.error(errors.join(" "));
        } else {
            this.actor.addCustomModifier(stat, name, modifier, type);
        }
    }

    #onRemoveCustomModifier(event: JQuery.ClickEvent): void {
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

    #getNearestFeatSlotId(event: ElementDragEvent) {
        const categoryId = event.target?.closest<HTMLElement>("[data-category-id]")?.dataset.categoryId;
        const slotId = event.target?.closest<HTMLElement>("[data-slot-id]")?.dataset.slotId;
        return typeof categoryId === "string" ? { slotId, categoryId } : null;
    }

    protected override async _onDropItem(
        event: ElementDragEvent,
        data: DropCanvasItemDataPF2e
    ): Promise<ItemPF2e<ActorPF2e | null>[]> {
        const item = await ItemPF2e.fromDropData(data);
        if (!item) throw ErrorPF2e("Unable to create item from drop data!");

        // If the actor is the same, call the parent method, which will eventually call the sort instead
        if (this.actor.uuid === item.parent?.uuid) {
            return super._onDropItem(event, data);
        }

        if (item.isOfType("feat")) {
            // Ensure feats from non-system compendiums are current before checking for appropriate feat slots
            const itemUUID = item.uuid;
            if (itemUUID.startsWith("Compendium") && !itemUUID.startsWith("Compendium.pf2e.")) {
                await MigrationRunner.ensureSchemaVersion(item, MigrationList.constructFromVersion(item.schemaVersion));
            }
            const featSlot = this.#getNearestFeatSlotId(event) ?? { categoryId: "" };
            return await this.actor.feats.insertFeat(item, featSlot);
        }

        return super._onDropItem(event, data);
    }

    protected override async _onDrop(event: ElementDragEvent): Promise<boolean | void> {
        const dataString = event.dataTransfer?.getData("text/plain");
        const dropData = ((): Record<string, unknown> | null => {
            try {
                return JSON.parse(dataString ?? "");
            } catch {
                return null;
            }
        })();
        if (!dropData) return;

        if (isObject<Record<string, unknown>>(dropData.pf2e) && dropData.pf2e.type === "CraftingFormula") {
            const dropEntrySelector = typeof dropData.entrySelector === "string" ? dropData.entrySelector : null;
            if (!dropEntrySelector) {
                // Prepare formula if dropped on a crafting entry.
                const containerEl = htmlClosest(event.target, ".item-container");
                if (containerEl?.dataset.containerType === "craftingEntry") {
                    const entrySelector = containerEl.dataset.entrySelector ?? "";
                    const craftingEntry = await this.actor.getCraftingEntry(entrySelector);
                    if (!craftingEntry) return;

                    const craftingFormulas = await this.actor.getCraftingFormulas();
                    const uuid = dropData.pf2e.itemUuid;
                    const formula = craftingFormulas.find((f) => f.uuid === uuid);

                    if (formula) craftingEntry.prepareFormula(formula);
                    return;
                }
            }
            const uuid = dropData.pf2e.itemUuid;
            if (typeof uuid === "string") {
                const formula = this.knownFormulas[uuid];
                // Sort existing formulas
                if (formula) {
                    const targetUuid = htmlClosest(event.target, "li.formula-item")?.dataset.itemId ?? "";
                    return this.#sortFormulas(formula, targetUuid, dropEntrySelector);
                }
            }
        } else {
            return super._onDrop(event);
        }
    }

    async #sortFormulas(
        sourceFormula: CraftingFormula,
        targetUuid: string,
        entrySelector: string | null
    ): Promise<void> {
        if (!UUIDUtils.isItemUUID(targetUuid)) return;
        if (sourceFormula.uuid === targetUuid) return;

        const sourceLevel = sourceFormula.level;
        const targetLevel = this.knownFormulas[targetUuid].level;

        // Do not allow sorting with different formula level outside of a crafting entry
        if (!entrySelector && sourceLevel !== targetLevel) {
            return;
        }

        const performSort = async (
            formulas: (PreparedFormulaData | CraftingFormulaData)[],
            source: PreparedFormulaData | CraftingFormulaData,
            target: PreparedFormulaData | CraftingFormulaData,
            siblings: (PreparedFormulaData | CraftingFormulaData)[]
        ): Promise<void> => {
            const results = SortingHelpers.performIntegerSort(source, {
                target,
                siblings,
            });
            if (results.length) {
                for (const result of results) {
                    const formula = formulas.find((f) => f === result.target);
                    if (formula) {
                        formula.sort = result.update.sort;
                    }
                }
                if (entrySelector) {
                    const entry = await this.actor.getCraftingEntry(entrySelector);
                    await entry?.updateFormulas(formulas as PreparedFormulaData[]);
                } else {
                    await this.actor.update({ "system.crafting.formulas": formulas });
                }
            }
        };

        // Sort crafting entry formulas
        if (entrySelector) {
            const entry = await this.actor.getCraftingEntry(entrySelector);
            if (!entry) {
                throw ErrorPF2e(`Crafting entry "${entrySelector}" doesn't exist!`);
            }
            const formulas = deepClone(entry.preparedFormulaData);
            const source = formulas.find((f) => f.itemUUID === sourceFormula.uuid);
            const target = formulas.find((f) => f.itemUUID === targetUuid);
            if (source && target) {
                const siblings = formulas.filter((f) => f.itemUUID !== source.itemUUID);
                return performSort(formulas, source, target, siblings);
            }
        }
        // Sort other formulas
        const formulas = this.actor.toObject().system.crafting.formulas ?? [];
        const source = formulas.find((f) => f.uuid === sourceFormula.uuid);
        const target = formulas.find((f) => f.uuid === targetUuid);
        if (source && target) {
            const siblings = formulas.filter((f) => f.uuid !== source.uuid);
            return performSort(formulas, source, target, siblings);
        }
    }

    /** Handle a drop event for an existing Owned Item to sort that item */
    protected override async _onSortItem(
        event: ElementDragEvent,
        itemSource: ItemSourcePF2e
    ): Promise<ItemPF2e<TActor>[]> {
        const item = this.actor.items.get(itemSource._id);
        if (item?.isOfType("feat")) {
            const featSlot = this.#getNearestFeatSlotId(event);
            if (featSlot) {
                const group = this.actor.feats.get(featSlot.categoryId) ?? null;
                const resorting = item.group === group && !group?.slotted;
                if (group?.slotted && !featSlot.slotId) {
                    return [];
                } else if (!resorting) {
                    return this.actor.feats.insertFeat(item, featSlot);
                }
            }
        }

        return super._onSortItem(event, itemSource);
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

    /** Overriden to open sub-tabs if requested */
    protected override openTab(name: string): void {
        if (["encounter", "exploration", "downtime"].includes(name)) {
            super.openTab("actions");
            this._tabs[1].activate(name);
        } else {
            super.openTab(name);
        }
    }
}

interface CharacterSheetPF2e<TActor extends CharacterPF2e> extends CreatureSheetPF2e<TActor> {
    getStrikeFromDOM(target: HTMLElement): CharacterStrike | null;
}

type CharacterSheetOptions = ActorSheetOptions;

type CharacterSystemSheetData = CharacterSystemData & {
    attributes: {
        perception: {
            rankName: string;
        };
    };
    details: CharacterSystemData["details"] & {
        keyability: {
            value: keyof typeof CONFIG.PF2E.abilities;
            singleOption: boolean;
        };
    };
    resources: {
        heroPoints: {
            icon: string;
            hover: string;
        };
    };
    saves: Record<
        SaveType,
        CharacterSaveData & {
            rankName?: string;
            short?: string;
        }
    >;
};

export interface CraftingEntriesSheetData {
    dailyCrafting: boolean;
    other: CraftingEntry[];
    alchemical: {
        entries: CraftingEntry[];
        totalReagentCost: number;
        infusedReagents: {
            value: number;
            max: number;
        };
    };
}

interface CraftingSheetData {
    noCost: boolean;
    hasQuickAlchemy: boolean;
    knownFormulas: Record<number, CraftingFormula[]>;
    entries: CraftingEntriesSheetData;
}

type CharacterSheetTabVisibility = Record<(typeof CHARACTER_SHEET_TABS)[number], boolean>;

interface CharacterSheetData<TActor extends CharacterPF2e = CharacterPF2e> extends CreatureSheetData<TActor> {
    abpEnabled: boolean;
    ancestry: AncestryPF2e<CharacterPF2e> | null;
    heritage: HeritagePF2e<CharacterPF2e> | null;
    background: BackgroundPF2e<CharacterPF2e> | null;
    adjustedBonusEncumbranceBulk: boolean;
    adjustedBonusLimitBulk: boolean;
    class: ClassPF2e<CharacterPF2e> | null;
    classDCs: {
        dcs: ClassDCSheetData[];
        /** The slug of the character's primary class DC */
        primary: string | null;
        /** Show class label and individual modifier lists for each class DC */
        perDCDetails: boolean;
    };
    crafting: CraftingSheetData;
    data: CharacterSystemSheetData;
    deity: DeityPF2e<CharacterPF2e> | null;
    hasStamina: boolean;
    /** This actor has actual containers for stowing, rather than just containers serving as a UI convenience */
    hasRealContainers: boolean;
    magicTraditions: Record<MagicTradition, string>;
    options: CharacterSheetOptions;
    preparationType: Object;
    showPFSTab: boolean;
    spellcastingEntries: SpellcastingSheetData[];
    tabVisibility: CharacterSheetTabVisibility;
    actions: {
        combat: Record<"action" | "reaction" | "free", { label: string; actions: ActionSheetData[] }>;
        exploration: {
            active: ActionSheetData[];
            other: ActionSheetData[];
        };
        downtime: ActionSheetData[];
    };
    feats: FeatGroup[];
}

interface ActionSheetData {
    id: string;
    name: string;
    img: string;
    actionCost: ActionCost | null;
    frequency: Frequency | null;
    feat: FeatPF2e | null;
    traits: SheetOptions;
    exploration?: {
        active: boolean;
    };
}

interface ClassDCSheetData extends ClassDCData {
    icon: string;
    hover: string;
    rankSlug: string;
    rankName: string;
}

export { CharacterSheetPF2e, CharacterSheetTabVisibility };
