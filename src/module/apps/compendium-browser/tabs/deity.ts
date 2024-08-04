import { objectHasKey, sluggify } from "@util";
import { ContentTabName } from "../data.ts";
import { CompendiumBrowser } from "../index.ts";
import { CompendiumBrowserTab } from "./base.ts";
import { CompendiumBrowserIndexData, DeityFilters } from "./data.ts";

export class CompendiumBrowserDeityTab extends CompendiumBrowserTab {
    tabName: ContentTabName = "deity";
    filterData: DeityFilters;
    templatePath = "systems/pf2e/templates/compendium-browser/partials/deity.hbs";

    override searchFields = ["name", "originalName"];
    override storeFields = [
        "type",
        "name",
        "img",
        "uuid",
        "source",
        "rarity",
        "category",
        "font",
        "sanctification",
        "attribute",
        "primaryDomain",
        "alternateDomain",
        "skill",
        "weapon",
    ];

    constructor(browser: CompendiumBrowser) {
        super(browser);

        this.filterData = this.prepareFilterData();
    }

    protected override async loadData(): Promise<void> {
        console.debug("PF2e System | Compendium Browser | Started loading deities");

        const deities: CompendiumBrowserIndexData[] = [];
        const publications = new Set<string>();
        const indexFields = [
            "img",
            "system.traits",
            "system.publication",
            "system.source",
            "system.category",
            "system.font",
            "system.sanctification",
            "system.attribute",
            "system.domains",
            "system.skill",
            "system.weapons",
        ];

        for await (const { pack, index } of this.browser.packLoader.loadPacks(
            "Item",
            this.browser.loadedPacks("deity"),
            indexFields,
        )) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const deityData of index) {
                if (deityData.type === "deity") {
                    deityData.filters = {};
                }

                const pubSource = deityData.system.publication?.title ?? deityData.system.source?.value ?? "";
                const sourceSlug = sluggify(pubSource);
                if (pubSource) publications.add(pubSource);

                deities.push({
                    type: deityData.type,
                    name: deityData.name,
                    originalName: deityData.originalName,
                    img: deityData.img,
                    uuid: deityData.uuid,
                    rarity: deityData.system.traits?.rarity,
                    source: sourceSlug,
                    category: deityData.system.category,
                    font: deityData.system.font.length > 0 ? deityData.system.font : "none",
                    sanctification: deityData.system.sanctification?.what ?? "none",
                    attribute: deityData.system.attribute,
                    primaryDomain: deityData.system.domains.primary,
                    alternateDomain: deityData.system.domains.alternate,
                    skill: deityData.system.skill,
                    weapon: deityData.system.weapons,
                });
            }

            this.indexData = deities;

            // Create a dynamic list of primary domains
            const primaryDomainsOptions = Object.fromEntries(
                deities
                    .map((t) => {
                        return t.primaryDomain.flatMap((domain: string) => {
                            const domains = CONFIG.PF2E.deityDomains as {
                                [key: string]: { label: string; description: string };
                            };
                            const domainString = objectHasKey(domains[domain], "label")
                                ? domains[domain].label
                                : domain.titleCase();
                            return [domain, domainString];
                        });
                    })
                    .filter(([_value, label]) => label != undefined),
            );

            // Create a dynamic list of alternate domains
            const alternateDomainOptions = Object.fromEntries(
                deities
                    .map((t) => {
                        return t.alternateDomain.flatMap((domain: string) => {
                            const domains = CONFIG.PF2E.deityDomains as {
                                [key: string]: { label: string; description: string };
                            };
                            const domainString = objectHasKey(domains[domain], "label")
                                ? domains[domain].label
                                : domain.titleCase();
                            return [domain, domainString];
                        });
                    })
                    .filter(([_value, label]) => label != undefined),
            );

            // Create a dynamic list of favored weapons
            const favoredWeaponOptions = Object.fromEntries(
                deities
                    .map((t) => {
                        return t.weapon.flatMap((weapon: string) => {
                            const weapons = CONFIG.PF2E.baseWeaponTypes as {
                                [key: string]: string;
                            };
                            const weaponString = weapons[weapon] ?? weapon.titleCase();
                            return [weapon, weaponString];
                        });
                    })
                    .filter(([_value, label]) => label != undefined),
            );

