import { SkillAbbreviation } from "@actor/creature/data.ts";
import { CreatureSheetData, Language } from "@actor/creature/index.ts";
import type { Sense } from "@actor/creature/sense.ts";
import { isReallyPC } from "@actor/helpers.ts";
import { MODIFIER_TYPES, createProficiencyModifier } from "@actor/modifiers.ts";
import { SheetClickActionHandlers } from "@actor/sheet/base.ts";
import { ActorSheetDataPF2e, InventoryItem } from "@actor/sheet/data-types.ts";
import { condenseSenses } from "@actor/sheet/helpers.ts";
import { AttributeString, SaveType } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
import type {
    AncestryPF2e,
    BackgroundPF2e,
    ClassPF2e,
    DeityPF2e,
    FeatPF2e,
    HeritagePF2e,
    LorePF2e,
    PhysicalItemPF2e,
} from "@item";
import { ItemPF2e, ItemProxyPF2e } from "@item";
import { TraitToggleViewData } from "@item/ability/trait-toggles.ts";
import { ActionCost, Frequency, ItemSourcePF2e } from "@item/base/data/index.ts";
import { isSpellConsumable } from "@item/consumable/spell-consumables.ts";
import { MagicTradition } from "@item/spell/types.ts";
import { SpellcastingSheetData } from "@item/spellcasting-entry/types.ts";
import { BaseWeaponType, WeaponGroup } from "@item/weapon/types.ts";
import { WEAPON_CATEGORIES } from "@item/weapon/values.ts";
import { DropCanvasItemDataPF2e } from "@module/canvas/drop-canvas-data.ts";
import { ZeroToFour } from "@module/data.ts";
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
        options.height = 750;
        options.scrollY.push(".tab[data-tab=spellcasting] > [data-panels]", ".tab.active .tab-content");
        options.dragDrop.push({ dragSelector: "ol[data-strikes] > li, ol[data-elemental-blasts] > li" });
        options.tabs = [
            { navSelector: "nav.sheet-navigation", contentSelector: ".sheet-content", initial: "character" },
            { navSelector: "nav.actions-nav", contentSelector: ".actions-panels", initial: "encounter" },
            {
                navSelector: "nav[data-group=spell-collections]",
                contentSelector: "div[data-tab=spellcasting] > [data-panels]",
                group: "spell-collections",
                initial: "known-spells",
            },
        ];
        return options;
    }

    override get template(): string {
        const template = this.actor.limited && !game.user.isGM ? "limited" : "sheet";
        return `systems/pf2e/templates/actors/character/${template}.hbs`;
    }

    override async getData(options?: ActorSheetOptions): Promise<CharacterSheetData<TActor>> {
        const sheetData = (await super.getData(options)) as CharacterSheetData<TActor>;
        const actor = this.actor;

        // If the user only has limited permission, the main tab will be the biography
        if (this.actor.limited) {
            const tab = options?.tabs.find((t) => t.navSelector === ".sheet-navigation");
            if (tab) tab.initial = "biography";
        }

        sheetData.numberToRank = R.mapToObj([0, 1, 2, 3, 4] as const, (n) => [
            n,
            game.i18n.localize(`PF2E.ProficiencyLevel${n}`),
        ]);

        sheetData.senses = condenseSenses(this.actor.perception.senses.contents);

        // Attacks and defenses
        // Prune untrained martial proficiencies
        for (const section of ["attacks", "defenses"] as const) {
            for (const key of R.keys.strict(sheetData.data.proficiencies[section])) {
                const proficiency = sheetData.data.proficiencies[section][key];
                if (proficiency?.rank === 0 && !proficiency.custom) {
                    delete sheetData.data.proficiencies[section][key];
                }
            }
        }
        sheetData.martialProficiencies = {
            attacks: sortLabeledRecord(
                R.mapValues(sheetData.data.proficiencies.attacks as Record<string, MartialProficiency>, (data, key) => {
                    const groupMatch = /^weapon-group-([-\w]+)$/.exec(key);
                    const baseWeaponMatch = /^weapon-base-([-\w]+)$/.exec(key);
                    if (objectHasKey(CONFIG.PF2E.weaponCategories, key)) {
                        const locKey = sluggify(key, { camel: "bactrian" });
                        data.label = tupleHasValue(WEAPON_CATEGORIES, key)
                            ? `PF2E.Actor.Character.Proficiency.Attack.${locKey}`
                            : CONFIG.PF2E.weaponCategories[key];
                    } else if (Array.isArray(groupMatch)) {
                        const weaponGroup = groupMatch[1] as WeaponGroup;
                        data.label = CONFIG.PF2E.weaponGroups[weaponGroup] ?? weaponGroup;
                    } else if (Array.isArray(baseWeaponMatch)) {
                        const baseType = baseWeaponMatch[1] as BaseWeaponType;
                        const baseWeaponTypes: Record<string, string | undefined> = CONFIG.PF2E.baseWeaponTypes;
                        const baseShieldTypes: Record<string, string | undefined> = CONFIG.PF2E.baseShieldTypes;
                        data.label = baseWeaponTypes[baseType] ?? baseShieldTypes[baseType] ?? baseType;
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
            : this.actor.inventory.contents.flatMap((e) =>
                  e.system.apex?.selected === false &&
                  e.isInvested &&
                  e.system.apex.attribute !== actor.system.build.attributes.apex
                      ? e.system.apex.attribute
                      : [],
              );

        // Spellcasting
        const collectionGroups: Record<SpellcastingTabSlug, SpellcastingSheetData[]> = fu.mergeObject(
            { "known-spells": [], rituals: [], activations: [] },
            R.groupBy.strict(await this.prepareSpellcasting(), (a) => {
                if (a.category === "items") return "activations";
                if (a.category === "ritual") return "rituals";
                return "known-spells";
            }),
        );

        sheetData.magicTraditions = CONFIG.PF2E.magicTraditions;
        sheetData.preparationType = CONFIG.PF2E.preparationType;
        sheetData.spellCollectionGroups = collectionGroups;
        sheetData.hasNormalSpellcasting = sheetData.spellCollectionGroups["known-spells"].some(
            (s) => s.usesSpellProficiency,
        );

        // ensure saves are displayed in the following order:
        sheetData.data.saves = {
            fortitude: sheetData.data.saves.fortitude,
            reflex: sheetData.data.saves.reflex,
            will: sheetData.data.saves.will,
        };

        // limiting the amount of characters for the save labels
        for (const save of Object.values(sheetData.data.saves)) {
            save.short = game.i18n.format(`PF2E.Saves${save.label}Short`);
        }

        // Is the character's key ability score overridden by an Active Effect?
        sheetData.data.details.keyability.singleOption = actor.class?.system.keyAbility.value.length === 1;

        // Is the stamina variant rule enabled?
        sheetData.hasStamina = game.pf2e.settings.variants.stamina;
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

        sheetData.languages = ((): LanguageSheetData[] => {
            const languagesBuild = actor.system.build.languages;
            const sourceLanguages = actor._source.system.details.languages.value
                .filter((l) => l in CONFIG.PF2E.languages)
                .sort();
            const isOverMax = languagesBuild.value > languagesBuild.max;
            const languageSlugs = actor.system.details.languages.value;
            const commonLanguage = game.pf2e.settings.campaign.languages.commonLanguage;
            const localizedLanguages: LanguageSheetData[] = languageSlugs.flatMap((language) => {
                if (language === commonLanguage && languageSlugs.includes("common")) {
                    return [];
                }
                const label =
                    language === "common" && commonLanguage
                        ? game.i18n.format("PF2E.Actor.Creature.Language.CommonLanguage", {
                              language: game.i18n.localize(CONFIG.PF2E.languages[commonLanguage]),
                          })
                        : game.i18n.localize(CONFIG.PF2E.languages[language]);
                return { slug: language, label, tooltip: null, overLimit: false };
            });

            // If applicable, mark languages at the end as being over-limit
            const sortedLanguages = localizedLanguages.sort((a, b) => a.label.localeCompare(b.label));
            const commonFirst = R.sortBy(sortedLanguages, (l) => l.slug !== "common");
            for (const language of commonFirst.filter((l) => l.slug && sourceLanguages.includes(l.slug)).reverse()) {
                if (!language.slug) continue;
                language.overLimit = isOverMax && sourceLanguages.indexOf(language.slug) + 1 > languagesBuild.max;
                language.tooltip = language.overLimit
                    ? game.i18n.localize("PF2E.Actor.Character.Language.OverLimit")
                    : null;
            }

            const unallocatedLabel = game.i18n.localize("PF2E.Actor.Character.Language.Unallocated.Label");
            const unallocatedTooltip = game.i18n.localize("PF2E.Actor.Character.Language.Unallocated.Tooltip");
            const unallocatedLanguages = Array.fromRange(Math.max(0, languagesBuild.max - languagesBuild.value)).map(
                () => ({ slug: null, label: unallocatedLabel, tooltip: unallocatedTooltip, overLimit: false }),
            );
            commonFirst.push(...unallocatedLanguages);

            return commonFirst;
        })();

        // Sort skills by localized label
        sheetData.data.skills = Object.fromEntries(
            Object.entries(sheetData.data.skills).sort(([_keyA, skillA], [_keyB, skillB]) =>
                game.i18n
                    .localize(skillA.label ?? "")
                    .localeCompare(game.i18n.localize(skillB.label ?? ""), game.i18n.lang),
            ),
        ) as Record<SkillAbbreviation, CharacterSkillData>;

        sheetData.tabVisibility = fu.deepClone(actor.flags.pf2e.sheetTabs);

        // Enrich content
        const rollData = actor.getRollData();
        const biography = (sheetData.biography = actor.system.details.biography);
        const enrichmentOptions = { rollData, secrets: actor.isOwner, async: true };
        const enrichPromises = {
            appearance: TextEditor.enrichHTML(biography.appearance, enrichmentOptions),
            backstory: TextEditor.enrichHTML(biography.backstory, enrichmentOptions),
            campaignNotes: TextEditor.enrichHTML(biography.campaignNotes, enrichmentOptions),
            allies: TextEditor.enrichHTML(biography.allies, enrichmentOptions),
            enemies: TextEditor.enrichHTML(biography.enemies, enrichmentOptions),
            organizations: TextEditor.enrichHTML(biography.organizations, enrichmentOptions),
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

        // Speed
        const speedIcons = {
            land: "person-running",
            swim: "person-swimming",
            climb: "mountain",
            fly: "feather-pointed",
            burrow: "water-ladder",
        };
        sheetData.speeds = R.keys.strict(speedIcons).map((slug): SpeedSheetData => {
            const speed = this.actor.system.attributes.speed;
            const data = slug === "land" ? speed : speed.otherSpeeds.find((s) => s.type === slug);
            return {
                slug,
                icon: fontAwesomeIcon(speedIcons[slug]).outerHTML,
                action: ["swim", "climb"].includes(slug) && !data?.total ? slug : null,
                label: CONFIG.PF2E.speedTypes[slug],
                value: data?.total ?? null,
                breakdown: slug === "land" ? speed.breakdown : null,
            };
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

            const action: ActionSheetData = {
                ...R.pick(item, ["id", "name", "actionCost", "frequency"]),
                img,
                glyph: getActionGlyph(item.actionCost),
                feat: item.isOfType("feat") ? item : null,
                toggles: item.system.traits.toggles.getSheetData(),
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

    /** Overriden to open sub-tabs if requested */
    protected override openTab(name: string): void {
        if (["encounter", "exploration", "downtime"].includes(name)) {
            super.openTab("actions");
            this._tabs[1].activate(name);
        } else {
            super.openTab(name);
        }
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        this.#activateNavListeners(html);

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

        $html.find(".adjust-item-stat").on("click contextmenu", (event) => this.#onClickAdjustItemStat(event));
        $html.find(".adjust-item-stat-select").on("change", (event) => this.#onChangeAdjustItemStat(event));

        // MAIN
        const mainPanel = htmlQuery(html, ".tab[data-tab=character]");

        // A(H)BCD context menu
        if (mainPanel && this.isEditable) {
            new ContextMenu(
                mainPanel,
                ".detail-item-control",
                [
                    {
                        name: "PF2E.EditItemTitle",
                        icon: fontAwesomeIcon("edit").outerHTML,
                        callback: ($target) => {
                            const itemId = htmlClosest($target[0], "[data-item-id]")?.dataset.itemId;
                            const item = this.actor.items.get(itemId, { strict: true });
                            item.sheet.render(true, { focus: true });
                        },
                    },
                    {
                        name: "PF2E.DeleteItemTitle",
                        icon: fontAwesomeIcon("trash").outerHTML,
                        callback: ($target) => {
                            const itemId = htmlClosest($target[0], "[data-item-id]")?.dataset.itemId;
                            const item = this.actor.items.get(itemId, { strict: true });
                            this.deleteItem(item);
                        },
                    },
                ],
                {
                    eventName: "click",
                    // Position the menu to the left of the anchor
                    onOpen: () => {
                        Promise.resolve().then(() => {
                            const menu = document.getElementById("context-menu");
                            if (menu) {
                                const leftPlacement = -1 * Math.floor(0.95 * menu.clientWidth);
                                menu.style.left = `${leftPlacement}px`;
                            }
                        });
                    },
                },
            );

            for (const link of htmlQueryAll(html, ".crb-tag-selector")) {
                link.addEventListener("click", () => this.openTagSelector(link));
            }
        }

        // ACTIONS
        const actionsPanel = htmlQuery(html, ".tab[data-tab=actions]");

        // Filter strikes
        htmlQuery(actionsPanel, ".toggle-unready-strikes")?.addEventListener("click", () => {
            this.actor.setFlag("pf2e", "showUnreadyStrikes", !this.actor.flags.pf2e.showUnreadyStrikes);
        });

        for (const strikeElem of htmlQueryAll(actionsPanel, "ol[data-strikes] > li")) {
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

        // Tooltipster modifier dialogs. Some properties are configurable
        for (const hoverEl of htmlQueryAll(html, ".hover")) {
            const allSides = ["top", "right", "bottom", "left"] as const;
            const side = hoverEl.dataset.tooltipSide
                ?.split(",")
                ?.filter((t): t is (typeof allSides)[number] => tupleHasValue(allSides, t)) ?? ["right", "bottom"];
            $(hoverEl).tooltipster({
                trigger: "click",
                arrow: false,
                contentAsHTML: true,
                debug: BUILD_MODE === "development",
                interactive: true,
                side,
                theme: "crb-hover",
                minWidth: 120,
            });
        }

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

        // Update all "normal" spellcasting entries
        for (const select of htmlQueryAll<HTMLSelectElement>(html, "select[data-action=update-spellcasting-rank]")) {
            select.addEventListener("change", () => {
                const newRank = Number(select.value);
                if (![1, 2, 3, 4].includes(newRank)) {
                    throw ErrorPF2e("Unexpected rank received while changing proficiency");
                }
                const autoChanges = (
                    this.actor.system.autoChanges["system.proficiencies.spellcasting.rank"] ?? []
                ).filter((ac) => typeof ac.value === "number" && ac.mode === "upgrade");
                const highestUpgrade = R.sortBy(autoChanges, (ac) => Number(ac.value)).at(-1);
                if (typeof highestUpgrade?.value === "number" && highestUpgrade.value > newRank) {
                    const ranks: readonly string[] = CONFIG.PF2E.proficiencyLevels;
                    const rank = ranks[highestUpgrade.value];
                    ui.notifications.warn(
                        game.i18n.format("PF2E.Actor.Character.Proficiency.HigherUpgrade", {
                            ability: highestUpgrade.source,
                            rank: game.i18n.format(rank),
                        }),
                    );
                    this.render();
                } else {
                    const entries = this.actor.itemTypes.spellcastingEntry.filter((e) => !e.system.proficiency.slug);
                    this.actor.updateEmbeddedDocuments(
                        "Item",
                        entries.map((e) => ({ _id: e.id, "system.proficiency.value": newRank })),
                    );
                }
            });
        }

        // CRAFTING
        const craftingTab = htmlQuery(html, ".tab[data-tab=crafting]");

        for (const element of htmlQueryAll<HTMLLIElement>(craftingTab, "li.formula-item")) {
            const quantity = htmlQuery<HTMLInputElement>(element, "input[data-craft-quantity]");
            quantity?.addEventListener("change", async (event) => {
                const row = htmlClosest(event?.target, "li");
                const uuid = row?.dataset.itemUuid ?? "";
                const formula = this.#knownFormulas[uuid];
                const minBatchSize = formula.minimumBatchSize;
                const newValue = Number(quantity.value) || minBatchSize;
                if (newValue < 1) return;

                const entrySelector = htmlClosest(event?.target, "li")?.dataset.entrySelector;
                if (entrySelector) {
                    const craftingEntry = await this.actor.getCraftingEntry(entrySelector);
                    if (!craftingEntry) throw ErrorPF2e("Crafting entry not found");

                    const index = element.dataset.itemIndex;
                    return craftingEntry.setFormulaQuantity(Number(index), uuid, newValue);
                }
                this.#formulaQuantities[formula.uuid] = Math.max(newValue, minBatchSize);
                this.render();
            });
        }

        for (const spellcastingCollectionEl of htmlQueryAll(castingPanel, ".spellcasting-entry[data-item-id]")) {
            const entry = this.actor.spellcasting.get(spellcastingCollectionEl.dataset.itemId ?? "");
            htmlQuery(spellcastingCollectionEl, "[data-action=spell-attack]")?.addEventListener("click", (event) => {
                entry?.statistic?.check.roll(eventToRollParams(event, { type: "check" }));
            });
        }
    }

    /** Activate listeners of main sheet navigation section */
    #activateNavListeners(html: HTMLElement): void {
        const sheetNavigation = htmlQuery(html, "nav.sheet-navigation");
        if (!sheetNavigation) return;
        const navTitleArea = htmlQuery(sheetNavigation, ":scope > .panel-title");
        const activeTab = htmlQuery(sheetNavigation, "a[data-tab].active");
        if (!(navTitleArea && activeTab)) {
            throw ErrorPF2e("Sheet navigation not found");
        }

        navTitleArea.innerText = game.i18n.localize(activeTab.dataset.tooltip ?? "");
        const manageTabsAnchor = htmlQuery<HTMLAnchorElement>(sheetNavigation, ":scope > a[data-action=manage-tabs]");
        if (manageTabsAnchor) PCSheetTabManager.initialize(this.actor, manageTabsAnchor);

        sheetNavigation.addEventListener("click", (event) => {
            const anchor = htmlClosest(event.target, "a[data-tab]");
            if (anchor) navTitleArea.innerText = game.i18n.localize(anchor.dataset.tooltip ?? "");
        });
    }

    protected override activateClickListener(html: HTMLElement): SheetClickActionHandlers {
        const handlers = super.activateClickListener(html);

        // SIDEBAR

        handlers["rest"] = async (event) => {
            return game.pf2e.actions.restForTheNight({ event, actors: this.actor });
        };

        // MAIN TAB

        handlers["edit-attribute-boosts"] = () => {
            const builder =
                Object.values(this.actor.apps).find((a) => a instanceof AttributeBuilder) ??
                new AttributeBuilder(this.actor);
            return builder.render(true);
        };

        handlers["select-apex-attribute"] = (event) => {
            if (game.pf2e.variantRules.AutomaticBonusProgression.isEnabled(this.actor)) {
                return;
            }
            const attribute = htmlClosest(event.target, "[data-attribute]")?.dataset.attribute;
            if (setHasElement(ATTRIBUTE_ABBREVIATIONS, attribute)) {
                const apexItems = this.actor.inventory.filter((e) => e.system.apex);
                const selection = apexItems.find((e) => e.isInvested && e.system.apex?.attribute === attribute);
                this.actor.updateEmbeddedDocuments(
                    "Item",
                    apexItems.map((e) => ({ _id: e.id, "system.apex.selected": e === selection })),
                );
            }
        };

        handlers["open-compendium"] = (_, actionTarget) => {
            return game.packs.get(actionTarget.dataset.compendium ?? "")?.render(true);
        };

        // ACTIONS

        // Toggle certain weapon traits: currently Double Barrel or Versatile
        handlers["toggle-weapon-trait"] = async (_, button) => {
            if (!(button instanceof HTMLButtonElement)) return;

            const weapon = this.getStrikeFromDOM(button)?.item;
            const trait = button.dataset.trait;
            const errorMessage = "Unexpected failure while toggling weapon trait";

            if (trait === "double-barrel") {
                const selected = !weapon?.system.traits.toggles.doubleBarrel.selected;
                if (!weapon?.traits.has("double-barrel")) throw ErrorPF2e(errorMessage);
                return weapon.system.traits.toggles.update({ trait, selected });
            } else if (trait === "versatile") {
                const baseType = weapon?.system.damage.damageType ?? null;
                const selected =
                    button.classList.contains("selected") || button.value === baseType ? null : button.value;
                const selectionIsValid = objectHasKey(CONFIG.PF2E.damageTypes, selected) || selected === null;
                if (weapon && selectionIsValid) {
                    return weapon.system.traits.toggles.update({ trait, selected });
                }
            }

            throw ErrorPF2e(errorMessage);
        };

        handlers["toggle-trait"] = async (_, button) => {
            const itemId = htmlClosest(button, "[data-item-id]")?.dataset.itemId;
            const item = this.actor.items.get(itemId, { strict: true });
            if (!item.isOfType("action", "feat")) {
                throw ErrorPF2e("Unexpected item retrieved while toggling trait");
            }

            const trait = button.dataset.trait;
            if (trait !== "mindshift") {
                throw ErrorPF2e("Unexpected trait received while toggling");
            }
            const toggle = item.system.traits.toggles[trait];
            if (!toggle) {
                throw ErrorPF2e("Unexpected failure to look up trait toggle");
            }

            return item.system.traits.toggles.update({ trait, selected: !toggle.selected });
        };

        handlers["toggle-exploration"] = async (event) => {
            const actionId = htmlClosest(event.target, "[data-item-id]")?.dataset.itemId;
            if (!actionId) return;

            const exploration = this.actor.system.exploration.filter((id) => this.actor.items.has(id));
            if (!exploration.findSplice((id) => id === actionId)) {
                exploration.push(actionId);
            }

            await this.actor.update({ "system.exploration": exploration });
        };
        handlers["clear-exploration"] = async () => {
            await this.actor.update({ "system.exploration": [] });
        };

        // INVENTORY

        handlers["toggle-invested"] = async (event) => {
            const itemId = htmlClosest(event.target, "[data-item-id]")?.dataset.itemId;
            if (itemId) await this.actor.toggleInvested(itemId);
        };

        // PROFICIENCIES

        handlers["add-attack-proficiency"] = () => {
            return ManageAttackProficiencies.add(this.actor);
        };
        handlers["delete-attack-proficiency"] = (event) => {
            return ManageAttackProficiencies.remove(this.actor, event);
        };

        // FEATS

        handlers["create-feat"] = () => {
            this.actor.createEmbeddedDocuments("Item", [
                {
                    name: game.i18n.localize(CONFIG.PF2E.featCategories.bonus),
                    type: "feat",
                    system: {
                        category: "bonus",
                    },
                },
            ]);
        };

        handlers["browse-feats"] = (_, anchor) => {
            return this.#onClickBrowseFeats(anchor);
        };

        // CRAFTING

        handlers["formula-to-chat"] = async (event) => {
            const uuid = htmlClosest(event.target, "li")?.dataset.itemUuid;
            if (!UUIDUtils.isItemUUID(uuid)) throw ErrorPF2e(`Invalid UUID: ${uuid}`);

            const formula = this.#knownFormulas[uuid];
            if (formula) {
                const item = new ItemProxyPF2e(formula.item.toObject(), { parent: this.actor });
                await item.toMessage(event, { create: true, data: { fromFormula: true } });
            }
        };

        handlers["craft-item"] = async (event, anchor) => {
            const row = htmlClosest(anchor, "li");
            const quantityInput = htmlQuery<HTMLInputElement>(row, "input[data-craft-quantity]");
            const uuid = row?.dataset.itemUuid;
            if (!row || !uuid) return;
            if (!UUIDUtils.isItemUUID(uuid)) throw ErrorPF2e(`Invalid UUID: ${uuid}`);

            const quantity = Number(quantityInput?.value) || 1;
            const formula = this.#knownFormulas[uuid];
            if (!formula) return;
            const prepared = anchor.dataset.prepared;

            // this.#formulaQuantities[formula.uuid] = Math.max(newValue, minBatchSize);
            // this.render();

            if (prepared === "true") {
                const expendedState = anchor.dataset.expendedState;
                if (expendedState === "true") {
                    ui.notifications.warn(game.i18n.localize("PF2E.CraftingTab.Alerts.FormulaExpended"));
                    return;
                }
                const index = row.dataset.itemIndex;
                const entrySelector = row.dataset.entrySelector;
                const craftingEntry = await this.actor.getCraftingEntry(entrySelector ?? "");
                if (!index) return;
                if (!craftingEntry) throw ErrorPF2e("Crafting entry not found");
                return craftingEntry.toggleFormulaExpended(Number(index), uuid);
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
                const itemId = uuid?.split(".").pop() ?? "";
                if (isSpellConsumable(itemId) && formula.item.isOfType("consumable")) {
                    return craftSpellConsumable(formula.item, quantity, this.actor);
                }

                return craftItem(formula.item, quantity, this.actor);
            }

            const difficultyClass: CheckDC = {
                value: formula.dc,
                visible: true,
                scope: "check",
            };

            craft({
                difficultyClass,
                item: formula.item,
                quantity,
                actors: this.actor,
                event,
                free: anchor.dataset.free === "true",
            });
        };

        handlers["toggle-formula-expended"] = async (event) => {
            const row = htmlClosest(event.target, "li");
            if (!row) return;
            const uuid = row.dataset.itemUuid;
            const index = row.dataset.itemIndex;
            const entrySelector = row.dataset.entrySelector;
            if (!uuid || !index || !entrySelector) return;

            const craftingEntry = await this.actor.getCraftingEntry(entrySelector);
            if (!craftingEntry) throw ErrorPF2e("Crafting entry not found");
            await craftingEntry.toggleFormulaExpended(Number(index), uuid);
        };

        handlers["toggle-signature-item"] = async (event) => {
            const row = htmlClosest(event.target, "li");
            if (!row) return;
            const uuid = row.dataset.itemUuid;
            const entrySelector = row.dataset.entrySelector;
            if (!uuid || !entrySelector) return;

            const craftingEntry = await this.actor.getCraftingEntry(entrySelector);
            if (!craftingEntry) throw ErrorPF2e("Crafting entry not found");
            return craftingEntry.toggleSignatureItem(uuid);
        };

        handlers["perform-daily-crafting"] = () => {
            return this.actor.performDailyCrafting();
        };

        handlers["delete-formula"] = async (event) => {
            const uuid = htmlClosest(event.target, "li")?.dataset.itemUuid;
            if (!UUIDUtils.isItemUUID(uuid)) throw ErrorPF2e(`Invalid UUID: ${uuid}`);

            // Render confirmation modal dialog
            const name = this.#knownFormulas[uuid]?.name;
            const content = `<p class="note">${game.i18n.format("PF2E.CraftingTab.RemoveFormulaDialogQuestion", {
                name,
            })}</p>`;
            const title = game.i18n.localize("PF2E.CraftingTab.RemoveFormulaDialogTitle");
            if (event.ctrlKey || (await Dialog.confirm({ title, content }))) {
                const actorFormulas = this.actor.toObject().system.crafting?.formulas ?? [];
                actorFormulas.findSplice((f) => f.uuid === uuid);
                return this.actor.update({ "system.crafting.formulas": actorFormulas });
            }
            return;
        };

        handlers["unprepare-formula"] = async (event) => {
            const itemEl = htmlClosest(event.target, "li");
            const uuid = itemEl?.dataset.itemUuid;
            if (!itemEl || !UUIDUtils.isItemUUID(uuid)) throw ErrorPF2e(`Invalid UUID: ${uuid}`);
            const index = itemEl.dataset.itemIndex;
            const entrySelector = itemEl.dataset.entrySelector;
            if (!index || !entrySelector) return;

            const craftingEntry = await this.actor.getCraftingEntry(entrySelector);
            if (!craftingEntry) throw ErrorPF2e("Crafting entry not found");

            // Render confirmation modal dialog
            const name = this.#knownFormulas[uuid]?.name;
            const question = game.i18n.format("PF2E.CraftingTab.UnprepareFormulaDialogQuestion", { name });
            const content = `<p class="hint">${question}</p>`;
            const title = game.i18n.localize("PF2E.CraftingTab.UnprepareFormulaDialogTitle");
            if (event.ctrlKey || (await Dialog.confirm({ title, content }))) {
                return craftingEntry.unprepareFormula(Number(index), uuid);
            }
        };

        handlers["quick-add-formula"] = async (event) => {
            const uuid = htmlClosest(event?.target, "li")?.dataset.itemUuid;
            if (!UUIDUtils.isItemUUID(uuid)) throw ErrorPF2e(`Invalid UUID: ${uuid}`);

            const craftingFormulas = await this.actor.getCraftingFormulas();
            const formula = craftingFormulas.find((f) => f.uuid === uuid);
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
        };

        const adjustCraftQuantity = async (_: MouseEvent, anchor: HTMLElement) => {
            const row = htmlClosest(anchor, "li");
            const quantityInput = htmlQuery<HTMLInputElement>(row, "input[data-craft-quantity]");
            const uuid = row?.dataset.itemUuid;
            if (!row || !quantityInput || !uuid) return;

            const formula = this.#knownFormulas[uuid];
            const index = row.dataset.itemIndex;
            const entrySelector = row.dataset.entrySelector;
            const currentQuantity = Number(quantityInput.value) || 0;

            if (index && entrySelector) {
                const craftingEntry = await this.actor.getCraftingEntry(entrySelector);
                if (!craftingEntry) throw ErrorPF2e("Crafting entry not found");
                const direction = anchor.dataset.action === "increase-craft-quantity" ? "increase" : "decrease";
                return craftingEntry.setFormulaQuantity(Number(index), uuid ?? "", direction);
            }

            const minBatchSize = formula.minimumBatchSize;
            const step = anchor.dataset.action === "increase-craft-quantity" ? minBatchSize : -minBatchSize;
            const newQuantity = Math.max(currentQuantity + step, 1);
            if (newQuantity === currentQuantity) return;
            this.#formulaQuantities[formula.uuid] = Math.max(newQuantity, minBatchSize);
            this.render();
        };

        handlers["increase-craft-quantity"] = adjustCraftQuantity;
        handlers["decrease-craft-quantity"] = adjustCraftQuantity;

        // BIOGRAPHY

        // Section visibility toggles
        handlers["toggle-bio-visibility"] = (event): Promise<unknown> | void => {
            const anchor = htmlClosest(event.target, "a[data-action=toggle-bio-visibility");
            const section = anchor?.dataset.section;
            if (tupleHasValue(["appearance", "backstory", "personality", "campaign"], section)) {
                const { biography } = this.actor.system.details;
                const path = `system.details.biography.visibility.${section}`;
                return this.actor.update({ [path]: !biography.visibility[section] });
            }
        };

        // Edicts and anathema
        handlers["add-edict-anathema"] = (_, anchor) => {
            anchor.style.pointerEvents = "none";
            const field = htmlClosest(anchor, "[data-field]")?.dataset.field;
            if (!tupleHasValue(["edicts", "anathema"], field)) {
                throw ErrorPF2e("Unexpected error adding edicts or anathema");
            }
            const list = this.actor._source.system.details.biography[field];
            return this.actor.update({ [`system.details.biography.${field}`]: [...list, ""] });
        };
        handlers["delete-edict-anathema"] = (_, anchor) => {
            anchor.style.pointerEvents = "none";
            const field = htmlClosest(anchor, "[data-field]")?.dataset.field;
            const index = anchor.dataset.index ?? "";
            if (!tupleHasValue(["edicts", "anathema"], field) || !/^\d+$/.test(index)) {
                throw ErrorPF2e("Unexpected error adding edicts or anathema");
            }
            const list = [...this.actor._source.system.details.biography[field]];
            list.splice(Number(index), 1);
            return this.actor.update({ [`system.details.biography.${field}`]: list });
        };

        return handlers;
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
        const blastList = htmlQuery(panel, "ol[data-elemental-blasts]");
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
                    traits.selected.push(fu.deepClone(trait));
                }
            } else if (filterType === "conjunction" && (value === "and" || value === "or")) {
                filter.multiselects.traits.conjunction = value;
            }
        }

        return featTab.open(filter);
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
        if (newValue !== fu.getProperty(item, propertyKey)) {
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

    protected override async _onDropItem(event: DragEvent, data: DropCanvasItemDataPF2e): Promise<ItemPF2e[]> {
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

    override async _onDrop(event: DragEvent): Promise<boolean | void> {
        const dropData = TextEditor.getDragEventData(event);
        if (R.isObject(dropData.pf2e) && dropData.pf2e.type === "CraftingFormula") {
            const dropEntrySelector = typeof dropData.entrySelector === "string" ? dropData.entrySelector : null;
            if (!dropEntrySelector) {
                // Prepare formula if dropped on a crafting entry.
                const containerEl = htmlClosest(event.target, ".item-container");
                if (containerEl?.dataset.containerType === "craftingEntry") {
                    const entrySelector = containerEl.dataset.entrySelector ?? "";
                    const craftingEntry = await this.actor.getCraftingEntry(entrySelector);
                    if (!craftingEntry) return;

                    const craftingFormulas = await this.actor.getCraftingFormulas();
                    const uuid = dropData.uuid;
                    const formula = craftingFormulas.find((f) => f.uuid === uuid);

                    if (formula) craftingEntry.prepareFormula(formula);
                    return;
                }
            }
            const uuid = dropData.uuid;
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
            const formulas = fu.deepClone(entry.preparedFormulaData);
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
    protected override async _onSortItem(event: DragEvent, itemData: ItemSourcePF2e): Promise<ItemPF2e[]> {
        const item = this.actor.items.get(itemData._id!);
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

        return super._onSortItem(event, itemData);
    }

    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // Collect edicts and anathema, reconstruct arrays
        for (const field of ["edicts", "anathema"] as const) {
            const keys = Array.fromRange(this.actor._source.system.details.biography[field].length).map(
                (i) => `system.details.biography.${field}.${i}`,
            );
            const lines = keys.map((k) => String(formData[k] ?? "").trim());
            for (const key of keys) {
                delete formData[key];
            }
            if (lines.length > 0) formData[`system.details.biography.${field}`] = lines;
        }

        return super._updateObject(event, formData);
    }
}

interface CharacterSheetPF2e<TActor extends CharacterPF2e> extends CreatureSheetPF2e<TActor> {
    getStrikeFromDOM(target: HTMLElement): CharacterStrike | null;
}

type CharacterSheetOptions = ActorSheetOptions;

type CharacterSystemSheetData = CharacterSystemData & {
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
type SpellcastingTabSlug = "known-spells" | "rituals" | "activations";

interface CharacterSheetData<TActor extends CharacterPF2e = CharacterPF2e> extends CreatureSheetData<TActor> {
    abpEnabled: boolean;
    ancestry: AncestryPF2e<CharacterPF2e> | null;
    heritage: HeritagePF2e<CharacterPF2e> | null;
    background: BackgroundPF2e<CharacterPF2e> | null;
    attributeBoostsAllocated: boolean;
    biography: CharacterBiography;
    class: ClassPF2e<CharacterPF2e> | null;
    numberToRank: Record<ZeroToFour, string>;
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
    languages: LanguageSheetData[];
    magicTraditions: Record<MagicTradition, string>;
    martialProficiencies: Record<"attacks" | "defenses", Record<string, MartialProficiency>>;
    options: CharacterSheetOptions;
    preparationType: Object;
    showPFSTab: boolean;
    spellCollectionGroups: Record<SpellcastingTabSlug, SpellcastingSheetData[]>;
    hasNormalSpellcasting: boolean;
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
    senses: Sense[];
    speeds: SpeedSheetData[];
}

type LanguageSheetData = {
    slug: Language | null;
    label: string;
    tooltip: string | null;
    overLimit: boolean;
};

interface SpeedSheetData {
    slug: string;
    icon: string;
    action: string | null;
    label: string;
    value: number | null;
    breakdown: string | null;
}

interface ActionSheetData {
    id: string;
    name: string;
    img: string;
    glyph: string | null;
    actionCost: ActionCost | null;
    frequency: Frequency | null;
    feat: FeatPF2e | null;
    toggles: TraitToggleViewData[];
    exploration?: {
        active: boolean;
    };
    hasEffect: boolean;
}

interface ClassDCSheetData extends ClassDCData {
    icon: string;
    hover: string;
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
