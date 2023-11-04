import type { ActorPF2e } from "@actor";
import { SkillAbbreviation } from "@actor/creature/data.ts";
import { CreatureSheetData } from "@actor/creature/index.ts";
import { isReallyPC } from "@actor/helpers.ts";
import { MODIFIER_TYPES, createProficiencyModifier } from "@actor/modifiers.ts";
import { ActorSheetDataPF2e, InventoryItem } from "@actor/sheet/data-types.ts";
import { AttributeString, SaveType } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
import {
    AncestryPF2e,
    BackgroundPF2e,
    ClassPF2e,
    DeityPF2e,
    FeatPF2e,
    HeritagePF2e,
    ItemPF2e,
    LorePF2e,
    PhysicalItemPF2e,
} from "@item";
import { isSpellConsumable } from "@item/consumable/spell-consumables.ts";
import { ActionCost, Frequency, ItemSourcePF2e } from "@item/base/data/index.ts";
import { MagicTradition } from "@item/spell/types.ts";
import { SpellcastingSheetData } from "@item/spellcasting-entry/types.ts";
import { toggleWeaponTrait } from "@item/weapon/helpers.ts";
import { BaseWeaponType, WeaponGroup } from "@item/weapon/types.ts";
import { WEAPON_CATEGORIES } from "@item/weapon/values.ts";
import { DropCanvasItemDataPF2e } from "@module/canvas/drop-canvas-data.ts";
import { PROFICIENCY_RANKS } from "@module/data.ts";
import { SheetOptions, createSheetTags } from "@module/sheet/helpers.ts";
import { eventToRollParams } from "@scripts/sheet-util.ts";
import { craft } from "@system/action-macros/crafting/craft.ts";
import { DamageType } from "@system/damage/types.ts";
import { CheckDC } from "@system/degree-of-success.ts";
import {
    ErrorPF2e,
    fontAwesomeIcon,
    getActionGlyph,
    getActionIcon,
    htmlClosest,
    htmlQuery,
    htmlQueryAll,
    isObject,
    objectHasKey,
    setHasElement,
    sluggify,
    sortLabeledRecord,
    tupleHasValue,
} from "@util";
import { UUIDUtils } from "@util/uuid.ts";
import * as R from "remeda";
import { CreatureSheetPF2e } from "../creature/sheet.ts";
import { ManageAttackProficiencies } from "../sheet/popups/manage-attack-proficiencies.ts";
import { AttributeBuilder } from "./attribute-builder.ts";
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
    CharacterBiography,
    CharacterSaveData,
    CharacterSkillData,
    CharacterStrike,
    CharacterSystemData,
    ClassDCData,
    MartialProficiency,
} from "./data.ts";
import { CharacterPF2e } from "./document.ts";
import { ElementalBlast, ElementalBlastConfig } from "./elemental-blast.ts";
import { FeatGroup } from "./feats.ts";
import { PCSheetTabManager } from "./tab-manager.ts";
import { CHARACTER_SHEET_TABS } from "./values.ts";

class CharacterSheetPF2e<TActor extends CharacterPF2e> extends CreatureSheetPF2e<TActor> {
    protected readonly actorConfigClass = CharacterConfig;

    /** A cache of this PC's known formulas, for use by sheet callbacks */
    #knownFormulas: Record<string, CraftingFormula> = {};

    /** Non-persisted tweaks to formula data */
    #formulaQuantities: Record<string, number> = {};

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
        const { actor } = this;

        // If the user only has limited permission, the main tab will be the biography
        if (this.actor.limited) {
            const tab = options?.tabs.find((t) => t.navSelector === ".sheet-navigation");
            if (tab) tab.initial = "biography";
        }

