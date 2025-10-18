import { Coins } from "@item/physical/helpers.ts";
import { MAGIC_TRADITIONS } from "@item/spell/values.ts";
import { localizer, sluggify } from "@util";
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
    override storeFields = ["name", "originalName", "img", "uuid", "level", "price", "rarity", "domains"];

    #localizeCoins = localizer("PF2E.CurrencyAbbreviations");

    constructor(browser: CompendiumBrowser) {
        super(browser);

        // Set the filterData object of this tab
        this.filterData = this.prepareFilterData();
    }

    protected override async loadData(): Promise<void> {
        console.debug("PF2e System | Compendium Browser | Started loading inventory items");

        const equipment: CompendiumBrowserIndexData[] = [];
        const itemTypes = ["weapon", "shield", "armor", "equipment", "consumable", "treasure", "backpack", "kit"];
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
                    const domains = new Set<string>();

                    // Store price as a number for better sorting (note: we may be dealing with old data, convert if needed)
                    const priceValue = itemData.system.price.value;
                    const priceCoins =
                        typeof priceValue === "string" ? Coins.fromString(priceValue) : new Coins(priceValue);
                    const coinValue = priceCoins.copperValue;
                    domains.add(`price:${coinValue}`);

                    // Prepare publication source
                    const system = itemData.system;
                    const pubSource = String(system.publication?.title ?? system.source?.value ?? "").trim();
                    const sourceSlug = sluggify(pubSource);
                    if (pubSource) {
                        publications.add(pubSource);
                        domains.add(`source:${sourceSlug}`);
                    }

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
                    for (const trait of R.unique(traits)) {
                        domains.add(`trait:${trait}`);
                    }
                    domains.add(`level:${itemData.system.level?.value ?? 0}`);
                    domains.add(`category:${itemData.system.category ?? "none"}`);
                    domains.add(`type:group:${itemData.system.group ?? "none"}`);
                    domains.add(`rarity:${itemData.system.traits.rarity}`);
                    domains.add(`type:${itemData.type}`);

                    equipment.push({
                        name: itemData.name,
                        originalName: itemData.originalName, // Added by Babele
                        img: itemData.img,
                        uuid: itemData.uuid,
                        level: itemData.system.level?.value ?? 0,
                        price: priceCoins,
                        rarity: itemData.system.traits.rarity,
                        domains,
                    });
                }
            }
        }

        // Set indexData
        this.indexData = equipment;

        // Filters
        this.filterData.chips.armorTypes.options = [
            ...this.generateOptions(CONFIG.PF2E.armorCategories),
            ...this.generateOptions(CONFIG.PF2E.armorGroups, { prefix: "group" }),
        ];
        this.filterData.chips.weaponTypes.options = [
            ...this.generateOptions(CONFIG.PF2E.weaponCategories),
            ...this.generateOptions(CONFIG.PF2E.weaponGroups, { prefix: "group" }),
        ];

        this.filterData.traits.options = this.generateMultiselectOptions({
            ...CONFIG.PF2E.armorTraits,
            ...CONFIG.PF2E.consumableTraits,
            ...CONFIG.PF2E.equipmentTraits,
            ...CONFIG.PF2E.shieldTraits,
            ...CONFIG.PF2E.weaponTraits,
        });

        this.filterData.chips.itemTypes.options = this.generateOptions({
            weapon: "TYPES.Item.weapon",
            shield: "TYPES.Item.shield",
            armor: "TYPES.Item.armor",
            equipment: "TYPES.Item.equipment",
            consumable: "TYPES.Item.consumable",
            treasure: "TYPES.Item.treasure",
            backpack: "TYPES.Item.backpack",
            kit: "TYPES.Item.kit",
        });
        this.filterData.chips.rarity.options = this.generateOptions(CONFIG.PF2E.rarityTraits, { sort: false });
        this.filterData.source.options = this.generateSourceCheckboxOptions(publications);

        console.debug("PF2e System | Compendium Browser | Finished loading inventory items");
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
                min: Coins.fromString(lower).copperValue,
                max: Coins.fromString(upper).copperValue,
                inputMin: lower,
                inputMax: upper,
            };
        }

        return super.parseRangeFilterInput(name, lower, upper);
    }

    protected override prepareFilterData(): EquipmentFilters {
        return {
            chips: {
                itemTypes: {
                    conjunction: "or",
                    isExpanded: true,
                    label: "PF2E.CompendiumBrowser.Filter.InventoryTypes",
                    options: [],
                    optionPrefix: "type",
                    selected: [],
                },
                rarity: {
                    conjunction: "or",
                    isExpanded: false,
                    label: "PF2E.CompendiumBrowser.Filter.Rarities",
                    options: [],
                    selected: [],
                },
                armorTypes: {
                    conjunction: "or",
                    isExpanded: false,
                    label: "PF2E.CompendiumBrowser.Filter.ArmorFilters",
                    options: [],
                    optionPrefix: "type",
                    selected: [],
                },
                weaponTypes: {
                    conjunction: "or",
                    isExpanded: false,
                    label: "PF2E.CompendiumBrowser.Filter.WeaponFilters",
                    options: [],
                    optionPrefix: "type",
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
                options: [],
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
                    defaultMin: `0${this.#localizeCoins("cp")}`,
                    defaultMax: `200,000${this.#localizeCoins("gp")}`,
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
