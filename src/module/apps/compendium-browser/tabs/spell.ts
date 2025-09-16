import { MAGIC_TRADITIONS } from "@item/spell/values.ts";
import { getActionGlyph, ordinalString, sluggify } from "@util";
import * as R from "remeda";
import { CompendiumBrowser } from "../browser.ts";
import { ContentTabName } from "../data.ts";
import { CompendiumBrowserTab } from "./base.svelte.ts";
import { CompendiumBrowserIndexData, SpellFilters } from "./data.ts";

export class CompendiumBrowserSpellTab extends CompendiumBrowserTab {
    tabName: ContentTabName = "spell";
    tabLabel = "PF2E.CompendiumBrowser.TabSpell";
    declare filterData: SpellFilters;

    /* MiniSearch */
    override searchFields = ["name", "originalName"];
    override storeFields = [
        "type",
        "name",
        "img",
        "uuid",
        "rank",
        "time",
        "traditions",
        "traits",
        "categories",
        "rarity",
        "source",
    ];

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
                spellData.filters = {};

                if (spellData.type === "spell") {
                    if ("system" in spellData && R.isPlainObject(spellData.system)) {
                        spellData.system.ritual ??= null;
                    }

                    if (!this.hasAllIndexFields(spellData, indexFields)) {
                        console.warn(
                            `Item '${spellData.name}' does not have all required data fields. Consider unselecting pack '${pack.metadata.label}' in the compendium browser settings.`,
                        );
                        continue;
                    }

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

                    // format casting time (before value is sluggified)
                    const actionGlyph = getActionGlyph(spellData.system.time.value);

                    // recording casting times
                    const time: unknown = spellData.system.time.value;
                    if (time && typeof time === "string") {
                        const normalizedTime = time.toLocaleLowerCase("en").includes("reaction")
                            ? "reaction"
                            : sluggify(time);
                        times.add(normalizedTime);
                        spellData.system.time.value = normalizedTime;
                    }

                    // Prepare publication source
                    const { system } = spellData;
                    const pubSource = String(system.publication?.title ?? system.source?.value ?? "").trim();
                    const sourceSlug = sluggify(pubSource);
                    if (pubSource) publications.add(pubSource);

                    spells.push({
                        type: spellData.type,
                        name: spellData.name,
                        originalName: spellData.originalName, // Added by Babele
                        img: spellData.img,
                        uuid: spellData.uuid,
                        rank: spellData.system.level.value,
                        categories,
                        time: spellData.system.time,
                        actionGlyph,
                        traditions: spellData.system.traits.traditions,
                        traits: spellData.system.traits.value.map((t: string) => t.replace(/^hb_/, "")),
                        rarity: spellData.system.traits.rarity,
                        source: sourceSlug,
                    });
                }
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
        this.filterData.checkboxes.rarity.options = this.generateCheckboxOptions(CONFIG.PF2E.rarityTraits, false);
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
            false,
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

    protected override filterIndexData(indexData: CompendiumBrowserIndexData): boolean {
        const { checkboxes, source, traits, selects } = this.filterData;

        // Rank
        if (checkboxes.rank.selected.length > 0) {
            const ranks = checkboxes.rank.selected.map((r) => Number(r));
            if (!ranks.includes(indexData.rank)) return false;
        }

        // Categories
        if (
            checkboxes.category.selected.length > 0 &&
            !R.isShallowEqual([...checkboxes.category.selected].sort(), indexData.categories.sort())
        ) {
            return false;
        }

        // Casting time
        if (selects.timefilter.selected) {
            if (!(selects.timefilter.selected === indexData.time.value)) return false;
        }

        // Traditions
        if (
            checkboxes.traditions.selected.length > 0 &&
            R.intersection(checkboxes.traditions.selected, indexData.traditions).length === 0
        ) {
            return false;
        }

        // Traits
        if (!this.filterTraits(indexData.traits, traits.selected, traits.conjunction)) {
            return false;
        }

        // Rarity
        if (checkboxes.rarity.selected.length > 0) {
            if (!checkboxes.rarity.selected.includes(indexData.rarity)) return false;
        }

        // Source
        if (source.selected.length > 0) {
            if (!source.selected.includes(indexData.source)) return false;
        }

        return true;
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
