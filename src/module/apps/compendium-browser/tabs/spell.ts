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
    override storeFields = ["name", "originalName", "img", "uuid", "rank", "rarity", "actionGlyph", "domains"];

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
            "system.defense",
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
                const domains = new Set<string>();

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
                    domains.add(`category:${category}`);
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
                    domains.add(`time:${normalizedTime}`);
                }

                for (const tradition of spellData.system.traits.traditions) {
                    domains.add(`tradition:${tradition}`);
                }

                for (const trait of spellData.system.traits.value) {
                    domains.add(`trait:${trait.replace(/^hb_/, "")}`);
                }

                const defense = spellData.system.defense;
                if (defense?.save) {
                    if (defense.save.basic) domains.add(`defense:save:basic`);
                    domains.add(`defense:save:${defense.save.statistic}`);
                }
                if (defense?.passive) domains.add(`defense:passive:${defense.passive.statistic.split("-")[0]}`);
                if (!defense && domains.has(`trait:attack`) && !domains.has("category:ritual")) {
                    domains.add(`defense:passive:armor`);
                }

                // Publication Source
                const system = spellData.system;
                const pubSource = String(system.publication?.title ?? system.source?.value ?? "").trim();
                const sourceSlug = sluggify(pubSource);
                if (pubSource) {
                    publications.add(pubSource);
                    domains.add(`source:${sourceSlug}`);
                }

                domains.add(`rank:${spellData.system.level.value}`);
                domains.add(`rarity:${spellData.system.traits.rarity}`);
                domains.add("type:spell");

                spells.push({
                    name: spellData.name,
                    originalName: spellData.originalName, // Added by Babele
                    img: spellData.img,
                    uuid: spellData.uuid,
                    rank: spellData.system.level.value,
                    actionGlyph,
                    rarity: spellData.system.traits.rarity,
                    domains,
                });
            }
        }
        // Set indexData
        this.indexData = spells;

        // Filters
        this.filterData.chips.traditions.options = this.generateOptions(CONFIG.PF2E.magicTraditions);
        // Special case for spell ranks
        for (let rank = 1; rank <= 10; rank++) {
            this.filterData.chips.rank.options.push({
                label: ordinalString(rank),
                value: `${rank}`,
            });
        }
        this.filterData.chips.rarity.options = this.generateOptions(CONFIG.PF2E.rarityTraits, { sort: false });
        this.filterData.chips.defense.options = [
            {
                label: game.i18n.localize("PF2E.Item.Spell.Defense.BasicSave"),
                value: "save:basic",
            },
            ...this.generateOptions(CONFIG.PF2E.saves, { prefix: "save" }),
            ...this.generateOptions(R.pick(CONFIG.PF2E.checkDCs.Specific, ["armor", "fortitude", "reflex", "will"]), {
                prefix: "passive",
            }),
        ];
        this.filterData.traits.options = this.generateMultiselectOptions(
            R.omit(CONFIG.PF2E.spellTraits, Array.from(MAGIC_TRADITIONS)),
        );
        this.filterData.source.options = this.generateSourceCheckboxOptions(publications);
        this.filterData.chips.category.options = this.generateOptions(
            {
                spell: "TYPES.Item.spell",
                cantrip: "PF2E.TraitCantrip",
                focus: "PF2E.TraitFocus",
                ritual: "PF2E.Item.Spell.Ritual.Label",
            },
            { sort: false },
        );

        this.filterData.selects.timefilter.options = [...times].sort().map((label) => ({
            label,
            value: sluggify(label),
        }));

        console.debug("PF2e System | Compendium Browser | Finished loading spells");
    }

    protected override prepareFilterData(): SpellFilters {
        return {
            chips: {
                category: {
                    conjunction: "and",
                    isExpanded: true,
                    label: "PF2E.CompendiumBrowser.Filter.Categories",
                    options: [],
                    selected: [],
                    showConjunction: true,
                },
                traditions: {
                    conjunction: "and",
                    isExpanded: true,
                    label: "PF2E.CompendiumBrowser.Filter.Traditions",
                    options: [],
                    optionPrefix: "tradition",
                    selected: [],
                    showConjunction: true,
                },
                rank: {
                    conjunction: "or",
                    isExpanded: true,
                    label: "PF2E.Item.Spell.Rank.Plural",
                    options: [],
                    selected: [],
                },
                defense: {
                    conjunction: "or",
                    isExpanded: false,
                    label: "PF2E.Item.Spell.Defense.Label",
                    options: [],
                    selected: [],
                    showConjunction: true,
                },
                rarity: {
                    conjunction: "or",
                    isExpanded: false,
                    label: "PF2E.CompendiumBrowser.Filter.Rarities",
                    options: [],
                    selected: [],
                },
            },
            source: {
                isExpanded: false,
                label: "PF2E.CompendiumBrowser.Filter.Source",
                options: [],
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
                    options: [],
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