        // Attacks and defenses
        sheetData.martialProficiencies = {
            attacks: sortLabeledRecord(
                R.mapValues(sheetData.data.proficiencies.attacks as Record<string, MartialProficiency>, (data, key) => {
                    const groupMatch = /^weapon-group-([-\w]+)$/.exec(key);
                    const baseWeaponMatch = /^weapon-base-([-\w]+)$/.exec(key);
                    if (objectHasKey(CONFIG.PF2E.weaponCategories, key)) {
                        const locKey = sluggify(key, { camel: "bactrian" });
                        data.label = setHasElement(WEAPON_CATEGORIES, key)
                            ? `PF2E.Actor.Character.Proficiency.Attack.${locKey}`
                            : CONFIG.PF2E.weaponCategories[key];
                    } else if (Array.isArray(groupMatch)) {
                        const weaponGroup = groupMatch[1] as WeaponGroup;
                        data.label = CONFIG.PF2E.weaponGroups[weaponGroup] ?? weaponGroup;
                    } else if (Array.isArray(baseWeaponMatch)) {
                        const baseWeapon = baseWeaponMatch[1] as BaseWeaponType;
                        data.label = CONFIG.PF2E.baseWeaponTypes[baseWeapon] ?? baseWeapon;
                    } else {
                        data.label ??= key;
                    }
                    const rank = data.rank ?? 0;
                    data.value = createProficiencyModifier({ actor, rank, domains: [] }).value;

                    return data;
                }),
            ),
            defenses: sortLabeledRecord(
                R.mapValues(
                    sheetData.data.proficiencies.defenses as Record<string, MartialProficiency>,
                    (data, key) => {
                        if (key in CONFIG.PF2E.armorCategories) {
                            const locKey = sluggify(key, { camel: "bactrian" });
                            data.label = `PF2E.Actor.Character.Proficiency.Defense.${locKey}`;
                        }
                        const rank = data.rank ?? 0;
                        data.value = createProficiencyModifier({ actor, rank, domains: [] }).value;
                        return data;
                    },
                ),
            ),
        };

        // These are only relevant for companion compendium "PCs": don't clutter the list.
        for (const key of ["light-barding", "heavy-barding"]) {
            if (sheetData.martialProficiencies.defenses[key]?.rank === 0) {
                delete sheetData.martialProficiencies.defenses[key];
            }
        }

        // A(H)BCD
        sheetData.ancestry = actor.ancestry;
        sheetData.heritage = actor.heritage;
        sheetData.background = actor.background;
        sheetData.class = actor.class;
        sheetData.deity = actor.deity;

        // Update hero points label
        sheetData.data.resources.heroPoints.hover = game.i18n.format(
            actor.heroPoints.value === 1 ? "PF2E.HeroPointRatio.One" : "PF2E.HeroPointRatio.Many",
            actor.heroPoints,
        );