            this.filterData.checkboxes.source.options = this.generateSourceCheckboxOptions(publications);
            this.filterData.checkboxes.category.options = this.generateCheckboxOptions({
                deity: "PF2E.Deity",
                pantheon: "PF2E.Item.Deity.Category.Pantheon",
                philosophy: "PF2E.Item.Deity.Category.Philosophy",
            });
            this.filterData.multiselects.font.options = this.generateMultiselectOptions({
                harm: "PF2E.Item.Deity.DivineFont.Harm",
                heal: "PF2E.Item.Deity.DivineFont.Heal",
                none: "PF2E.Item.Deity.DivineFont.None",
            });
            this.filterData.multiselects.attribute.options = this.generateMultiselectOptions(CONFIG.PF2E.abilities);
            this.filterData.multiselects.skill.options = this.generateMultiselectOptions(CONFIG.PF2E.skillList);
            this.filterData.multiselects.primaryDomain.options = this.generateMultiselectOptions(primaryDomainsOptions);
            this.filterData.multiselects.alternateDomain.options =
                this.generateMultiselectOptions(alternateDomainOptions);
            this.filterData.multiselects.sanctification.options = this.generateMultiselectOptions({
                holy: "PF2E.BrowserFilterSanctification.Holy",
                unholy: "PF2E.BrowserFilterSanctification.Unholy",
                none: "PF2E.Item.Deity.Sanctification.None",
            });
            this.filterData.multiselects.weapon.options = this.generateMultiselectOptions(favoredWeaponOptions);

            console.debug("PF2e System | Compendium Browser | Finished loading deities");
        }
    }

    protected override filterIndexData(entry: CompendiumBrowserIndexData): boolean {
        const { checkboxes, multiselects } = this.filterData;

        if (checkboxes.source.selected.length) {
            if (!checkboxes.source.selected.includes(entry.source)) return false;
        }
        if (checkboxes.category.selected.length) {
            if (!checkboxes.category.selected.includes(entry.category)) return false;
        }

        if (!this.filterTraits(entry.attribute, multiselects.attribute.selected, multiselects.attribute.conjunction))
            return false;
        if (
            !this.filterTraits(
                entry.primaryDomain,
                multiselects.primaryDomain.selected,
                multiselects.primaryDomain.conjunction,
            )
        )
            return false;
        if (
            !this.filterTraits(
                entry.alternateDomain,
                multiselects.alternateDomain.selected,
                multiselects.alternateDomain.conjunction,
            )
        )
            return false;
        if (!this.filterTraits(entry.skill, multiselects.skill.selected, multiselects.skill.conjunction)) return false;
        if (!this.filterTraits(entry.weapon, multiselects.weapon.selected, multiselects.weapon.conjunction))
            return false;
        if (!this.filterTraits(entry.font, multiselects.font.selected, multiselects.font.conjunction)) return false;
        if (
            !this.filterTraits(
                entry.sanctification,
                multiselects.sanctification.selected,
                multiselects.sanctification.conjunction,
            )
        )
            return false;

        return true;
    }

    protected override prepareFilterData(): DeityFilters {
        return {
            checkboxes: {
                source: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterSource",
                    options: {},
                    selected: [],
                },
                category: {
                    isExpanded: false,
                    label: "PF2E.BrowserFilterCategory",
                    options: {},
                    selected: [],
                },
            },

            multiselects: {
                attribute: {
                    conjunction: "and",
                    label: "PF2E.BrowserFilterDivineAttribute",
                    options: [],
                    selected: [],
                },
                primaryDomain: {
                    conjunction: "and",
                    label: "PF2E.BrowserFilterPrimaryDomain",
                    options: [],
                    selected: [],
                },
                alternateDomain: {
                    conjunction: "and",
                    label: "PF2E.BrowserFilterAlternateDomain",
                    options: [],
                    selected: [],
                },
                font: {
                    conjunction: "and",
                    label: "PF2E.BrowserFilterDivineFont",
                    options: [],
                    selected: [],
                },
                sanctification: {
                    conjunction: "and",
                    label: "PF2E.BrowserFilterSanctification.Label",
                    options: [],
                    selected: [],
                },
                skill: {
                    conjunction: "and",
                    label: "PF2E.BrowserFilterDivineSkill",
                    options: [],
                    selected: [],
                },
                weapon: {
                    conjunction: "and",
                    label: "PF2E.BrowserFilterFavoredWeapon",
                    options: [],
                    selected: [],
                },
            },

            order: {
                by: "name",
                direction: "asc",
                options: {
                    name: "Name",
                },
            },
            search: {
                text: "",
            },
        };
    }
}
