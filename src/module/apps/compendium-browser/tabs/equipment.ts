import { CoinsPF2e } from "@item/physical/helpers";
import { LocalizePF2e } from "@system/localize";
import { sluggify } from "@util";
import { CompendiumBrowser } from "..";
import { CompendiumBrowserTab } from "./base";
import { EquipmentFilters, RangesData } from "./data";

export class CompendiumBrowserEquipmentTab extends CompendiumBrowserTab {
    override filterData!: EquipmentFilters;

    constructor(browser: CompendiumBrowser) {
        super(browser, "equipment");

        // Set the filterData object of this tab
        this.prepareFilterData();
    }

    protected override async loadData() {
        console.debug("PF2e System | Compendium Browser | Started loading inventory items");

        const inventoryItems: CompendiumIndexData[] = [];
        const itemTypes = ["weapon", "armor", "equipment", "consumable", "treasure", "backpack", "kit"];
        // Define index fields for different types of equipment
        const kitFields = ["img", "data.price", "data.traits"];
        const baseFields = [...kitFields, "data.stackGroup", "data.level.value", "data.source.value"];
        const armorAndWeaponFields = [...baseFields, "data.category", "data.group"];
        const consumableFields = [...baseFields, "data.consumableType.value"];
        const indexFields = [
            ...new Set([...armorAndWeaponFields, ...consumableFields]),
            "data.denomination.value",
            "data.value.value",
        ];
        const sources: Set<string> = new Set();

        for await (const { pack, index } of this.browser.packLoader.loadPacks(
            "Item",
            this.browser.loadedPacks("equipment"),
            indexFields
        )) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const itemData of index) {
                if (itemData.type === "treasure" && itemData.data.stackGroup === "coins") continue;
                if (itemTypes.includes(itemData.type)) {
                    let skip = false;
                    if (itemData.type === "weapon" || itemData.type === "armor") {
                        if (!this.hasAllIndexFields(itemData, armorAndWeaponFields)) skip = true;
                    } else if (itemData.type === "kit") {
                        if (!this.hasAllIndexFields(itemData, kitFields)) skip = true;
                    } else if (itemData.type === "consumable") {
                        if (!this.hasAllIndexFields(itemData, consumableFields)) skip = true;
                    } else {
                        if (!this.hasAllIndexFields(itemData, baseFields)) skip = true;
                    }
                    if (skip) {
                        console.warn(
                            `Item '${itemData.name}' does not have all required data fields. Consider unselecting pack '${pack.metadata.label}' in the compendium browser settings.`
                        );
                        continue;
                    }

                    // Store price as a number for better sorting (note: we may be dealing with old data, convert if needed)
                    const priceValue = itemData.data.price.value;
                    const priceCoins =
                        typeof priceValue === "string" ? CoinsPF2e.fromString(priceValue) : new CoinsPF2e(priceValue);
                    const coinValue = priceCoins.copperValue;

                    // add item.type into the correct format for filtering
                    itemData.data.itemTypes = { value: itemData.type };
                    itemData.data.rarity = itemData.data.traits.rarity;
                    itemData.filters = {};

                    // Prepare source
                    const source = itemData.data.source.value;
                    if (source) {
                        sources.add(source);
                        itemData.data.source.value = sluggify(source);
                    }

                    inventoryItems.push({
                        _id: itemData._id,
                        type: itemData.type,
                        name: itemData.name,
                        img: itemData.img,
                        compendium: pack.collection,
                        level: itemData.data.level?.value ?? 0,
                        category: itemData.data.category ?? "",
                        group: itemData.data.group ?? "",
                        price: priceCoins,
                        priceInCopper: coinValue,
                        traits: itemData.data.traits.value,
                        rarity: itemData.data.traits.rarity,
                        source: itemData.data.source.value,
                    });
                }
            }
        }

        // Set indexData
        this.indexData = inventoryItems;

        // Filters
        this.filterData.checkboxes.armorTypes.options = this.generateCheckboxOptions(CONFIG.PF2E.armorTypes);
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
            weapon: "ITEM.TypeWeapon",
            armor: "ITEM.TypeArmor",
            equipment: "ITEM.TypeEquipment",
            consumable: "ITEM.TypeConsumable",
            treasure: "ITEM.TypeTreasure",
            backpack: "ITEM.TypeBackpack",
            kit: "ITEM.TypeKit",
        });
        this.filterData.checkboxes.rarity.options = this.generateCheckboxOptions(CONFIG.PF2E.rarityTraits, false);
        this.filterData.checkboxes.source.options = this.generateSourceCheckboxOptions(sources);

        console.debug("PF2e System | Compendium Browser | Finished loading inventory items");
    }

    protected override filterIndexData(entry: CompendiumIndexData): boolean {
        const { checkboxes, multiselects, ranges, search, sliders } = this.filterData;

        // Level
        if (!(entry.level >= sliders.level.values.min && entry.level <= sliders.level.values.max)) return false;
        // Price
        if (!(entry.priceInCopper >= ranges.price.values.min && entry.priceInCopper <= ranges.price.values.max))
            return false;
        // Name
        if (search.text) {
            if (!entry.name.toLocaleLowerCase(game.i18n.lang).includes(search.text.toLocaleLowerCase(game.i18n.lang)))
                return false;
        }
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
        // Weapons
        if (
            checkboxes.weaponTypes.selected.length > 0 &&
            !this.arrayIncludes(checkboxes.weaponTypes.selected, [entry.category, entry.group])
        ) {
            return false;
        }
        // Traits
        if (
            multiselects.traits.selected.length > 0 &&
            !this.arrayIncludes(
                multiselects.traits.selected.map((s) => s.value),
                entry.traits
            )
        ) {
            return false;
        }
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
            const coins = LocalizePF2e.translations.PF2E.CurrencyAbbreviations;
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

    protected override prepareFilterData(): void {
        const coins = LocalizePF2e.translations.PF2E.CurrencyAbbreviations;
        this.filterData = {
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
                    label: "PF2E.BrowserFilterTraits",
                    options: [],
                    selected: [],
                },
            },
            order: {
                by: "name",
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
                        inputMin: `0${coins.cp}`,
                        inputMax: `200,000${coins.gp}`,
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
