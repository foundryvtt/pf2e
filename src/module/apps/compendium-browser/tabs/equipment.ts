import { CoinsPF2e } from "@item/physical/helpers.ts";
import { MAGIC_TRADITIONS } from "@item/spell/values.ts";
import { localizer, sluggify } from "@util";
import * as R from "remeda";
import { ContentTabName } from "../data.ts";
import { CompendiumBrowser } from "../index.ts";
import { CompendiumBrowserTab } from "./base.ts";
import { CompendiumBrowserIndexData, EquipmentFilters, RangesInputData } from "./data.ts";

export class CompendiumBrowserEquipmentTab extends CompendiumBrowserTab {
    tabName: ContentTabName = "equipment";
    filterData: EquipmentFilters;
    templatePath = "systems/pf2e/templates/compendium-browser/partials/equipment.hbs";

    /* MiniSearch */
    override searchFields = ["name", "originalName"];
    override storeFields = [
        "type",
        "name",
        "img",
        "uuid",
        "level",
        "category",
        "group",
        "price",
        "priceInCopper",
        "traits",
        "rarity",
        "source",
    ];

    #localizeCoins = localizer("PF2E.CurrencyAbbreviations");

    constructor(browser: CompendiumBrowser) {
        super(browser);

        // Set the filterData object of this tab
        this.filterData = this.prepareFilterData();
    }

