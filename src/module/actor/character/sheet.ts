import { SkillAbbreviation } from "@actor/creature/data";
import { createProficiencyModifier, MODIFIER_TYPE } from "@actor/modifiers";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types";
import { ActionItemPF2e, isSpellConsumable, ItemPF2e, WEAPON_CATEGORIES } from "@item";
import { ItemSourcePF2e, LoreData } from "@item/data";
import { BaseWeaponType, WeaponGroup } from "@item/weapon/types";
import { DropCanvasItemDataPF2e } from "@module/canvas/drop-canvas-data";
import { PROFICIENCY_RANKS } from "@module/data";
import { restForTheNight } from "@scripts/macros/rest-for-the-night";
import { craft } from "@system/action-macros/crafting/craft";
import { CheckDC } from "@system/degree-of-success";
import { LocalizePF2e } from "@system/localize";
import {
    ErrorPF2e,
    getActionIcon,
    groupBy,
    htmlQueryAll,
    isObject,
    objectHasKey,
    setHasElement,
    tupleHasValue,
} from "@util";
import { CharacterPF2e } from ".";
import { CreatureSheetPF2e } from "../creature/sheet";
import { AbilityBuilderPopup } from "../sheet/popups/ability-builder";
import { ManageAttackProficiencies } from "../sheet/popups/manage-attack-proficiencies";
import { CharacterConfig } from "./config";
import { CraftingFormula, craftItem, craftSpellConsumable } from "./crafting";
import { CharacterProficiency, CharacterSkillData, CharacterStrike, MartialProficiencies } from "./data";
import { CharacterSheetData, ClassDCSheetData, CraftingEntriesSheetData, FeatCategorySheetData } from "./data/sheet";
import { PCSheetTabManager } from "./tab-manager";

class CharacterSheetPF2e extends CreatureSheetPF2e<CharacterPF2e> {
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
        const classDCs = Object.values(sheetData.data.proficiencies.classDCs)
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
        sheetData.feats = this.prepareFeats();

        const formulasByLevel = await this.prepareCraftingFormulas();
        const flags = this.actor.flags.pf2e;
        const hasQuickAlchemy = !!(
            this.actor.rollOptions.all["feature:quick-alchemy"] || this.actor.rollOptions.all["feat:quick-alchemy"]
        );
        const useQuickAlchemy = hasQuickAlchemy && flags.quickAlchemy;

        sheetData.crafting = {
            noCost: flags.freeCrafting || useQuickAlchemy,
            hasQuickAlchemy,
            knownFormulas: formulasByLevel,
            entries: await this.prepareCraftingEntries(),
        };

        this.knownFormulas = Object.values(formulasByLevel)
            .flat()
            .reduce((result: Record<string, CraftingFormula>, entry) => {
                entry.batchSize = this.formulaQuantities[entry.uuid] ?? entry.batchSize;
                result[entry.uuid] = entry;
                return result;
            }, {});

        sheetData.abpEnabled = game.settings.get("pf2e", "automaticBonusVariant") !== "noABP";

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

        // Actions
        type AnnotatedAction = RawObject<ActionItemPF2e["data"]> & {
            encounter?: boolean;
            exploration?: boolean;
            downtime?: boolean;
        };
        const actions: Record<string, { label: string; actions: AnnotatedAction[] }> = {
            action: { label: game.i18n.localize("PF2E.ActionsActionsHeader"), actions: [] },
            reaction: { label: game.i18n.localize("PF2E.ActionsReactionsHeader"), actions: [] },
            free: { label: game.i18n.localize("PF2E.ActionsFreeActionsHeader"), actions: [] },
        };

        // Skills
        const lores: LoreData[] = [];

