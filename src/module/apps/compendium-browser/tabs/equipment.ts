import { CoinsPF2e } from "@item/physical/helpers.ts";
import { localizer, sluggify } from "@util";
import { CompendiumBrowser } from "../index.ts";
import { ContentTabName } from "../data.ts";
import { CompendiumBrowserTab } from "./base.ts";
import { CompendiumBrowserIndexData, EquipmentFilters, RangesData } from "./data.ts";

export class CompendiumBrowserEquipmentTab extends CompendiumBrowserTab {
    tabName: ContentTabName = "equipment";
    filterData: EquipmentFilters;
    templatePath = "systems/pf2e/templates/compendium-browser/partials/equipment.hbs";

    /* MiniSearch */
    override searchFields = ["name"];
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
        const itemTypes = ["weapon", "armor", "equipment", "consumable", "treasure", "backpack", "kit"];
        // Define index fields for different types of equipment
        const kitFields = ["img", "system.price", "system.traits"];
        const baseFields = [...kitFields, "system.stackGroup", "system.level.value", "system.source.value"];
        const armorFields = [...baseFields, "system.category", "system.group", "system.potencyRune.value"];
        const weaponFields = [...armorFields, "system.strikingRune.value", "system.potencyRune.value"];
        const consumableFields = [...baseFields, "system.consumableType.value"];
        const indexFields = [
            ...new Set([...armorFields, ...weaponFields, ...consumableFields]),
            "system.denomination.value",
            "system.value.value",
        ];
        const sources: Set<string> = new Set();

        for await (const { pack, index } of this.browser.packLoader.loadPacks(
            "Item",
            this.browser.loadedPacks("equipment"),
            indexFields
        )) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const itemData of index) {
                if (itemData.type === "treasure" && itemData.system.stackGroup === "coins") continue;
                if (itemTypes.includes(itemData.type)) {
                    const skip = (() => {
                        switch (itemData.type) {
                            case "armor":
                                return !this.hasAllIndexFields(itemData, armorFields);
                            case "weapon":
                                return !this.hasAllIndexFields(itemData, weaponFields);
                            case "kit":
                                return !this.hasAllIndexFields(itemData, kitFields);
                            case "consumable":
                                return !this.hasAllIndexFields(itemData, consumableFields);
                            default:
                                return !this.hasAllIndexFields(itemData, baseFields);
                        }
                    })();
                    if (skip) {
                        console.warn(
                            `Item '${itemData.name}' does not have all required data fields. Consider unselecting pack '${pack.metadata.label}' in the compendium browser settings.`
                        );
                        continue;
                    }

                    // Store price as a number for better sorting (note: we may be dealing with old data, convert if needed)
                    const priceValue = itemData.system.price.value;
                    const priceCoins =
                        typeof priceValue === "string" ? CoinsPF2e.fromString(priceValue) : new CoinsPF2e(priceValue);
                    const coinValue = priceCoins.copperValue;

                    // add item.type into the correct format for filtering
                    itemData.system.itemTypes = { value: itemData.type };
                    itemData.system.rarity = itemData.system.traits.rarity;
                    itemData.filters = {};

                    // Prepare source
                    const source = itemData.system.source.value;
                    const sourceSlug = sluggify(source);
                    if (source) {
                        sources.add(source);
                    }

                    // Infer magical trait from runes
                    const traits = itemData.system.traits.value ?? [];
                    if (
                        (itemData.type === "armor" && itemData.system.potencyRune.value) ||
                        (itemData.type === "weapon" &&
                            (itemData.system.strikingRune.value || itemData.system.potencyRune.value))
                    ) {
                        traits.push("magical");
                    }

                    inventoryItems.push({
                        type: itemData.type,
                        name: itemData.name,
                        img: itemData.img,
                        uuid: `Compendium.${pack.collection}.${itemData._id}`,
                        level: itemData.system.level?.value ?? 0,
                        category: itemData.system.category ?? "",
                        group: itemData.system.group ?? "",
                        price: priceCoins,
                        priceInCopper: coinValue,
                        traits: itemData.system.traits.value,
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
        mergeObject(
            this.filterData.checkboxes.armorTypes.options,
            this.generateCheckboxOptions(CONFIG.PF2E.armorGroups)
        );
        this.filterData.checkboxes.weaponTypes.options = this.generateCheckboxOptions(CONFIG.PF2E.weaponCategories);
        mergeObject(
            this.filterData.checkboxes.weaponTypes.options,
            this.generateCheckboxOptions(CONFIG.PF2E.weaponGroups)
        );

        this.filterData.multiselects.traits.options = this.generateMultiselectOptions({
            ...CONFIG.PF2E.armorTraits,
            ...CONFIG.PF2E.consumableTraits,
            ...CONFIG.PF2E.equipmentTraits,
            ...CONFIG.PF2E.weaponTraits,
        });

        this.filterData.checkboxes.itemtypes.options = this.generateCheckboxOptions({
            weapon: "TYPES.Item.weapon",
            armor: "TYPES.Item.armor",
            equipment: "TYPES.Item.equipment",
            consumable: "TYPES.Item.consumable",
            treasure: "TYPES.Item.treasure",
            backpack: "TYPES.Item.backpack",
            kit: "TYPES.Item.kit",
        });
        this.filterData.checkboxes.rarity.options = this.generateCheckboxOptions(CONFIG.PF2E.rarityTraits, false);
        this.filterData.checkboxes.source.options = this.generateSourceCheckboxOptions(sources);

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
        if (checkboxes.itemtypes.selected.length > 0 && !checkboxes.itemtypes.selected.includes(entry.type)) {
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

    override parseRangeFilterInput(name: string, lower: string, upper: string): RangesData["values"] {
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
                itemtypes: {
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
                    name: "PF2E.BrowserSortyByNameLabel",
                    level: "PF2E.BrowserSortyByLevelLabel",
                    price: "PF2E.BrowserSortyByPriceLabel",
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
