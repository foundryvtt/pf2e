import { getActionIcon, sluggify } from "@util";
import { CompendiumBrowser } from "..";
import { CompendiumBrowserTab } from "./base";
import { CompendiumBrowserIndexData, SpellFilters } from "./data";

export class CompendiumBrowserSpellTab extends CompendiumBrowserTab {
    override filterData!: SpellFilters;
    override templatePath = "systems/pf2e/templates/compendium-browser/partials/spell.html";
    /* MiniSearch */
    override searchFields = ["name"];
    override storeFields = [
        "type",
        "name",
        "img",
        "uuid",
        "level",
        "time",
        "category",
        "school",
        "traditions",
        "traits",
        "rarity",
        "source",
    ];

    constructor(browser: CompendiumBrowser) {
        super(browser, "spell");

        // Set the filterData object of this tab
        this.prepareFilterData();
    }

    protected override async loadData() {
        console.debug("PF2e System | Compendium Browser | Started loading spells");

        const spells: CompendiumBrowserIndexData[] = [];
        const times: Set<string> = new Set();
        const sources: Set<string> = new Set();
        const indexFields = [
            "img",
            "system.level.value",
            "system.category.value",
            "system.traditions.value",
            "system.time",
            "system.school.value",
            "system.traits",
            "system.source.value",
        ];

        const data = this.browser.packLoader.loadPacks("Item", this.browser.loadedPacks("spell"), indexFields);
        for await (const { pack, index } of data) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const spellData of index) {
                spellData.filters = {};

                if (spellData.type === "spell") {
                    if (!this.hasAllIndexFields(spellData, indexFields)) {
                        console.warn(
                            `Item '${spellData.name}' does not have all required data fields. Consider unselecting pack '${pack.metadata.label}' in the compendium browser settings.`
                        );
                        continue;
                    }
                    // Set category of cantrips to "cantrip" until migration can be done
                    if (spellData.system.traits.value.includes("cantrip")) {
                        spellData.system.category.value = "cantrip";
                    }

                    // recording casting times
                    let time = spellData.system.time.value;
                    if (time) {
                        if (time.includes("reaction")) time = "reaction";
                        times.add(time);
                        spellData.system.time.value = sluggify(time);
                    }

                    // format casting time
                    if (spellData.system.time.value === "reaction") {
                        spellData.system.time.img = getActionIcon("reaction");
                    } else if (spellData.system.time.value === "free") {
                        spellData.system.time.img = getActionIcon("free");
                    } else {
                        spellData.system.time.img = getActionIcon(spellData.system.time.value);
                    }

                    if (spellData.system.time.img === "systems/pf2e/icons/actions/Empty.webp") {
                        spellData.system.time.img = "systems/pf2e/icons/actions/LongerAction.webp";
                    }

                    // Prepare source
                    const source = spellData.system.source.value;
                    if (source) {
                        sources.add(source);
                        spellData.system.source.value = sluggify(source);
                    }

                    spells.push({
                        type: spellData.type,
                        name: spellData.name,
                        img: spellData.img,
                        uuid: `Compendium.${pack.collection}.${spellData._id}`,
                        level: spellData.system.level.value,
                        time: spellData.system.time,
                        category: spellData.system.category.value,
                        school: spellData.system.school.value,
                        traditions: spellData.system.traditions.value,
                        traits: spellData.system.traits.value,
                        rarity: spellData.system.traits.rarity,
                        source: spellData.system.source.value,
                    });
                }
            }
        }
        // Set indexData
        this.indexData = spells;

        // Filters
        this.filterData.checkboxes.category.options = this.generateCheckboxOptions(CONFIG.PF2E.spellCategories);
        this.filterData.checkboxes.category.options.cantrip = {
            label: "PF2E.SpellCantripLabel",
            selected: false,
        };
        this.filterData.checkboxes.traditions.options = this.generateCheckboxOptions(CONFIG.PF2E.magicTraditions);
        // Special case for spell levels
        for (let i = 1; i <= 10; i++) {
            this.filterData.checkboxes.level.options[`${i}`] = {
                label: game.i18n.localize(`PF2E.SpellLevel${i}`),
                selected: false,
            };
        }
        this.filterData.checkboxes.classes.options = this.generateCheckboxOptions(CONFIG.PF2E.classTraits);
        this.filterData.checkboxes.school.options = this.generateCheckboxOptions(CONFIG.PF2E.magicSchools);
        this.filterData.checkboxes.rarity.options = this.generateCheckboxOptions(CONFIG.PF2E.rarityTraits, false);
        this.filterData.checkboxes.traits.options = this.generateCheckboxOptions(CONFIG.PF2E.spellTraits);
        this.filterData.checkboxes.source.options = this.generateSourceCheckboxOptions(sources);

        this.filterData.selects.timefilter.options = [...times].sort().reduce(
            (result, time) => ({
                ...result,
                [sluggify(time)]: time,
            }),
            {} as Record<string, string>
        );

        console.debug("PF2e System | Compendium Browser | Finished loading spells");
    }

    protected override filterIndexData(entry: CompendiumBrowserIndexData): boolean {
        const { checkboxes, selects } = this.filterData;

        // Level
        if (checkboxes.level.selected.length) {
            const levels = checkboxes.level.selected.map((level) => Number(level));
            if (!levels.includes(entry.level)) return false;
        }
        // Casting time
        if (selects.timefilter.selected) {
            if (!(selects.timefilter.selected === entry.time.value)) return false;
        }
        // Category
        if (checkboxes.category.selected.length) {
            if (!checkboxes.category.selected.includes(entry.category)) return false;
        }
        // Traditions
        if (checkboxes.traditions.selected.length) {
            if (!this.arrayIncludes(checkboxes.traditions.selected, entry.traditions)) return false;
        }
        // Traits and Class
        if (checkboxes.classes.selected.length || checkboxes.traits.selected.length) {
            const combined = [...checkboxes.classes.selected, ...checkboxes.traits.selected];
            if (!this.arrayIncludes(combined, entry.traits)) return false;
        }
        // School
        if (checkboxes.school.selected.length) {
            if (!checkboxes.school.selected.includes(entry.school)) return false;
        }
        // Rarity
        if (checkboxes.rarity.selected.length) {
            if (!checkboxes.rarity.selected.includes(entry.rarity)) return false;
        }
        // Source
        if (checkboxes.source.selected.length) {
            if (!checkboxes.source.selected.includes(entry.source)) return false;
        }
        return true;
    }

    protected override prepareFilterData(): void {
        this.filterData = {
            checkboxes: {
                category: {
                    isExpanded: true,
                    label: "PF2E.BrowserFilterSpellCategories",
                    options: {},
                    selected: [],
                },
                traditions: {
                    isExpanded: true,
                    label: "PF2E.BrowserFilterTraditions",
                    options: {},
                    selected: [],
                },
                level: {
                    isExpanded: true,
                    label: "PF2E.BrowserFilterLevels",
                    options: {},
                    selected: [],
                },
                classes: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterClass",
                    options: {},
                    selected: [],
                },
                school: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterSchools",
                    options: {},
                    selected: [],
                },
                rarity: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterRarities",
                    options: {},
                    selected: [],
                },
                traits: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterTraits",
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
            selects: {
                timefilter: {
                    label: "PF2E.BrowserFilterCastingTime",
                    options: {},
                    selected: "",
                },
            },
            order: {
                by: "level",
                direction: "asc",
                options: {
                    name: "PF2E.BrowserSortyByNameLabel",
                    level: "PF2E.BrowserSortyByLevelLabel",
                },
            },
            search: {
                text: "",
            },
        };
    }
}
