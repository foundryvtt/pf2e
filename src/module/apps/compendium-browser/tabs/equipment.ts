import { Coins } from "@item/physical/helpers.ts";
import { PHYSICAL_ITEM_TYPES } from "@item/physical/values.ts";
import { MAGIC_TRADITIONS } from "@item/spell/values.ts";
import { sluggify } from "@util";
import * as R from "remeda";
import { CompendiumBrowser } from "../browser.ts";
import { ContentTabName } from "../data.ts";
import { CompendiumBrowserTab } from "./base.svelte.ts";
import { CompendiumBrowserIndexData, EquipmentFilters, RangesInputData } from "./data.ts";

export class CompendiumBrowserEquipmentTab extends CompendiumBrowserTab {
    tabName: ContentTabName = "equipment";
    tabLabel = "PF2E.CompendiumBrowser.TabEquipment";
    declare filterData: EquipmentFilters;

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

    constructor(browser: CompendiumBrowser) {
        super(browser);

        // Set the filterData object of this tab
        this.filterData = this.prepareFilterData();
    }

    protected override async loadData(): Promise<void> {
        console.debug("PF2e System | Compendium Browser | Started loading inventory items");

        const inventoryItems: CompendiumBrowserIndexData[] = [];
        const itemTypes = [...PHYSICAL_ITEM_TYPES, "kit"];
        // Define index fields for different types of equipment

        const baseFields = ["img", "system.price", "system.traits", "system.publication", "system.source"];
        const physicalItemFields = [...baseFields, "system.level.value"];
        const runedItemFields = [...physicalItemFields, "system.runes"];
        const armorAndWeaponFields = [...runedItemFields, "system.category", "system.group"];
        const indexFields = R.unique([...armorAndWeaponFields]).sort();
        const publications = new Set<string>();

        for await (const { pack, index } of this.browser.packLoader.loadPacks(
            "Item",
            this.browser.loadedPacks("equipment"),
            indexFields,
        )) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const itemData of index) {
                if (itemData.type === "treasure" && itemData.system.category === "coin") continue;
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
                        typeof priceValue === "string" ? Coins.fromString(priceValue) : new Coins(priceValue);
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
                        traits: R.unique(itemData.system.traits.value),
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

        this.filterData.traits.options = this.generateMultiselectOptions({
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
        this.filterData.source.options = this.generateSourceCheckboxOptions(publications);

        console.debug("PF2e System | Compendium Browser | Finished loading inventory items");
    }

    protected override filterIndexData(entry: CompendiumBrowserIndexData): boolean {
        const { checkboxes, source, traits, ranges, level } = this.filterData;

        // Level
        if (!(entry.level >= level.from && entry.level <= level.to)) return false;
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
        if (!this.filterTraits(entry.traits, traits.selected, traits.conjunction)) return false;
        // Source
        if (source.selected.length > 0 && !source.selected.includes(entry.source)) {
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
            const minCoins = Coins.fromString(lower);
            const maxCoins = Coins.fromString(upper);
            return {
                min: minCoins.copperValue,
                max: maxCoins.copperValue,
                inputMin: minCoins.toString({ short: true, defaultDenomination: "cp", normalize: false }),
                inputMax: maxCoins.toString({ short: true, normalize: false }),
            };
        }

        return super.parseRangeFilterInput(name, lower, upper);
    }

    protected override prepareFilterData(): EquipmentFilters {
        const defaultMinPrice = new Coins({ cp: 0 });
        const defaultMaxPrice = new Coins({ gp: 200000 });
        const minPriceString = defaultMinPrice.toString({ short: true, defaultDenomination: "cp", normalize: false });
        const maxPriceString = defaultMaxPrice.toString({ short: true, normalize: false });

        return {
            checkboxes: {
                itemTypes: {
                    isExpanded: true,
                    label: "PF2E.CompendiumBrowser.Filter.InventoryTypes",
                    options: {},
                    selected: [],
                },
                rarity: {
                    isExpanded: false,
                    label: "PF2E.CompendiumBrowser.Filter.Rarities",
                    options: {},
                    selected: [],
                },
                armorTypes: {
                    isExpanded: false,
                    label: "PF2E.CompendiumBrowser.Filter.ArmorFilters",
                    options: {},
                    selected: [],
                },
                weaponTypes: {
                    isExpanded: false,
                    label: "PF2E.CompendiumBrowser.Filter.WeaponFilters",
                    options: {},
                    selected: [],
                },
            },
            traits: {
                conjunction: "and",
                options: [],
                selected: [],
            },
            source: {
                isExpanded: false,
                label: "PF2E.CompendiumBrowser.Filter.Source",
                options: {},
                selected: [],
            },
            order: {
                by: "level",
                direction: "asc",
                options: {
                    name: { label: "Name", type: "alpha" },
                    level: { label: "PF2E.LevelLabel", type: "numeric" },
                    price: { label: "PF2E.PriceLabel", type: "numeric" },
                },
                type: "numeric",
            },
            ranges: {
                price: {
                    changed: false,
                    defaultMin: minPriceString,
                    defaultMax: maxPriceString,
                    isExpanded: false,
                    label: "PF2E.PriceLabel",
                    values: {
                        min: defaultMinPrice.copperValue,
                        max: defaultMaxPrice.copperValue,
                        inputMin: minPriceString,
                        inputMax: maxPriceString,
                    },
                },
            },
            level: {
                changed: false,
                isExpanded: false,
                min: 0,
                max: 30,
                from: 0,
                to: 30,
            },
            search: {
                text: "",
            },
        };
    }
}