        for (const itemData of sheetData.items) {
            const item = this.actor.items.get(itemData._id, { strict: true });

            // Feats (non-passive feats may show action icons)
            if (item.isOfType("feat")) {
                const actionType = item.actionCost?.type;
                if (actionType) {
                    itemData.feat = true;
                    itemData.img = getActionIcon(item.actionCost);
                    actions[actionType].actions.push(itemData);
                }
            }

            // Lore Skills
            else if (itemData.type === "lore") {
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

            // Actions
            else if (item.isOfType("action")) {
                itemData.img = getActionIcon(item.actionCost);
                const actionType = item.actionCost?.type ?? "free";
                actions[actionType].actions.push(itemData);
            }
        }

        // assign mode to actions
        for (const action of Object.values(actions).flatMap((section) => section.actions)) {
            action.downtime = action.system.traits.value.includes("downtime");
            action.exploration = action.system.traits.value.includes("exploration");
            action.encounter = !(action.downtime || action.exploration);
        }

        // Assign and return
        actorData.pfsBoons = this.actor.pfsBoons;
        actorData.deityBoonsCurses = this.actor.deityBoonsCurses;
        actorData.actions = actions;
        actorData.lores = lores;
    }

    protected async prepareCraftingFormulas(): Promise<Record<number, CraftingFormula[]>> {
        const craftingFormulas = await this.actor.getCraftingFormulas();
        return Object.fromEntries(groupBy(craftingFormulas, (formula) => formula.level));
    }