    protected override async loadData(): Promise<void> {
        console.debug("PF2e System | Compendium Browser | Started loading inventory items");

        const inventoryItems: CompendiumBrowserIndexData[] = [];
        const itemTypes = ["weapon", "shield", "armor", "equipment", "consumable", "treasure", "backpack", "kit"];
        // Define index fields for different types of equipment

        const baseFields = ["img", "system.price", "system.traits", "system.publication", "system.source"];
        const physicalItemFields = [...baseFields, "system.level.value"];
        const runedItemFields = [...physicalItemFields, "system.runes"];
        const armorAndWeaponFields = [...runedItemFields, "system.category", "system.group"];
        const indexFields = R.uniq([...armorAndWeaponFields]).sort();
        const publications = new Set<string>();

        for await (const { pack, index } of this.browser.packLoader.loadPacks(
            "Item",
            this.browser.loadedPacks("equipment"),
            indexFields,
        )) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const itemData of index) {
                if (itemData.type === "treasure" && itemData.system.stackGroup === "coins") continue;
                if (itemTypes.includes(itemData.type)) {
                    const skip = (() => {
                        switch (itemData.type) {
                            case "armor":
                            case "weapon":
                                return !this.hasAllIndexFields(itemData, armorAndWeaponFields);
                            case "kit":
                                return !this.hasAllIndexFields(itemData, baseFields);
                            case "shield":
                                return !this.hasAllIndexFields(itemData, runedItemFields);
                            default:
                                return !this.hasAllIndexFields(itemData, physicalItemFields);
                        }
                    })();
                    if (skip) {
                        console.warn(
                            `Item '${itemData.name}' does not have all required data fields. Consider unselecting pack '${pack.metadata.label}' in the compendium browser settings.`,
                        );
                        continue;
                    }

                    // Store price as a number for better sorting (note: we may be dealing with old data, convert if needed)
                    const priceValue = itemData.system.price.value;
                    const priceCoins =
                        typeof priceValue === "string" ? CoinsPF2e.fromString(priceValue) : new CoinsPF2e(priceValue);
                    const coinValue = priceCoins.copperValue;

                    // Prepare publication source
                    const { system } = itemData;
                    const pubSource = String(system.publication?.title ?? system.source?.value ?? "").trim();
                    const sourceSlug = sluggify(pubSource);
                    if (pubSource) publications.add(pubSource);

                    // Infer magical trait from runes
                    const traits = itemData.system.traits.value ?? [];
                    const runes = itemData.system.runes;
                    const traditionTraits: Set<string> = MAGIC_TRADITIONS;
                    if (
                        !traits.some((t: string) => traditionTraits.has(t)) &&
                        ["armor", "shield", "weapon"].includes(itemData.type) &&
                        (runes.potency || runes.reinforcing || runes.resilient || runes.striking)
                    ) {
                        traits.push("magical");
                    }

                    inventoryItems.push({
                        type: itemData.type,
                        name: itemData.name,
                        originalName: itemData.originalName, // Added by Babele
                        img: itemData.img,
                        uuid: itemData.uuid,
                        level: itemData.system.level?.value ?? 0,
                        category: itemData.system.category ?? "",
                        group: itemData.system.group ?? "",
                        price: priceCoins,
                        priceInCopper: coinValue,
                        traits: R.uniq(itemData.system.traits.value),
                        rarity: itemData.system.traits.rarity,
                        source: sourceSlug,
                    });
                }
            }
        }

        // Set indexData
        this.indexData = inventoryItems;

        // Filters
        this.filterData.checkboxes.armorTypes.options = this.generateCheckboxOptions(CONFIG.PF2E.armorCategories);
        fu.mergeObject(
            this.filterData.checkboxes.armorTypes.options,
            this.generateCheckboxOptions(CONFIG.PF2E.armorGroups),
        );
        this.filterData.checkboxes.weaponTypes.options = this.generateCheckboxOptions(CONFIG.PF2E.weaponCategories);
        fu.mergeObject(
            this.filterData.checkboxes.weaponTypes.options,
            this.generateCheckboxOptions(CONFIG.PF2E.weaponGroups),
        );

        this.filterData.multiselects.traits.options = this.generateMultiselectOptions({
            ...CONFIG.PF2E.armorTraits,
            ...CONFIG.PF2E.consumableTraits,
            ...CONFIG.PF2E.equipmentTraits,
            ...CONFIG.PF2E.shieldTraits,
            ...CONFIG.PF2E.weaponTraits,
        });

        this.filterData.checkboxes.itemTypes.options = this.generateCheckboxOptions({
            weapon: "TYPES.Item.weapon",
            shield: "TYPES.Item.shield",
            armor: "TYPES.Item.armor",
            equipment: "TYPES.Item.equipment",
            consumable: "TYPES.Item.consumable",
            treasure: "TYPES.Item.treasure",
            backpack: "TYPES.Item.backpack",
            kit: "TYPES.Item.kit",
        });
        this.filterData.checkboxes.rarity.options = this.generateCheckboxOptions(CONFIG.PF2E.rarityTraits, false);
        this.filterData.checkboxes.source.options = this.generateSourceCheckboxOptions(publications);

        console.debug("PF2e System | Compendium Browser | Finished loading inventory items");
    }

    protected override filterIndexData(entry: CompendiumBrowserIndexData): boolean {
        const { checkboxes, multiselects, ranges, sliders } = this.filterData;

        // Level
        if (!(entry.level >= sliders.level.values.min && entry.level <= sliders.level.values.max)) return false;
        // Price
        if (!(entry.priceInCopper >= ranges.price.values.min && entry.priceInCopper <= ranges.price.values.max))
            return false;
        // Item type
        if (checkboxes.itemTypes.selected.length > 0 && !checkboxes.itemTypes.selected.includes(entry.type)) {
            return false;
        }
        // Armor
        if (
            checkboxes.armorTypes.selected.length > 0 &&
            !this.arrayIncludes(checkboxes.armorTypes.selected, [entry.category, entry.group])
        ) {
            return false;
        }
        // Weapon categories
        if (
            checkboxes.weaponTypes.selected.length > 0 &&
            !this.arrayIncludes(checkboxes.weaponTypes.selected, [entry.category, entry.group])
        ) {
            return false;
        }
        // Traits
        if (!this.filterTraits(entry.traits, multiselects.traits.selected, multiselects.traits.conjunction))
            return false;
        // Source
        if (checkboxes.source.selected.length > 0 && !checkboxes.source.selected.includes(entry.source)) {
            return false;
        }
        // Rarity
        if (checkboxes.rarity.selected.length > 0 && !checkboxes.rarity.selected.includes(entry.rarity)) {
            return false;
        }
        return true;
    }

    override parseRangeFilterInput(name: string, lower: string, upper: string): RangesInputData["values"] {
        if (name === "price") {
            const coins = {
                cp: this.#localizeCoins("cp"),
                sp: this.#localizeCoins("sp"),
                gp: this.#localizeCoins("gp"),
                pp: this.#localizeCoins("pp"),
            };
            for (const [english, translated] of Object.entries(coins)) {
                lower = lower.replaceAll(translated, english);
                upper = upper.replaceAll(translated, english);
            }
            return {
                min: CoinsPF2e.fromString(lower).copperValue,
                max: CoinsPF2e.fromString(upper).copperValue,
                inputMin: lower,
                inputMax: upper,
            };
        }

        return super.parseRangeFilterInput(name, lower, upper);
    }

    protected override prepareFilterData(): EquipmentFilters {
        return {
            checkboxes: {
                itemTypes: {
                    isExpanded: true,
                    label: "PF2E.BrowserFilterInventoryTypes",
                    options: {},
                    selected: [],
                },
                rarity: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterRarities",
                    options: {},
                    selected: [],
                },
                armorTypes: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterArmorFilters",
                    options: {},
                    selected: [],
                },
                weaponTypes: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterWeaponFilters",
                    options: {},
                    selected: [],
                },
                source: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterSource",
                    options: {},
                    selected: [],
                },
            },
            multiselects: {
                traits: {
                    conjunction: "and",
                    label: "PF2E.BrowserFilterTraits",
                    options: [],
                    selected: [],
                },
            },
            order: {
                by: "level",
                direction: "asc",
                options: {
                    name: "Name",
                    level: "PF2E.LevelLabel",
                    price: "PF2E.PriceLabel",
                },
            },
            ranges: {
                price: {
                    changed: false,
                    isExpanded: false,
                    label: "PF2E.PriceLabel",
                    values: {
                        min: 0,
                        max: 20_000_000,
                        inputMin: `0${this.#localizeCoins("cp")}`,
                        inputMax: `200,000${this.#localizeCoins("gp")}`,
                    },
                },
            },
            sliders: {
                level: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterLevels",
                    values: {
                        lowerLimit: 0,
                        upperLimit: 30,
                        min: 0,
                        max: 30,
                        step: 1,
                    },
                },
            },
            search: {
                text: "",
            },
        };
    }
}
