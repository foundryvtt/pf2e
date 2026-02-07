import { MAGIC_TRADITIONS } from "@item/spell/values.ts";
import { getActionGlyph, ordinalString, sluggify } from "@util";
import * as R from "remeda";
import { CompendiumBrowser } from "../browser.ts";
import type { ContentTabName } from "../data.ts";
import { CompendiumBrowserTab } from "./base.svelte.ts";
import type { CompendiumBrowserIndexData, SpellFilters } from "./data.ts";

export class CompendiumBrowserSpellTab extends CompendiumBrowserTab {
    tabName: ContentTabName = "spell";
    tabLabel = "PF2E.CompendiumBrowser.TabSpell";
    declare filterData: SpellFilters;

    /* MiniSearch */
    override searchFields = ["name", "originalName"];
    override storeFields = ["name", "originalName", "img", "uuid", "rank", "rarity", "actionGlyph", "options"];

    constructor(browser: CompendiumBrowser) {
        super(browser);

        // Set the filterData object of this tab
        this.filterData = this.prepareFilterData();
    }

    protected override async loadData(): Promise<void> {
        console.debug("PF2e System | Compendium Browser | Started loading spells");

        const spells: CompendiumBrowserIndexData[] = [];
        const times = new Set<string>();
        const publications = new Set<string>();
        const indexFields = [
            "img",
            "system.level.value",
            "system.time",
            "system.traits",
            "system.publication",
            "system.ritual",
            "system.source",
        ];

        const data = this.browser.packLoader.loadPacks("Item", this.browser.loadedPacks("spell"), indexFields);
        for await (const { pack, index } of data) {
            console.debug(`PF2e System | Compendium Browser | ${pack.metadata.label} - ${index.size} entries found`);
            for (const spellData of index) {
                if (spellData.type !== "spell") continue;
                const options = new Set<string>();

                if ("system" in spellData && R.isPlainObject(spellData.system)) {
                    spellData.system.ritual ??= null;
                }

                if (!this.hasAllIndexFields(spellData, indexFields)) {
                    console.warn(
                        `Item '${spellData.name}' does not have all required data fields. Consider unselecting pack '${pack.metadata.label}' in the compendium browser settings.`,
                    );
                    continue;
                }

                // Category
                const isCantrip = spellData.system.traits.value.includes("cantrip");
                const isFocusSpell =
                    spellData.system.traits.value.includes("focus") ||
                    (isCantrip && (spellData.system.traits.traditions ?? []).length === 0);
                const isRitual = !!spellData.system.ritual;
                const isSpell = !isCantrip && !isFocusSpell && !isRitual;
                const categories = [
                    isSpell ? "spell" : null,
                    isCantrip ? "cantrip" : null,
                    isFocusSpell ? "focus" : null,
                    isRitual ? "ritual" : null,
                ].filter(R.isTruthy);
                for (const category of categories) {
                    options.add(`category:${category}`);
                }

                // format casting time (before value is sluggified)
                const actionGlyph = getActionGlyph(spellData.system.time.value);

                // Casting time
                const time: unknown = spellData.system.time.value;
                if (time && typeof time === "string") {
                    const normalizedTime = time.toLocaleLowerCase("en").includes("reaction")
                        ? "reaction"
                        : sluggify(time);
                    times.add(normalizedTime);
                    spellData.system.time.value = normalizedTime;
                    options.add(`time:${normalizedTime}`);
                }

                for (const tradition of spellData.system.traits.traditions) {
                    options.add(`tradition:${tradition}`);
                }

                for (const trait of spellData.system.traits.value) {
                    options.add(`trait:${trait.replace(/^hb_/, "")}`);
                }

                const defense = spellData.system.defense;
                if (defense?.save) {
                    if (defense.save.basic) options.add(`defense:save:basic`);
                    options.add(`defense:save:${defense.save.statistic}`);
                }
                if (defense?.passive) options.add(`defense:passive:${defense.passive.statistic.split("-")[0]}`);
                if (!defense && options.has(`trait:attack`) && !options.has("category:ritual")) {
                    options.add(`defense:passive:armor`);
                }

                // Publication Source
                const system = spellData.system;
                const pubSource = String(system.publication?.title ?? system.source?.value ?? "").trim();
                const sourceSlug = sluggify(pubSource);
                if (pubSource) {
                    publications.add(pubSource);
                    options.add(`source:${sourceSlug}`);
                }

                options.add(`rank:${spellData.system.level.value}`);
                options.add(`rarity:${spellData.system.traits.rarity}`);
                options.add("type:spell");

                spells.push({
                    name: spellData.name,
                    originalName: spellData.originalName, // Added by Babele
                    img: spellData.img,
                    uuid: spellData.uuid,
                    rank: spellData.system.level.value,
                    actionGlyph,
                    rarity: spellData.system.traits.rarity,
                    options,
                });
            }
        }
        // Set indexData
        this.indexData = spells;

        // Filters
        this.filterData.checkboxes.traditions.options = this.generateCheckboxOptions(CONFIG.PF2E.magicTraditions);
        // Special case for spell ranks
        for (let rank = 1; rank <= 10; rank++) {
            this.filterData.checkboxes.rank.options[rank] = {
                label: game.i18n.format("PF2E.Item.Spell.Rank.Ordinal", { rank: ordinalString(rank) }),
                selected: false,
            };
        }

        this.filterData.checkboxes.rarity.options = this.generateCheckboxOptions(CONFIG.PF2E.rarityTraits, {
            sort: false,
        });
        this.filterData.traits.options = this.generateMultiselectOptions(
            R.omit(CONFIG.PF2E.spellTraits, Array.from(MAGIC_TRADITIONS)),
        );
        this.filterData.source.options = this.generateSourceCheckboxOptions(publications);
        this.filterData.checkboxes.category.options = this.generateCheckboxOptions(
            {
                spell: "TYPES.Item.spell",
                cantrip: "PF2E.TraitCantrip",
                focus: "PF2E.TraitFocus",
                ritual: "PF2E.Item.Spell.Ritual.Label",
            },
            { sort: false },
        );

        this.filterData.selects.timefilter.options = [...times].sort().reduce(
            (result, time) => ({
                ...result,
                [sluggify(time)]: time,
            }),
            {} as Record<string, string>,
        );

        console.debug("PF2e System | Compendium Browser | Finished loading spells");
    }