    protected async prepareCraftingEntries(): Promise<CraftingEntriesSheetData> {
        const actorCraftingEntries = await this.actor.getCraftingEntries();
        const craftingEntries: CraftingEntriesSheetData = {
            dailyCrafting: false,
            other: [],
            alchemical: {
                entries: [],
                totalReagentCost: 0,
                infusedReagents: this.actor.system.resources.crafting.infusedReagents,
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

    private prepareFeats(): FeatCategorySheetData[] {
        const unorganized: FeatCategorySheetData = {
            id: "bonus",
            label: "PF2E.FeatBonusHeader",
            feats: this.actor.feats.unorganized,
        };
        return [...this.actor.feats, unorganized];
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
        $html.find(".adjust-stat-select").on("change", (event) => this.#onChangeAdjustStat(event));
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

        $html.find(".crb-tag-selector").on("click", (event) => this.onTraitSelector(event));

        // ACTIONS
        const $actions = $html.find(".tab.actions");

        // Filter strikes
        $actions.find(".toggle-unready-strikes").on("click", () => {
            this.actor.setFlag("pf2e", "showUnreadyStrikes", !this.actor.flags.pf2e.showUnreadyStrikes);
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
            const altUsage = tupleHasValue(["thrown", "melee"] as const, damageButton.dataset.altUsage)
                ? damageButton.dataset.altUsage
                : null;

            const strike = this.getStrikeFromDOM($button[0]);
            strike?.[method]?.({ getFormula: true, altUsage }).then((formula) => {
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

        const auxiliaryActionSelector = "button[data-action=auxiliary-action]";
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

        $strikesList.find("select[name=ammo-used]").on("change", (event) => {
            event.stopPropagation();

            const actionIndex = $(event.currentTarget).parents(".item").attr("data-action-index");
            const action = this.actor.system.actions[Number(actionIndex)];
            const weapon = this.actor.items.get(action.item?.id ?? "");
            const ammo = this.actor.items.get($(event.currentTarget).val() as string);

            if (weapon) weapon.update({ system: { selectedAmmoId: ammo?.id ?? null } });
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
                restForTheNight({ event, actors: this.actor });
            });

        $html.find("a[data-action=perception-check]").tooltipster({ theme: "crb-hover" });

        $html.find("button[data-action=edit-ability-scores]").on("click", async () => {
            await new AbilityBuilderPopup(this.actor).render(true);
        });

        // SPELLCASTING
        const $castingTab = $html.find(".tab.spellcasting");

        $castingTab.find(".focus-pool").on("click contextmenu", (event) => {
            const change = event.type === "click" ? 1 : -1;
            const points = (this.actor.system.resources.focus?.value ?? 0) + change;
            this.actor.update({ "system.resources.focus.value": points });
        });

        // CRAFTING
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
            const { itemUuid, free, prepared } = event.currentTarget.dataset;
            const itemQuantity =
                Number($(event.currentTarget).parent().siblings(".formula-quantity").children("input").val()) || 1;
            const formula = this.knownFormulas[itemUuid ?? ""];
            if (!formula) return;

            if (prepared === "true") {
                const expendedState = $(event.currentTarget).closest("li.formula-item").attr("data-expended-state");
                if (expendedState === "true") {
                    ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.FormulaExpended"));
                    return;
                }
                const index = $(event.currentTarget).closest("li.formula-item").attr("data-item-index");
                const entrySelector = $(event.currentTarget).closest("li.crafting-entry").attr("data-entry-selector");
                if (!itemUuid || !index || !entrySelector) return;
                const craftingEntry = await this.actor.getCraftingEntry(entrySelector);
                if (!craftingEntry) throw ErrorPF2e("Crafting entry not found");
                await craftingEntry.toggleFormulaExpended(Number(index), itemUuid);
            }

            if (this.actor.flags.pf2e.quickAlchemy) {
                const reagentValue = this.actor.system.resources.crafting.infusedReagents.value - itemQuantity;
                if (reagentValue < 0) {
                    ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.MissingReagents"));
                    return;
                }
                await this.actor.update({ "system.resources.crafting.infusedReagents.value": reagentValue });

                return craftItem(formula.item, itemQuantity, this.actor, true);
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
                event,
                actors: this.actor,
                free: free === "true",
            });
        });

        $formulas.find("[data-action=enter-quantity]").on("change", async (event) => {
            const $target = $(event.currentTarget);
            const itemUUID = $target.closest("li.formula-item").attr("data-item-id");
            const entrySelector = $target.closest("li.crafting-entry").attr("data-entry-selector");
            if (entrySelector) {
                const craftingEntry = await this.actor.getCraftingEntry(entrySelector);
                if (!craftingEntry) throw ErrorPF2e("Crafting entry not found");

                const index = $target.closest("li.formula-item").attr("data-item-index");
                await craftingEntry.setFormulaQuantity(Number(index), itemUUID ?? "", Number($target.val()));
                return;
            }

            const formula = this.knownFormulas[itemUUID ?? ""];
            if (!formula) throw ErrorPF2e("Formula not found");
            this.formulaQuantities[formula.uuid] = Math.max(formula.minimumBatchSize, Number($target.val()));
            this.render(true);
        });

        $formulas
            .find("[data-action=increase-quantity], [data-action=decrease-quantity]")
            .on("click", async (event) => {
                const $target = $(event.currentTarget);

                const itemUUID = $target.closest("li.formula-item").attr("data-item-id");
                const entrySelector = $target.closest("li.crafting-entry").attr("data-entry-selector");
                if (entrySelector) {
                    const craftingEntry = await this.actor.getCraftingEntry(entrySelector);
                    if (!craftingEntry) throw ErrorPF2e("Crafting entry not found");
                    const index = $target.closest("li.formula-item").attr("data-item-index");
                    $target.attr("data-action") === "increase-quantity"
                        ? await craftingEntry.increaseFormulaQuantity(Number(index), itemUUID ?? "")
                        : await craftingEntry.decreaseFormulaQuantity(Number(index), itemUUID ?? "");
                    return;
                }

                const formula = this.knownFormulas[itemUUID ?? ""];
                if (!formula) throw ErrorPF2e("Formula not found");

                const minBatchSize = formula.minimumBatchSize;
                const step = $target.attr("data-action") === "increase-quantity" ? minBatchSize : -minBatchSize;
                const newValue = (Number($target.siblings("input").val()) || step) + step;
                this.formulaQuantities[formula.uuid] = Math.max(newValue, minBatchSize);
                this.render();
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
            link.addEventListener("click", (event) => this.#onClickBrowseFeats(event));
        }
    }

    /** Contextually search the feats tab of the Compendium Browser */
    async #onClickBrowseFeats(event: MouseEvent): Promise<void> {
        if (!(event.currentTarget instanceof HTMLElement)) return;

        const maxLevel = Number(event.currentTarget.dataset.level) || this.actor.level;
        const button: HTMLElement = event.currentTarget;
        const checkboxesFilterCodes = button.dataset.filter?.split(",").filter((f) => !!f) ?? [];
        if (checkboxesFilterCodes.includes("feattype-general")) checkboxesFilterCodes.push("feattype-skill");
        if (checkboxesFilterCodes.includes("feattype-class")) checkboxesFilterCodes.push("feattype-archetype");

        const feattype: string[] = [];
        const traits: string[] = [];
        for (const filterCode of checkboxesFilterCodes) {
            const [filterType, value] = filterCode.split("-");
            if (!(filterType && value)) {
                const codesData = JSON.stringify(checkboxesFilterCodes);
                throw ErrorPF2e(`Invalid filter value for opening the compendium browser:\n${codesData}`);
            }
            if (filterType === "feattype") {
                feattype.push(value);
            } else if (filterType === "traits") {
                traits.push(value);
            }
        }

        const filter = { level: { max: maxLevel }, feattype, traits };
        await game.pf2e.compendiumBrowser.openTab("feat", filter);
    }

    /** Handle changing of proficiency-rank via dropdown */
    async #onChangeAdjustStat(event: JQuery.TriggeredEvent<HTMLElement>): Promise<void> {
        const $select = $(event.delegateTarget);
        const propertyKey = $select.attr("data-property") ?? "";
        const currentValue = getProperty(this.actor, propertyKey);
        const selectedValue = Number($select.val());

        if (typeof currentValue !== "number") throw ErrorPF2e("Actor property not found");

        const newValue = Math.clamped(selectedValue, 0, 4);

        await this.actor.update({ [propertyKey]: newValue });
        if (newValue !== getProperty(this.actor, propertyKey)) {
            ui.notifications.warn(game.i18n.localize("PF2E.ErrorMessage.MinimumProfLevelSetByFeatures"));
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
        return typeof categoryId === "string" ? { slotId, categoryId: categoryId } : null;
    }

    protected override async _onDropItem(event: ElementDragEvent, data: DropCanvasItemDataPF2e): Promise<ItemPF2e[]> {
        const item = await ItemPF2e.fromDropData(data);
        if (!item) throw ErrorPF2e("Unable to create item from drop data!");
        const actor = this.actor;
        const sourceActor = item?.parent;
        if (sourceActor) {
            const isSameActor =
                sourceActor.id === actor.id || (actor.isToken && sourceActor?.token?.id === actor.token?.id);
            if (isSameActor) return super._onDropItem(event, data);
        }

        if (item.isOfType("feat")) {
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
            // Prepare formula if dropped on a crafting entry.
            const $containerEl = $(event.target).closest(".item-container");
            const dropContainerType = $containerEl.attr("data-container-type");
            if (dropContainerType === "craftingEntry") {
                const entrySelector = $containerEl.attr("data-entry-selector") ?? "";
                const craftingEntry = await this.actor.getCraftingEntry(entrySelector);

                if (!craftingEntry) return;

                const craftingFormulas = await this.actor.getCraftingFormulas();
                const uuid = dropData.pf2e.itemUuid;
                const formula = craftingFormulas.find((f) => f.uuid === uuid);

                if (formula) return craftingEntry.prepareFormula(formula);
            }
        } else {
            return super._onDrop(event);
        }
    }

    /** Handle a drop event for an existing Owned Item to sort that item */
    protected override async _onSortItem(event: ElementDragEvent, itemData: ItemSourcePF2e): Promise<ItemPF2e[]> {
        const item = this.actor.items.get(itemData._id);
        if (item?.isOfType("feat")) {
            const featSlot = this.#getNearestFeatSlotId(event);
            if (!featSlot) return [];

            const group = this.actor.feats.get(featSlot.categoryId) ?? null;
            const resorting = item.category === group && !group?.slotted;
            if (group?.slotted && !featSlot.slotId) {
                return [];
            } else if (!resorting) {
                return this.actor.feats.insertFeat(item, featSlot);
            }
        }

        return super._onSortItem(event, itemData);
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

interface CharacterSheetPF2e extends CreatureSheetPF2e<CharacterPF2e> {
    getStrikeFromDOM(target: HTMLElement): CharacterStrike | null;
}

export { CharacterSheetPF2e };
