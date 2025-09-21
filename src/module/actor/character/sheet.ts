import { CreatureSheetData, Language, ResourceData } from "@actor/creature/index.ts";
import type { Sense } from "@actor/creature/sense.ts";
import { isReallyPC } from "@actor/helpers.ts";
import { MODIFIER_TYPES, createProficiencyModifier } from "@actor/modifiers.ts";
import type { SheetClickActionHandlers } from "@actor/sheet/base.ts";
import type { AbilityViewData, InventoryItem } from "@actor/sheet/data-types.ts";
import { condenseSenses, createAbilityViewData } from "@actor/sheet/helpers.ts";
import type { AttributeString, SaveType, SkillSlug } from "@actor/types.ts";
import { ATTRIBUTE_ABBREVIATIONS } from "@actor/values.ts";
import type { ActorSheetOptions } from "@client/appv1/sheets/actor-sheet.d.mts";
import type { ImageFilePath } from "@common/constants.d.mts";
import type {
    AncestryPF2e,
    BackgroundPF2e,
    ClassPF2e,
    DeityPF2e,
    FeatPF2e,
    HeritagePF2e,
    PhysicalItemPF2e,
} from "@item";
import { ItemPF2e, ItemProxyPF2e } from "@item";
import { TraitToggleViewData } from "@item/ability/trait-toggles.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { isSpellConsumable } from "@item/consumable/spell-consumables.ts";
import { CoinsPF2e } from "@item/physical/coins.ts";
import type { MagicTradition } from "@item/spell/types.ts";
import type { SpellcastingSheetData } from "@item/spellcasting-entry/types.ts";
import type { BaseWeaponType, WeaponGroup } from "@item/weapon/types.ts";
import { WEAPON_CATEGORIES } from "@item/weapon/values.ts";
import { DropCanvasItemDataPF2e } from "@module/canvas/drop-canvas-data.ts";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { createUseActionMessage } from "@module/chat-message/helpers.ts";
import type { LabeledValueAndMax, ZeroToFour } from "@module/data.ts";
import { eventToRollMode, eventToRollParams } from "@module/sheet/helpers.ts";
import { craft } from "@system/action-macros/crafting/craft.ts";
import type { DamageType } from "@system/damage/types.ts";
import type { CheckDC } from "@system/degree-of-success.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import {
    ErrorPF2e,
    fontAwesomeIcon,
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
import { createTooltipster } from "@util/destroyables.ts";
import { UUIDUtils } from "@util/uuid.ts";
import * as R from "remeda";
import { CreatureSheetPF2e } from "../creature/sheet.ts";
import { ManageAttackProficiencies } from "../sheet/popups/manage-attack-proficiencies.ts";
import { ABCPicker } from "./apps/abc-picker/app.ts";
import { AttributeBuilder } from "./apps/attribute-builder.ts";
import { FormulaPicker } from "./apps/formula-picker/app.ts";
import { AutomaticBonusProgression } from "./automatic-bonus-progression.ts";
import { CharacterConfig } from "./config.ts";
import type { CraftingAbilitySheetData } from "./crafting/ability.ts";
import { CraftingFormula, craftItem, craftSpellConsumable } from "./crafting/index.ts";
import {
    CharacterBiography,
    CharacterSaveData,
    CharacterSkillData,
    CharacterStrike,
    CharacterSystemData,
    ClassDCData,
    MartialProficiency,
} from "./data.ts";
import type { CharacterPF2e } from "./document.ts";
import { ElementalBlast, ElementalBlastConfig } from "./elemental-blast.ts";
import type { FeatBrowserFilterProps, FeatGroup } from "./feats/index.ts";
import { getItemProficiencyRank } from "./helpers.ts";
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
            for (const key of Object.keys(sheetData.data.proficiencies[section])) {
                const proficiency = sheetData.data.proficiencies[section][key];
                if (!proficiency?.visible || (proficiency?.rank === 0 && !proficiency.custom)) {
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

        // Header resource pip. Show mythic points instead if available
        const resources = this.actor.system.resources;
        const headerResource = this.actor.getResource(resources.mythicPoints.max > 0 ? "mythic-points" : "hero-points");
        sheetData.headerResource = {
            ...headerResource,
            icon: headerResource?.slug === "mythic-points" ? "fa-circle-m" : "fa-hospital-symbol",
        };

        // Indicate whether the PC has all attribute boosts allocated
        sheetData.attributeBoostsAllocated = ((): boolean => {
            const build = actor.system.build;
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
            R.groupBy(await this.prepareSpellcasting(), (a) => {
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

        sheetData.crafting = await this.#prepareCrafting();

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
        ) as Record<SkillSlug, CharacterSkillData>;

        sheetData.tabVisibility = fu.deepClone(actor.flags.pf2e.sheetTabs);

        // Enrich content
        const rollData = actor.getRollData();
        const biography = (sheetData.biography = actor.system.details.biography);
        const enrichmentOptions = { rollData, secrets: actor.isOwner, async: true };
        const enrichPromises = {
            appearance: TextEditorPF2e.enrichHTML(biography.appearance, enrichmentOptions),
            backstory: TextEditorPF2e.enrichHTML(biography.backstory, enrichmentOptions),
            campaignNotes: TextEditorPF2e.enrichHTML(biography.campaignNotes, enrichmentOptions),
            allies: TextEditorPF2e.enrichHTML(biography.allies, enrichmentOptions),
            enemies: TextEditorPF2e.enrichHTML(biography.enemies, enrichmentOptions),
            organizations: TextEditorPF2e.enrichHTML(biography.organizations, enrichmentOptions),
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
        sheetData.speeds = R.keys(speedIcons).map((slug): SpeedSheetData => {
            const speeds = this.actor.system.movement.speeds;
            const data = speeds[slug];
            return {
                slug,
                icon: fontAwesomeIcon(speedIcons[slug]).outerHTML,
                action: ["swim", "climb"].includes(slug) && !data?.value ? slug : null,
                label: `PF2E.Actor.Speed.Type.${slug.capitalize()}`,
                value: data?.value ?? null,
                breakdown: data?.breakdown ?? null,
            };
        });

        return sheetData;
    }

    /** Prepares all ability-type items that create an action in the sheet */
    #prepareAbilities(): CharacterSheetData["actions"] {
        const result: CharacterSheetData["actions"] = {
            encounter: {
                action: { label: game.i18n.localize("PF2E.ActionsActionsHeader"), actions: [] },
                reaction: { label: game.i18n.localize("PF2E.ActionsReactionsHeader"), actions: [] },
                free: { label: game.i18n.localize("PF2E.ActionsFreeActionsHeader"), actions: [] },
            },
            exploration: { active: [], other: [] },
            downtime: [],
        };

        const actor = this.actor;
        const elementalBlasts = actor.itemTypes.action.filter((i) => i.slug === "elemental-blast");

        for (const item of actor.items) {
            if (!item.isOfType("action") && !(item.isOfType("feat") && item.actionCost)) {
                continue;
            }

            // Skip suppressed items
            if (item.suppressed) continue;

            // KINETICIST HARD CODE: Show elemental blasts alongside strikes instead of among other actions
            // If the user added additional blasts manually, show the duplicates normally
            if (actor.flags.pf2e.kineticist && item === elementalBlasts[0]) {
                continue;
            }

            const baseData = createAbilityViewData(item);
            const action: CharacterAbilityViewData = {
                ...baseData,
                img: ((): ImageFilePath => {
                    const actionIcon = getActionIcon(item.actionCost);
                    const defaultIcon = ItemPF2e.getDefaultArtwork(item._source).img;
                    const commonFeatIcon = "icons/sundries/books/book-red-exclamation.webp";
                    const isDefaultImage = [actionIcon, defaultIcon, commonFeatIcon].includes(item.img);
                    if (item.isOfType("action") && !isDefaultImage) {
                        return item.img;
                    }
                    return item.system.selfEffect?.img ?? (baseData.usable && !isDefaultImage ? item.img : actionIcon);
                })(),
                feat: item.isOfType("feat") ? item : null,
                toggles: item.system.traits.toggles?.getSheetData() ?? [],
            };

            const traits = item.system.traits.value;
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

    async #prepareCrafting(): Promise<CraftingSheetData> {
        const actor = this.actor;
        const flags = actor.flags.pf2e;

        // Set up the cache of known formulas on the actor for use on sheet events
        // These formulas include any modified batch size.
        const formulas = await actor.crafting.getFormulas();
        this.#knownFormulas = R.mapToObj(formulas, (f) => [f.uuid, f]);
        const sheetFormulas = formulas.map((f) => ({
            uuid: f.uuid,
            item: f.item,
            dc: f.dc,
            batchSize: this.#formulaQuantities[f.uuid] ?? f.batchSize,
            cost: CoinsPF2e.fromPrice(f.item.price, this.#formulaQuantities[f.uuid] ?? f.batchSize),
        }));
        const knownFormulas = R.pipe(
            sheetFormulas,
            R.groupBy((f) => f.item.level),
            R.entries(),
            R.reverse(),
            R.map((f) => ({ level: f[0], formulas: f[1] })),
        );

        const abilities = this.actor.crafting.abilities;
        const sheetData = await Promise.all(abilities.map((e) => e.getSheetData()));

        return {
            noCost: flags.freeCrafting,
            hasQuickAlchemy:
                abilities.some((a) => a.isAlchemical) &&
                !!(actor.rollOptions.all["feature:quick-alchemy"] || actor.rollOptions.all["feat:quick-alchemy"]),
            hasDailyCrafting: this.actor.crafting.abilities.some((a) => a.isDailyPrep || a.isAlchemical),
            dailyCraftingComplete: !!this.actor.flags.pf2e.dailyCraftingComplete,
            abilities: {
                spontaneous: sheetData.filter((s) => !s.isPrepared),
                prepared: sheetData.filter((s) => !s.isAlchemical && s.isPrepared),
                alchemical: {
                    entries: sheetData.filter((s) => s.isAlchemical),
                    resource: actor.getResource("infused-reagents"),
                    resourceCost: sheetData.filter((s) => s.isAlchemical).reduce((sum, a) => sum + a.resourceCost, 0),
                },
            },
            knownFormulas,
        };
    }

    protected override prepareInventoryItem(item: PhysicalItemPF2e): InventoryItem {
        const data = super.prepareInventoryItem(item);
        data.isInvestable = !item.isStowed && item.isIdentified && item.isInvested !== null;

        // If armor is equipped, and can be invested, hint at the user that it should be invested
        const actor = this.actor;
        const invested = actor.inventory.invested;
        const canInvest = invested && invested.value < invested.max;
        if (item.isOfType("armor") && getItemProficiencyRank(actor, item) > 0) {
            const isWearingArmor = !!actor.wornArmor;
            if ((item.isEquipped || !isWearingArmor) && !item.isInvested && data.isInvestable && canInvest) {
                data.notifyInvest = true;
            } else if (!isWearingArmor) {
                data.notifyEquip = true;
            }
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
        rollInitiativeLink?.addEventListener("pointerenter", () => {
            this.toggleInitiativeLink();
        });

        $html.find(".adjust-item-stat").on("click contextmenu", (event) => this.#onClickAdjustItemStat(event));
        $html.find(".adjust-item-stat-select").on("change", (event) => this.#onChangeAdjustItemStat(event));

        // MAIN
        const mainPanel = htmlQuery(html, ".tab[data-tab=character]");

        // A(H)BCD context menu
        if (mainPanel && this.isEditable) {
            new fa.ux.ContextMenu(
                mainPanel,
                ".detail-item-control",
                [
                    {
                        name: "PF2E.EditItemTitle",
                        icon: fontAwesomeIcon("edit").outerHTML,
                        callback: (target) => {
                            const itemId = htmlClosest(target, "[data-item-id]")?.dataset.itemId;
                            const item = this.actor.items.get(itemId, { strict: true });
                            item.sheet.render(true, { focus: true });
                        },
                    },
                    {
                        name: "PF2E.DeleteItemTitle",
                        icon: fontAwesomeIcon("trash").outerHTML,
                        callback: (target) => {
                            const itemId = htmlClosest(target, "[data-item-id]")?.dataset.itemId;
                            const item = this.actor.items.get(itemId, { strict: true });
                            this.deleteItem(item);
                        },
                    },
                ],
                {
                    eventName: "click",
                    fixed: true,
                    jQuery: false,
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
            createTooltipster(hoverEl, {
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
                const formula = this.#knownFormulas[row?.dataset.itemUuid ?? ""];
                const minBatchSize = formula.item.system.price.per;
                const newValue = Number(quantity.value) || minBatchSize;
                if (newValue < 1) return;

                const slug = htmlClosest(event?.target, "li")?.dataset.ability;
                if (slug) {
                    const ability = this.actor.crafting.abilities.get(slug, { strict: true });
                    const index = element.dataset.itemIndex;
                    return ability.setFormulaQuantity(Number(index), newValue);
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
        if (manageTabsAnchor) new PCSheetTabManager(this.actor, manageTabsAnchor);

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

        handlers["open-abc-picker"] = async (_event, target) => {
            const itemType = target.dataset.itemType;
            if (!tupleHasValue(["ancestry", "heritage", "background", "class", "deity"], itemType)) {
                throw ErrorPF2e("Unexpected item type");
            }

            new ABCPicker({ actor: this.actor, itemType }).render({ force: true });
        };

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

        handlers["toggle-hide-stowed"] = () => {
            this.actor.update({ "flags.pf2e.hideStowed": !this.actor.flags.pf2e.hideStowed });
        };

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
            const toggle = item.system.traits.toggles?.[trait];
            if (!toggle) {
                throw ErrorPF2e("Unexpected failure to look up trait toggle");
            }

            return item.system.traits.toggles?.update({ trait, selected: !toggle.selected });
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

        handlers["channel-elements"] = async (event) => {
            const abilityItem = this.actor.itemTypes.action.find(
                (i) => i.slug === "channel-elements" && i.system.selfEffect,
            );
            if (abilityItem) await createUseActionMessage(abilityItem, eventToRollMode(event));
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

        handlers["toggle-free-crafting"] = async () => {
            const freeCrafting = !this.actor.flags.pf2e.freeCrafting;
            this.actor.update({ "flags.pf2e.freeCrafting": freeCrafting });
        };

        handlers["prepare-formula"] = (_, anchor) => {
            const actor = this.actor;
            const abilitySlug = htmlClosest(anchor, "[data-ability]")?.dataset.ability;
            const ability = actor.crafting.abilities.get(abilitySlug ?? "", { strict: true });
            new FormulaPicker({ actor, ability, mode: "prepare" }).render({ force: true });
        };

        handlers["craft-item"] = async (event, anchor) => {
            const row = htmlClosest(anchor, "li");
            if (!row) return;

            // Handle ability crafting first if we're crafting for an ability
            const ability = this.actor.crafting.abilities.get(row.dataset.ability ?? "");
            if (ability) {
                const craftParam = ability.isPrepared && row.dataset.itemIndex ? Number(row.dataset.itemIndex) : null;
                const consume = !ability.resource || !!this.actor.getResource(ability.resource)?.value;
                const item = craftParam !== null ? await ability.craft(craftParam, { consume }) : null;
                if (item) {
                    await ChatMessagePF2e.create({
                        author: game.user.id,
                        content: game.i18n.format("PF2E.Actions.Craft.Information.ReceiveItem", {
                            actorName: this.actor.name,
                            itemName: item.name,
                            quantity: 1,
                        }),
                        speaker: { alias: this.actor.name },
                    });
                }

                return;
            }

            // Determine what item and how much we're crafting
            const uuid = row.dataset.itemUuid;
            if (!UUIDUtils.isItemUUID(uuid)) throw ErrorPF2e(`Invalid UUID: ${uuid}`);
            const quantityInput = htmlQuery<HTMLInputElement>(row, "input[data-craft-quantity]");
            const quantity = Number(quantityInput?.value) || 1;
            const formula = this.#knownFormulas[uuid];
            if (!formula) return;

            if (this.actor.flags.pf2e.quickAlchemy) {
                const reagentValue = this.actor.system.resources.crafting.infusedReagents.value - 1;
                if (reagentValue < 0) {
                    ui.notifications.warn("PF2E.Actor.Character.Crafting.MissingResource", { localize: true });
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
            const slug = row.dataset.ability;
            if (!uuid || !index || !slug) return;

            const ability = this.actor.crafting.abilities.get(slug, { strict: true });
            await ability.toggleFormulaExpended(Number(index));
        };

        handlers["toggle-signature-item"] = async (event) => {
            const row = htmlClosest(event.target, "li");
            if (!row) return;
            const uuid = row.dataset.itemUuid;
            const slug = row.dataset.ability;
            if (!uuid || !slug) return;

            const ability = this.actor.crafting.abilities.get(slug, { strict: true });
            return ability.toggleSignatureItem(uuid);
        };

        handlers["perform-daily-crafting"] = () => {
            return this.actor.crafting.performDailyCrafting();
        };

        handlers["reset-daily-crafting"] = () => {
            return this.actor.crafting.resetDailyCrafting();
        };

        handlers["delete-formula"] = async (event) => {
            const uuid = htmlClosest(event.target, "li")?.dataset.itemUuid;
            if (!UUIDUtils.isItemUUID(uuid)) throw ErrorPF2e(`Invalid UUID: ${uuid}`);

            // Render confirmation modal dialog
            const name = this.#knownFormulas[uuid]?.item.name;
            const content = `<p class="note">${game.i18n.format("PF2E.CraftingTab.RemoveFormulaDialogQuestion", {
                name,
            })}</p>`;
            if (
                event.ctrlKey ||
                event.metaKey ||
                (await foundry.applications.api.DialogV2.confirm({
                    window: { title: "PF2E.CraftingTab.RemoveFormulaDialogTitle", icon: "fa-solid fa-trash" },
                    content,
                }))
            ) {
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
            const slug = itemEl.dataset.ability;
            if (!index || !slug) return;

            // Render confirmation modal dialog
            const ability = this.actor.crafting.abilities.get(slug, { strict: true });
            const name = this.#knownFormulas[uuid]?.item.name;
            const question = game.i18n.format("PF2E.CraftingTab.UnprepareFormulaDialogQuestion", { name });
            const content = `<p class="hint">${question}</p>`;
            if (
                event.ctrlKey ||
                (await foundry.applications.api.DialogV2.confirm({
                    window: { title: "PF2E.CraftingTab.UnprepareFormulaDialogTitle" },
                    content,
                }))
            ) {
                return ability.unprepareFormula(Number(index));
            }
        };

        const adjustCraftQuantity = async (_: PointerEvent, anchor: HTMLElement) => {
            const row = htmlClosest(anchor, "li");
            const quantityInput = htmlQuery<HTMLInputElement>(row, "input[data-craft-quantity]");
            const formula = this.#knownFormulas[row?.dataset.itemUuid ?? ""];
            if (!row || !quantityInput || !formula) return;

            const index = row.dataset.itemIndex;
            const slug = row.dataset.ability;
            const currentQuantity = Number(quantityInput.value) || 0;

            if (index && slug) {
                const ability = this.actor.crafting.abilities.get(slug, { strict: true });
                const direction = anchor.dataset.action === "increase-craft-quantity" ? "increase" : "decrease";
                return ability.setFormulaQuantity(Number(index), direction);
            }

            const minBatchSize = formula.item.price.per;
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
        const { effectTraits, damageTypes } = CONFIG.PF2E;
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
            if (!objectHasKey(effectTraits, element)) {
                throw ErrorPF2e("Unexpected error retrieve element");
            }
            if (!objectHasKey(damageTypes, damageType)) {
                throw ErrorPF2e("Unexpected error retrieving damage type");
            }
            const melee = button.dataset.melee === "true";

            switch (button.dataset.action) {
                case "roll-attack": {
                    const mapIncreases = Math.clamp(Number(button.dataset.mapIncreases) || 0, 0, 2);
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
        // Get group and slot and then the relevant filter values
        // If this is for a not-feat-group, we create a custom filter
        const { featFilters, maxLevel } = ((): { featFilters: FeatBrowserFilterProps; maxLevel?: number } => {
            const groupId = htmlClosest(element, "[data-group-id]")?.dataset.groupId;
            if (groupId === "pfs") {
                return { featFilters: { categories: ["pfsboon"] }, maxLevel: this.actor.level };
            } else if (groupId === "intercession") {
                return { featFilters: { categories: ["deityboon", "curse"] } };
            }

            const dataSetLevel = Number(element.dataset.level);
            const featGroup =
                groupId === "bonus" ? this.actor.feats.bonus : this.actor.feats.get(groupId, { strict: true });
            const slot = featGroup.slots[htmlClosest(element, "[data-slot-id]")?.dataset.slotId ?? ""];
            return { featFilters: slot?.filter ?? featGroup.filter, maxLevel: dataSetLevel || featGroup.level };
        })();

        const featTab = game.pf2e.compendiumBrowser.tabs.feat;
        const filter = await featTab.getFilterData();
        filter.traits.conjunction = featFilters?.conjunction ?? "or";

        // Assign levels
        if (typeof maxLevel === "number") {
            const level = filter.level;
            level.to = Math.min(maxLevel, level.max);
            level.isExpanded = level.to !== level.max;
        }

        // Assign categories
        const category = filter.checkboxes.category;
        for (const value of featFilters.categories ?? []) {
            category.isExpanded = true;
            category.options[value].selected = true;
            category.selected.push(value);
        }

        // Assign traits
        const traits = filter.traits;
        const filterTraits = [
            (featFilters?.traits ?? []).map((trait) => ({ trait, not: false })),
            (featFilters?.omitTraits ?? []).map((trait) => ({ trait, not: true })),
        ].flat();
        for (const { trait, not } of filterTraits) {
            const data = traits.options.find((t) => t.value === trait);
            if (data) {
                traits.selected.push({ ...fu.deepClone(data), not });
            }
        }

        return featTab.open({ filter });
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
                    "system.proficiency.value": () => Math.clamp(selectedValue, 0, 4),
                };
                return dispatch[propertyKey]?.();
            } else if (item.isOfType("lore")) {
                return Math.clamp(selectedValue, 0, 4);
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
                    "system.proficiency.value": () => Math.clamp(proficiencyRank + change, 0, 4),
                };
                return dispatch[propertyKey]?.();
            } else if (item.isOfType("lore")) {
                const currentRank = item.system.proficient.value;
                return Math.clamp(currentRank + change, 0, 4);
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
        const dropData = TextEditorPF2e.getDragEventData(event);
        if (R.isPlainObject(dropData.pf2e) && dropData.pf2e.type === "CraftingFormula") {
            const dropAbilitySlug = typeof dropData.ability === "string" ? dropData.ability : null;
            if (!dropAbilitySlug) {
                // Prepare formula if dropped on a crafting entry.
                const containerEl = htmlClosest(event.target, ".item-container");
                if (containerEl?.dataset.containerType === "craftingEntry") {
                    const slug = containerEl.dataset.ability ?? "";
                    const ability = this.actor.crafting.abilities.get(slug);
                    if (!ability) return;

                    ability.prepareFormula(String(dropData.uuid ?? ""));
                    return;
                }
            }
            const uuid = dropData.uuid;
            if (typeof uuid === "string") {
                const formula = this.#knownFormulas[uuid];
                // Sort existing formulas
                if (formula) {
                    const targetUuid = htmlClosest(event.target, "li.formula-item")?.dataset.itemUuid ?? "";
                    return this.#sortFormulas(formula, targetUuid, dropAbilitySlug);
                }
            }
        } else {
            return super._onDrop(event);
        }
    }

    async #sortFormulas(sourceFormula: CraftingFormula, targetUuid: string, slug: string | null): Promise<void> {
        if (!UUIDUtils.isItemUUID(targetUuid)) return;
        if (sourceFormula.uuid === targetUuid) return;

        // Do not allow sorting with different formula level outside of a crafting entry
        const sourceLevel = sourceFormula.item.level;
        const targetLevel = this.#knownFormulas[targetUuid].item.level;
        if (!slug && sourceLevel !== targetLevel) {
            return;
        }

        const ability = slug ? this.actor.crafting.abilities.get(slug, { strict: true }) : null;
        const formulas = fu.deepClone(ability?.preparedFormulaData ?? this.actor.system.crafting.formulas);
        const source = formulas.find((f) => f.uuid === sourceFormula.uuid);
        const target = formulas.find((f) => f.uuid === targetUuid);

        if (source && target) {
            // The true targetIdx shifts after source removal,
            // causing it to be placed after if dragging to a later one.
            const sourceIdx = formulas.indexOf(source);
            const targetIdx = formulas.indexOf(target);
            formulas.splice(sourceIdx, 1);
            formulas.splice(targetIdx, 0, source);

            if (slug) {
                const ability = this.actor.crafting.abilities.get(slug);
                await ability?.updateFormulas(formulas);
            } else {
                await this.actor.update({ "system.crafting.formulas": formulas });
            }
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
    saves: Record<
        SaveType,
        CharacterSaveData & {
            rankName?: string;
            short?: string;
        }
    >;
};

interface FormulaSheetData {
    uuid: string;
    item: ItemPF2e;
    dc: number;
    batchSize: number;
    cost: CoinsPF2e;
}

interface FormulaByLevel {
    level: string;
    formulas: FormulaSheetData[];
}

interface CraftingSheetData {
    noCost: boolean;
    hasQuickAlchemy: boolean;
    hasDailyCrafting: boolean;
    dailyCraftingComplete: boolean;
    knownFormulas: FormulaByLevel[];
    abilities: {
        spontaneous: CraftingAbilitySheetData[];
        prepared: CraftingAbilitySheetData[];
        alchemical: {
            entries: CraftingAbilitySheetData[];
            resource: ResourceData;
            resourceCost: number;
        };
    };
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
    /** The resource to display in the header, usually hero points */
    headerResource: LabeledValueAndMax & { slug: string; icon: string };
    languages: LanguageSheetData[];
    magicTraditions: Record<MagicTradition, string>;
    martialProficiencies: Record<"attacks" | "defenses", Record<string, MartialProficiency>>;
    options: CharacterSheetOptions;
    preparationType: object;
    showPFSTab: boolean;
    spellCollectionGroups: Record<SpellcastingTabSlug, SpellcastingSheetData[]>;
    hasNormalSpellcasting: boolean;
    tabVisibility: CharacterSheetTabVisibility;
    actions: {
        encounter: Record<"action" | "reaction" | "free", { label: string; actions: CharacterAbilityViewData[] }>;
        exploration: {
            active: CharacterAbilityViewData[];
            other: CharacterAbilityViewData[];
        };
        downtime: CharacterAbilityViewData[];
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

interface CharacterAbilityViewData extends AbilityViewData {
    feat: FeatPF2e | null;
    toggles: TraitToggleViewData[];
    exploration?: {
        active: boolean;
    };
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