        // Indicate whether the PC has all attribute boosts allocated
        sheetData.attributeBoostsAllocated = ((): boolean => {
            const { build } = sheetData.data;
            if (build.attributes.manual || !isReallyPC(actor)) {
                return true;
            }

            const keyAttributeSelected =
                !sheetData.class || build.attributes.keyOptions.includes(sheetData.data.details.keyability.value);
            const ancestryBoostsSelected =
                (sheetData.ancestry?.system.alternateAncestryBoosts?.length === 2 ||
                    Object.values(sheetData.ancestry?.system.boosts ?? {}).every(
                        (b) => b.value.length === 0 || !!b.selected,
                    )) &&
                sheetData.ancestry?.system.voluntary?.boost !== null;
            const backgroundBoostsSelected = Object.values(sheetData.background?.system.boosts ?? {}).every(
                (b) => b.value.length === 0 || !!b.selected,
            );

            return (
                ancestryBoostsSelected &&
                backgroundBoostsSelected &&
                keyAttributeSelected &&
                ([1, 5, 10, 15, 20] as const).filter(
                    (l) => build.attributes.allowedBoosts[l] > build.attributes.boosts[l].length,
                ).length === 0
            );
        })();

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
                }),
            )
            .sort((a, b) => (a.primary ? -1 : b.primary ? 1 : a.slug.localeCompare(b.slug)));
        const primaryClassDC = sheetData.data.attributes.classDC?.slug ?? null;

        sheetData.classDCs = {
            dcs: classDCs,
            primary: primaryClassDC,
            perDCDetails: classDCs.length > 1 || !primaryClassDC,
        };

        // Acquire all unselected apex attribute options
        const abpEnabled = game.pf2e.variantRules.AutomaticBonusProgression.isEnabled(actor);
        sheetData.apexAttributeOptions = abpEnabled
            ? []
            : this.actor.itemTypes.equipment.flatMap((e) =>
                  e.system.apex?.selected === false &&
                  e.isInvested &&
                  e.system.apex.attribute !== actor.system.build.attributes.apex
                      ? e.system.apex.attribute
                      : [],
              );

        // Spell Details
        sheetData.magicTraditions = CONFIG.PF2E.magicTraditions;
        sheetData.preparationType = CONFIG.PF2E.preparationType;

        // preparing the name of the rank, as this is displayed on the sheet
        sheetData.data.attributes.perception.rankName = game.i18n.format(
            `PF2E.ProficiencyLevel${sheetData.data.attributes.perception.rank}`,
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
        sheetData.data.details.keyability.singleOption = actor.class?.system.keyAbility.value.length === 1;

        // Is the stamina variant rule enabled?
        sheetData.hasStamina = game.settings.get("pf2e", "staminaVariant");

        sheetData.spellcastingEntries = await this.prepareSpellcasting();
        sheetData.actions = this.#prepareAbilities();
        sheetData.feats = [...actor.feats, actor.feats.bonus];

        const craftingFormulas = await actor.getCraftingFormulas();
        const formulasByLevel = R.groupBy(craftingFormulas, (f) => f.level);
        const flags = actor.flags.pf2e;
        const hasQuickAlchemy = !!(
            actor.rollOptions.all["feature:quick-alchemy"] || actor.rollOptions.all["feat:quick-alchemy"]
        );

        sheetData.crafting = {
            noCost: flags.freeCrafting,
            hasQuickAlchemy,
            knownFormulas: formulasByLevel,
            entries: await this.#prepareCraftingEntries(craftingFormulas),
        };

        this.#knownFormulas = Object.values(formulasByLevel)
            .flat()
            .reduce((result: Record<string, CraftingFormula>, entry) => {
                entry.batchSize = this.#formulaQuantities[entry.uuid] ?? entry.batchSize;
                result[entry.uuid] = entry;
                return result;
            }, {});

        sheetData.abpEnabled = AutomaticBonusProgression.isEnabled(actor);

        // Sort skills by localized label
        sheetData.data.skills = Object.fromEntries(
            Object.entries(sheetData.data.skills).sort(([_keyA, skillA], [_keyB, skillB]) =>
                game.i18n
                    .localize(skillA.label ?? "")
                    .localeCompare(game.i18n.localize(skillB.label ?? ""), game.i18n.lang),
            ),
        ) as Record<SkillAbbreviation, CharacterSkillData>;

        sheetData.tabVisibility = deepClone(actor.flags.pf2e.sheetTabs);

        // Enrich content
        const rollData = actor.getRollData();
        const biography = (sheetData.biography = actor.system.details.biography);
        const enrichPromises = {
            appearance: TextEditor.enrichHTML(biography.appearance, { rollData, async: true }),
            backstory: TextEditor.enrichHTML(biography.backstory, { rollData, async: true }),
            campaignNotes: TextEditor.enrichHTML(biography.campaignNotes, { rollData, async: true }),
            allies: TextEditor.enrichHTML(biography.allies, { rollData, async: true }),
            enemies: TextEditor.enrichHTML(biography.enemies, { rollData, async: true }),
            organizations: TextEditor.enrichHTML(biography.organizations, { rollData, async: true }),
        };
        await Promise.all(Object.values(enrichPromises));
        for (const [key, content] of Object.entries(enrichPromises)) {
            sheetData.enrichedContent[key] = await content;
        }

        // Elemental Blasts
        try {
            const action = new ElementalBlast(this.actor);
            const blastData = (await Promise.all(action.configs.map((c) => this.#getBlastData(action, c)))).sort(
                (a, b) => a.label.localeCompare(b.label, game.i18n.lang),
            );
            sheetData.elementalBlasts = blastData;
        } catch (error) {
            if (BUILD_MODE === "development") console.error(error);
            sheetData.elementalBlasts = [];
        }

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

    /** Prepares all ability-type items that create an action in the sheet */
    #prepareAbilities(): CharacterSheetData["actions"] {
        const { actor } = this;
        const result: CharacterSheetData["actions"] = {
            encounter: {
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

            // KINETICIST HARD CODE: Show elemental blasts alongside strikes instead of among other actions
            if (item.slug === "elemental-blast" && this.actor.flags.pf2e.kineticist) {
                continue;
            }

            const img = ((): ImageFilePath => {
                const actionIcon = getActionIcon(item.actionCost);
                const defaultIcon = ItemPF2e.getDefaultArtwork(item._source).img;
                if (item.isOfType("action") && ![actionIcon, defaultIcon].includes(item.img)) {
                    return item.img;
                }
                return item.system.selfEffect?.img ?? actionIcon;
            })();

            const traits = item.system.traits.value;
            const traitDescriptions = item.isOfType("feat") ? CONFIG.PF2E.featTraits : CONFIG.PF2E.actionTraits;

            const action: ActionSheetData = {
                ...R.pick(item, ["id", "name", "actionCost", "frequency"]),
                img,
                glyph: getActionGlyph(item.actionCost),
                traits: createSheetTags(traitDescriptions, traits),
                feat: item.isOfType("feat") ? item : null,
                hasEffect: !!item.system.selfEffect,
            };

            if (traits.includes("exploration")) {
                const active = actor.system.exploration.includes(item.id);
                action.exploration = { active };
                (active ? result.exploration.active : result.exploration.other).push(action);
            } else if (traits.includes("downtime")) {
                result.downtime.push(action);
            } else {
                const category = result.encounter[item.actionCost?.type ?? "free"];
                category?.actions.push(action);
            }
        }

        for (const list of ["action", "reaction", "free"] as const) {
            result.encounter[list].actions.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
        }
        result.exploration.active.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
        result.exploration.other.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
        result.downtime.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));

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

    protected override prepareInventoryItem(item: PhysicalItemPF2e): InventoryItem {
        const data = super.prepareInventoryItem(item);
        data.isInvestable = !item.isInContainer && item.isIdentified && item.isInvested !== null;

        // If armor is equipped, and can be invested, hint at the user that it should be invested
        const invested = this.actor.inventory.invested;
        const canInvest = invested && invested.value < invested.max;
        if (item.isOfType("armor") && item.isEquipped && !item.isInvested && data.isInvestable && canInvest) {
            data.notifyInvestment = true;
        }

        return data;
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        // Toggle the availability of the roll-initiative link
        this.toggleInitiativeLink();

        // Recheck for the presence of an encounter in case the button state has somehow fallen out of sync
        const rollInitiativeLink = htmlQuery(html, ".sidebar a[data-action=roll-initiative]");
        rollInitiativeLink?.addEventListener("mouseenter", () => {
            this.toggleInitiativeLink();
        });

        // Adjust Hero Points
        const heroPointsPips = htmlQuery(html, "[data-action=adjust-hero-points]");
        heroPointsPips?.addEventListener("click", async () => {
            const newValue = Math.min(this.actor.heroPoints.value + 1, this.actor.heroPoints.max);
            await this.actor.update({ "system.resources.heroPoints.value": newValue });
        });
        heroPointsPips?.addEventListener("contextmenu", async (event) => {
            event.preventDefault();
            const newValue = Math.max(this.actor.heroPoints.value - 1, 0);
            await this.actor.update({ "system.resources.heroPoints.value": newValue });
        });

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

        // MAIN
        const mainPanel = htmlQuery(html, ".tab[data-tab=character]");

        // Ancestry/Heritage/Class/Background/Deity context menu
        if (mainPanel && this.isEditable) {
            new ContextMenu(
                mainPanel,
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
                { eventName: "click" },
            );

            for (const link of htmlQueryAll(html, ".crb-tag-selector")) {
                link.addEventListener("click", () => this.openTagSelector(link, { allowCustom: false }));
            }

            htmlQuery(mainPanel, "button[data-action=edit-attribute-boosts]")?.addEventListener("click", () => {
                const builder =
                    Object.values(this.actor.apps).find((a) => a instanceof AttributeBuilder) ??
                    new AttributeBuilder(this.actor);
                builder.render(true);
            });

            for (const link of htmlQueryAll(mainPanel, "a[data-action=apex-attribute]")) {
                link.addEventListener("click", () => {
                    if (game.pf2e.variantRules.AutomaticBonusProgression.isEnabled(this.actor)) {
                        return;
                    }
                    const attribute = htmlClosest(link, "[data-attribute]")?.dataset.attribute;
                    if (setHasElement(ATTRIBUTE_ABBREVIATIONS, attribute)) {
                        const apexItems = this.actor.itemTypes.equipment.filter((e) => e.system.apex);
                        const selection = apexItems.find((e) => e.isInvested && e.system.apex?.attribute === attribute);
                        this.actor.updateEmbeddedDocuments(
                            "Item",
                            apexItems.map((e) => ({ _id: e.id, "system.apex.selected": e === selection })),
                        );
                    }
                });
            }
        }

        // ACTIONS
        const actionsPanel = htmlQuery(html, ".tab.actions");

        // Filter strikes
        htmlQuery(actionsPanel, ".toggle-unready-strikes")?.addEventListener("click", () => {
            this.actor.setFlag("pf2e", "showUnreadyStrikes", !this.actor.flags.pf2e.showUnreadyStrikes);
        });

        for (const strikeElem of htmlQueryAll(actionsPanel, ".strikes-list li")) {
            // Versatile-damage toggles
            const versatileToggleButtons = htmlQueryAll<HTMLButtonElement>(
                strikeElem,
                "button[data-action=toggle-versatile]",
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
                "button[data-action=auxiliary-action]",
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

        // Handle adding and inputting custom user submitted modifiers
        for (const customModifierEl of htmlQueryAll(html, ".modifiers-tooltip")) {
            const stat = customModifierEl.dataset.stat;
            if (!stat) continue;

            for (const removeButton of htmlQueryAll(customModifierEl, "[data-action=remove-modifier]")) {
                const slug = removeButton.dataset.slug ?? "";
                removeButton.addEventListener("click", () => {
                    this.actor.removeCustomModifier(stat, slug);
                });
            }

            const modifierValueEl = htmlQuery<HTMLInputElement>(customModifierEl, ".add-modifier input[type=number]");
            htmlQuery(customModifierEl, "[data-action=increment]")?.addEventListener("click", () => {
                modifierValueEl?.stepUp();
            });
            htmlQuery(customModifierEl, "[data-action=decrement]")?.addEventListener("click", () => {
                modifierValueEl?.stepDown();
            });

            htmlQuery(customModifierEl, "[data-action=create-custom-modifier]")?.addEventListener("click", () => {
                const modifier = modifierValueEl?.valueAsNumber || 1;
                const type = htmlQuery<HTMLSelectElement>(customModifierEl, ".add-modifier-type")?.value ?? "";
                const label =
                    htmlQuery<HTMLInputElement>(customModifierEl, ".add-modifier-name")?.value?.trim() ??
                    game.i18n.localize(`PF2E.ModifierType.${type}`);
                if (!setHasElement(MODIFIER_TYPES, type)) {
                    ui.notifications.error("Type is required.");
                    return;
                }

                this.actor.addCustomModifier(stat, label, modifier, type);
            });
        }

        this.#activateBlastListeners(actionsPanel);

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

        htmlQuery(html, "[data-action=rest]")?.addEventListener("click", (event) => {
            game.pf2e.actions.restForTheNight({ event, actors: this.actor });
        });

        // SPELLCASTING
        const castingPanel = htmlQuery(html, ".tab[data-tab=spellcasting]");

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
                const formula = this.#knownFormulas[itemUUID];
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
                this.#formulaQuantities[formula.uuid] = Math.max(newValue, minBatchSize);
                this.render();
            });
            for (const button of htmlQueryAll(
                element,
                "[data-action=increase-quantity], [data-action=decrease-quantity]",
            )) {
                button.addEventListener("click", async () => {
                    if (!quantity) return;
                    const itemUUID = element.dataset.itemId ?? "";
                    const formula = this.#knownFormulas[itemUUID];
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
                    this.#formulaQuantities[formula.uuid] = Math.max(newValue, minBatchSize);
                    this.render();
                });
            }

            const craftButton = htmlQuery(element, "a[data-action=craft-item]");
            craftButton?.addEventListener("click", async (event) => {
                const { itemUuid, free, prepared } = craftButton.dataset;
                const itemQuantity = Number(quantity?.value) || 1;
                const formula = this.#knownFormulas[itemUuid ?? ""];
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
                        { render: false },
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
                const name = this.#knownFormulas[itemUuid]?.name;
                const content = `<p class="note">${game.i18n.format("PF2E.CraftingTab.RemoveFormulaDialogQuestion", {
                    name,
                })}</p>`;
                const title = game.i18n.localize("PF2E.CraftingTab.RemoveFormulaDialogTitle");
                if (await Dialog.confirm({ title, content })) {
                    const actorFormulas = this.actor.toObject().system.crafting?.formulas ?? [];
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
                const name = this.#knownFormulas[itemUuid]?.name;
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
                (e) => !!e.selector && e.checkEntryRequirements(formula, { warn: false }),
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

        for (const spellcastingCollectionEl of htmlQueryAll(html, ".spellcasting-entry[data-item-id]")) {
            const entry = this.actor.spellcasting.get(spellcastingCollectionEl.dataset.itemId ?? "");
            htmlQuery(spellcastingCollectionEl, "[data-action=spell-attack]")?.addEventListener("click", (event) => {
                entry?.statistic?.check.roll(eventToRollParams(event, { type: "check" }));
            });
        }

        PCSheetTabManager.initialize(this.actor, $html.find<HTMLAnchorElement>("a[data-action=manage-tabs]")[0]);

        // Feat Browser shortcut links
        for (const link of htmlQueryAll(html, "[data-action=browse-feats]")) {
            link.addEventListener("click", () => this.#onClickBrowseFeats(link));
        }

        // BIOGRAPHY
        const bioPanel = htmlQuery(html, ".tab[data-tab=biography]");

        // Biography section visibility toggles
        bioPanel?.addEventListener("click", (event) => {
            const anchor = htmlClosest(event.target, "a[data-action=toggle-bio-visibility");
            const section = anchor?.dataset.section;
            if (tupleHasValue(["appearance", "backstory", "personality", "campaign"], section)) {
                event.stopPropagation();
                const { biography } = this.actor.system.details;
                const path = `system.details.biography.visibility.${section}`;
                this.actor.update({ [path]: !biography.visibility[section] });
            }
        });
    }

    protected override activateInventoryListeners(panel: HTMLElement | null): void {
        super.activateInventoryListeners(panel);

        // Toggle invested state
        const inventory = this.isEditable ? htmlQuery(panel, ".inventory-pane") : null;
        inventory?.addEventListener("click", (event) => {
            const link = htmlClosest(event.target, "a[data-action=toggle-invested]");
            const itemId = htmlClosest(link, ".item")?.dataset.itemId;
            if (itemId) this.actor.toggleInvested(itemId);
        });
    }

    async #getBlastData(blast: ElementalBlast, config: ElementalBlastConfig): Promise<ElementalBlastSheetConfig> {
        const damageType = config.damageTypes.find((dt) => dt.selected)?.value ?? "untyped";
        const formulaFor = (outcome: "success" | "criticalSuccess", melee = true): Promise<string | null> =>
            blast.damage({
                element: config.element,
                damageType,
                melee,
                outcome,
                getFormula: true,
            });

        return {
            ...config,
            damageType,
            formula: {
                melee: {
                    damage: await formulaFor("success"),
                    critical: await formulaFor("criticalSuccess"),
                },
                ranged: {
                    damage: await formulaFor("success", false),
                    critical: await formulaFor("criticalSuccess", false),
                },
            },
        };
    }

    #activateBlastListeners(panel: HTMLElement | null): void {
        const blastList = htmlQuery(panel, "ol.elemental-blasts");
        const { elementTraits, damageTypes } = CONFIG.PF2E;
        const selectors = ["roll-attack", "roll-damage", "set-damage-type"]
            .map((s) => `button[data-action=${s}]`)
            .join(",");

        blastList?.addEventListener("click", async (event) => {
            const button = htmlClosest<HTMLButtonElement>(event.target, selectors);
            const blastRow = htmlClosest(button, "li");
            if (!(button && blastRow)) return;
            event.stopPropagation();

            const blast = new ElementalBlast(this.actor);
            const { element } = blastRow.dataset;
            const damageType = button.value || blastRow.dataset.damageType;
            if (!objectHasKey(elementTraits, element)) {
                throw ErrorPF2e("Unexpected error retrieve element");
            }
            if (!objectHasKey(damageTypes, damageType)) {
                throw ErrorPF2e("Unexpected error retrieving damage type");
            }
            const melee = button.dataset.melee === "true";

            switch (button.dataset.action) {
                case "roll-attack": {
                    const mapIncreases = Math.clamped(Number(button.dataset.mapIncreases) || 0, 0, 2);
                    await blast.attack({ mapIncreases, element, damageType, melee, event });
                    break;
                }
                case "roll-damage": {
                    const outcome = button.dataset.outcome === "success" ? "success" : "criticalSuccess";
                    await blast.damage({ element, damageType, melee, outcome, event });
                    break;
                }
                case "set-damage-type": {
                    blast.setDamageType({ element, damageType });
                }
            }
        });
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
            const [filterType, ...rest] = filterCode.split("-");
            const value = rest.join("-"); // The value may also include hyphens

            if (!(filterType && value)) {
                throw ErrorPF2e(`Invalid filter value for opening the compendium browser: "${filterCode}"`);
            }
            if (filterType === "category" && value in category.options) {
                category.isExpanded = true;
                category.options[value].selected = true;
                category.selected.push(value);
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

    #getFeatSlotData(event: DragEvent): { groupId: string; slotId: string | null } | null {
        const groupId = htmlClosest(event.target, "[data-group-id]")?.dataset.groupId;
        const slotId = htmlClosest(event.target, "[data-slot-id]")?.dataset.slotId || null;
        return groupId ? { groupId, slotId } : null;
    }

    /** Toggle availability of the roll-initiative link on the sidebar */
    toggleInitiativeLink(link?: HTMLElement | null): void {
        link ??= htmlQuery(this.element.get(0), ".sidebar a[data-action=roll-initiative]");
        if (!link) return;

        const alreadyRolled = typeof this.actor.combatant?.initiative === "number";
        const canRoll = !!(this.isEditable && game.combat && !alreadyRolled);

        if (canRoll) {
            link.classList.remove("disabled");
            link.dataset.tooltip = "COMBAT.InitiativeRoll";
        } else {
            link.classList.add("disabled");
            const reason = !this.isEditable
                ? ""
                : !game.combat
                ? "NoActiveEncounter"
                : alreadyRolled
                ? "AlreadyRolled"
                : null;
            if (reason) link.dataset.tooltip = game.i18n.format(`PF2E.Encounter.${reason}`, { actor: this.actor.name });
        }
    }

    protected override async _onDropItem(
        event: ElementDragEvent,
        data: DropCanvasItemDataPF2e,
    ): Promise<ItemPF2e<ActorPF2e | null>[]> {
        const item = await ItemPF2e.fromDropData(data);
        if (!item) throw ErrorPF2e("Unable to create item from drop data!");

        // If the actor is the same, call the parent method, which will eventually call the sort instead
        if (this.actor.uuid === item.parent?.uuid) {
            return super._onDropItem(event, data);
        }

        if (item.isOfType("feat")) {
            const slotData = this.#getFeatSlotData(event);
            return this.actor.feats.insertFeat(item, slotData);
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
                const formula = this.#knownFormulas[uuid];
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
        entrySelector: string | null,
    ): Promise<void> {
        if (!UUIDUtils.isItemUUID(targetUuid)) return;
        if (sourceFormula.uuid === targetUuid) return;

        const sourceLevel = sourceFormula.level;
        const targetLevel = this.#knownFormulas[targetUuid].level;

        // Do not allow sorting with different formula level outside of a crafting entry
        if (!entrySelector && sourceLevel !== targetLevel) {
            return;
        }

        const performSort = async (
            formulas: (PreparedFormulaData | CraftingFormulaData)[],
            source: PreparedFormulaData | CraftingFormulaData,
            target: PreparedFormulaData | CraftingFormulaData,
            siblings: (PreparedFormulaData | CraftingFormulaData)[],
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
        const formulas = this.actor.toObject().system.crafting?.formulas ?? [];
        const source = formulas.find((f) => f.uuid === sourceFormula.uuid);
        const target = formulas.find((f) => f.uuid === targetUuid);
        if (source && target) {
            const siblings = formulas.filter((f) => f.uuid !== source.uuid);
            return performSort(formulas, source, target, siblings);
        }
    }

    /** Handle a drop event for an existing Owned Item to sort that item */
    protected override async _onSortItem(
        event: DragEvent,
        itemSource: ItemSourcePF2e,
    ): Promise<CollectionValue<TActor["items"]>[]>;
    protected override async _onSortItem(event: DragEvent, itemSource: ItemSourcePF2e): Promise<ItemPF2e<ActorPF2e>[]> {
        const item = this.actor.items.get(itemSource._id!);
        if (item?.isOfType("feat")) {
            const featSlot = this.#getFeatSlotData(event);
            if (featSlot) {
                const group = this.actor.feats.get(featSlot.groupId) ?? null;
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
    attributeBoostsAllocated: boolean;
    biography: CharacterBiography;
    class: ClassPF2e<CharacterPF2e> | null;
    classDCs: {
        dcs: ClassDCSheetData[];
        /** The slug of the character's primary class DC */
        primary: string | null;
        /** Show class label and individual modifier lists for each class DC */
        perDCDetails: boolean;
    };
    apexAttributeOptions: AttributeString[];
    crafting: CraftingSheetData;
    data: CharacterSystemSheetData;
    deity: DeityPF2e<CharacterPF2e> | null;
    hasStamina: boolean;
    /** This actor has actual containers for stowing, rather than just containers serving as a UI convenience */
    hasRealContainers: boolean;
    magicTraditions: Record<MagicTradition, string>;
    martialProficiencies: Record<"attacks" | "defenses", Record<string, MartialProficiency>>;
    options: CharacterSheetOptions;
    preparationType: Object;
    showPFSTab: boolean;
    spellcastingEntries: SpellcastingSheetData[];
    tabVisibility: CharacterSheetTabVisibility;
    actions: {
        encounter: Record<"action" | "reaction" | "free", { label: string; actions: ActionSheetData[] }>;
        exploration: {
            active: ActionSheetData[];
            other: ActionSheetData[];
        };
        downtime: ActionSheetData[];
    };
    feats: FeatGroup[];
    elementalBlasts: ElementalBlastSheetConfig[];
}

interface ActionSheetData {
    id: string;
    name: string;
    img: string;
    glyph: string | null;
    actionCost: ActionCost | null;
    frequency: Frequency | null;
    feat: FeatPF2e | null;
    traits: SheetOptions;
    exploration?: {
        active: boolean;
    };
    hasEffect: boolean;
}

interface ClassDCSheetData extends ClassDCData {
    icon: string;
    hover: string;
    rankSlug: string;
    rankName: string;
}

interface ElementalBlastSheetConfig extends ElementalBlastConfig {
    damageType: DamageType;
    formula: {
        ranged: { damage: string | null; critical: string | null };
        melee: { damage: string | null; critical: string | null };
    };
}

export { CharacterSheetPF2e };
export type { CharacterSheetData, CharacterSheetTabVisibility };