    protected override prepareFilterData(): SpellFilters {
        return {
            checkboxes: {
                category: {
                    isExpanded: true,
                    label: "PF2E.CompendiumBrowser.Filter.Categories",
                    options: {},
                    selected: [],
                },
                traditions: {
                    isExpanded: true,
                    label: "PF2E.CompendiumBrowser.Filter.Traditions",
                    options: {},
                    optionPrefix: "tradition",
                    selected: [],
                },
                rank: {
                    isExpanded: true,
                    label: "PF2E.Item.Spell.Rank.Plural",
                    options: {},
                    selected: [],
                },
                rarity: {
                    isExpanded: false,
                    label: "PF2E.CompendiumBrowser.Filter.Rarities",
                    options: {},
                    selected: [],
                },
            },
            source: {
                isExpanded: false,
                label: "PF2E.CompendiumBrowser.Filter.Source",
                options: {},
                selected: [],
            },
            traits: {
                conjunction: "and",
                options: [],
                selected: [],
            },
            selects: {
                timefilter: {
                    label: "PF2E.CompendiumBrowser.Filter.CastingTime",
                    options: {},
                    optionPrefix: "time",
                    selected: "",
                },
            },
            order: {
                by: "rank",
                direction: "asc",
                options: {
                    name: { label: "Name", type: "alpha" },
                    rank: { label: "PF2E.Item.Spell.Rank.Label", type: "numeric" },
                },
                type: "numeric",
            },
            search: {
                text: "",
            },
        };
    }
}
