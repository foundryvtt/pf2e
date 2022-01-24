import { coinValueInCopper, extractPriceFromItem } from "@item/treasure/helpers";
import { sluggify } from "@util";
import { CompendiumBrowser } from "..";
import { CompendiumBrowserTab } from "./base";
import { EquipmentFilters } from "./data";

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
        const kitFields = ["img", "data.price.value", "data.traits"];
        const baseFields = [...kitFields, "data.stackGroup.value", "data.level.value", "data.source.value"];
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
                if (itemData.type === "treasure" && itemData.data.stackGroup.value === "coins") continue;
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

                    // Store price as a number for better sorting
                    const coinValue = (() => {
                        if (itemData.type === "kit") {
                            const coinValues: string[] = (itemData.data?.price?.value ?? "0 gp").split(/,\s*/);
                            const total = coinValues
                                .map((coinValue) =>
                                    coinValueInCopper(
                                        extractPriceFromItem({
                                            data: { price: { value: coinValue }, quantity: { value: 1 } },
                                        })
                                    )
                                )
                                .reduce((total, part) => total + part, 0);
                            return total;
                        } else if (itemData.type === "treasure") {
                            const coinValue = `${itemData.data.value.value} ${itemData.data.denomination.value}`;
                            itemData.data.price = {
                                value: `${itemData.data.value.value} ${itemData.data.denomination.value}`,
                            };
                            return coinValueInCopper(
                                extractPriceFromItem({
                                    data: {
                                        price: { value: coinValue },
                                        quantity: { value: 1 },
                                    },
                                })
                            );
                        }
                        return coinValueInCopper(
                            extractPriceFromItem({
                                data: {
                                    price: { value: itemData.data?.price?.value ?? "0 gp" },
                                    quantity: { value: 1 },
                                },
                            })
                        );
                    })();
                    if (coinValue === 0) itemData.data.price = { value: "0 gp" };

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
                        consumableType: itemData.data.consumableType?.value ?? "",
                        price: itemData.data.price.value,
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
        this.filterData.checkboxes.weaponTraits.options = this.generateCheckboxOptions(CONFIG.PF2E.weaponTraits);
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
        this.filterData.checkboxes.consumableType.options = this.generateCheckboxOptions(CONFIG.PF2E.consumableTypes);
        this.filterData.checkboxes.source.options = this.generateSourceCheckboxOptions(sources);

        console.debug("PF2e System | Compendium Browser | Finished loading inventory items");
    }

    protected override filterIndexData(entry: CompendiumIndexData): boolean {
        const { checkboxes, ranges, search } = this.filterData;

        // Level
        if (!(entry.level >= ranges.level.values.min && entry.level <= ranges.level.values.max)) return false;
        // Name
        if (search.text) {
            if (!entry.name.toLocaleLowerCase().includes(search.text)) return false;
        }
        // Item type
        if (checkboxes.itemtypes.selected.length) {
            if (!checkboxes.itemtypes.selected.includes(entry.type)) return false;
        }
        // Consumbale type
        if (checkboxes.consumableType.selected.length) {
            if (!checkboxes.consumableType.selected.includes(entry.consumableType)) return false;
        }
        // Armor
        if (checkboxes.armorTypes.selected.length) {
            if (!this.arrayIncludes(checkboxes.armorTypes.selected, [entry.category, entry.group])) return false;
        }
        // Weapons
        if (checkboxes.weaponTypes.selected.length) {
            if (!this.arrayIncludes(checkboxes.weaponTypes.selected, [entry.category, entry.group])) return false;
        }
        // Traits
        if (checkboxes.weaponTraits.selected.length) {
            if (!(entry.type === "weapon" && this.arrayIncludes(checkboxes.weaponTraits.selected, entry.traits)))
                return false;
        }
        // Source
        if (checkboxes.source.selected.length) {
            if (!checkboxes.source.selected.includes(entry.source)) return false;
        }
        // Rarity
        if (checkboxes.rarity.selected.length) {
            if (!checkboxes.rarity.selected.includes(entry.rarity)) return false;
        }
        return true;
    }

    protected override prepareFilterData(): void {
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
                consumableType: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterConsumable",
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
                weaponTraits: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterWeaponTraits",
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
                level: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterLevels",
                    values: {
                        min: 0,
                        max: 30,
                    },
                },
            },
            search: {
                text: "",
            },
        };
    }
}
