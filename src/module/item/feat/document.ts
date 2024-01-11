import type { ActorPF2e } from "@actor";
import { ClassDCData } from "@actor/character/data.ts";
import type { FeatGroup } from "@actor/character/feats.ts";
import type { SenseData } from "@actor/creature/index.ts";
import { ItemPF2e, type HeritagePF2e } from "@item";
import { normalizeActionChangeData, processSanctification } from "@item/ability/helpers.ts";
import { ActionCost, Frequency, ItemSummaryData } from "@item/base/data/index.ts";
import { Rarity } from "@module/data.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import type { UserPF2e } from "@module/user/index.ts";
import { ErrorPF2e, objectHasKey, setHasElement, sluggify } from "@util";
import * as R from "remeda";
import { FeatSource, FeatSubfeatures, FeatSystemData } from "./data.ts";
import { featCanHaveKeyOptions } from "./helpers.ts";
import { FeatOrFeatureCategory, FeatTrait } from "./types.ts";
import { FEATURE_CATEGORIES, FEAT_CATEGORIES } from "./values.ts";

class FeatPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    declare group: FeatGroup | null;
    declare grants: (FeatPF2e<ActorPF2e> | HeritagePF2e<ActorPF2e>)[];

    get category(): FeatOrFeatureCategory {
        return this.system.category;
    }

    get level(): number {
        return this.system.level.value;
    }

    get traits(): Set<FeatTrait> {
        return new Set(this.system.traits.value);
    }

    get rarity(): Rarity {
        return this.system.traits.rarity;
    }

    get actionCost(): ActionCost | null {
        const actionType = this.system.actionType.value || "passive";
        if (actionType === "passive") return null;

        return {
            type: actionType,
            value: this.system.actions.value,
        };
    }

    get frequency(): Frequency | null {
        return this.system.frequency ?? null;
    }

    get isFeature(): boolean {
        return setHasElement(FEATURE_CATEGORIES, this.category);
    }

    get isFeat(): boolean {
        return setHasElement(FEAT_CATEGORIES, this.category);
    }

    /** Whether this feat must be taken at character level 1 */
    get onlyLevel1(): boolean {
        return this.system.onlyLevel1;
    }

    /** The maximum number of times this feat can be taken */
    get maxTakable(): number {
        return this.system.maxTakable;
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        this.group = null;
        this.system.level.taken ??= null;

        // Handle legacy data with empty-string locations
        this.system.location ||= null;

        const traits = this.system.traits.value;

        // Add the General trait if of the general feat type
        if (this.category === "general" && !traits.includes("general")) {
            traits.push("general");
        }

        if (this.category === "skill") {
            // Add the Skill trait
            if (!traits.includes("skill")) traits.push("skill");

            // Add the General trait only if the feat is not an archetype skill feat
            if (!traits.includes("general") && !traits.includes("archetype")) {
                traits.push("general");
            }
        }

        // Only archetype feats can have the dedication trait
        if (traits.includes("dedication")) {
            this.system.category = "class";
            if (!traits.includes("archetype")) traits.push("archetype");
        }

        // Feats with the Lineage trait can only ever be taken at level 1
        if (this.system.traits.value.includes("lineage")) {
            this.system.onlyLevel1 = true;
        }

        // `Infinity` is stored as `null` in JSON, so change back
        this.system.maxTakable ??= Infinity;

        // Feats takable only at level 1 can never be taken multiple times
        if (this.system.onlyLevel1) {
            this.system.maxTakable = 1;
        }

        // Initialize frequency uses if not set
        if (this.actor && this.system.frequency) {
            this.system.frequency.value ??= this.system.frequency.max;
        }

        this.system.subfeatures = fu.mergeObject(
            {
                keyOptions: [],
                languages: { granted: [], slots: 0 },
                proficiencies: {},
                senses: {},
            } satisfies FeatSubfeatures,
            this.system.subfeatures ?? {},
        );

        this.system.selfEffect ??= null;
        // Self effects are only usable with actions
        if (this.system.actionType.value === "passive") {
            this.system.selfEffect = null;
        }
    }

    override prepareActorData(): void {
        const actor = this.actor;
        if (!actor?.isOfType("character")) {
            throw ErrorPF2e("Feats much be embedded in PC-type actors");
        }

        // Set a self roll option for this feat(ure)
        const prefix = this.isFeature ? "feature" : "feat";
        const slug = this.slug ?? sluggify(this.name);
        actor.rollOptions.all[`${prefix}:${slug}`] = true;

        // Process subfeatures
        const subfeatures = this.system.subfeatures;
        if (!featCanHaveKeyOptions(this)) subfeatures.keyOptions = [];

        // Key attribute options
        if (subfeatures.keyOptions.length > 0) {
            actor.system.build.attributes.keyOptions = R.uniq([
                ...actor.system.build.attributes.keyOptions,
                ...subfeatures.keyOptions,
            ]);
        }

        const { build, proficiencies, saves } = actor.system;

        // Languages
        build.languages.max += subfeatures.languages.slots;
        build.languages.granted.push(...subfeatures.languages.granted.map((slug) => ({ slug, source: this.name })));

        // Proficiency-rank increases
        for (const [slug, increase] of Object.entries(subfeatures.proficiencies)) {
            const proficiency = ((): { rank: number } | null => {
                if (slug === "perception") return actor.system.perception;
                if (slug === "spellcasting") return proficiencies.spellcasting;
                if (objectHasKey(CONFIG.PF2E.saves, slug)) return saves[slug];
                if (objectHasKey(CONFIG.PF2E.weaponCategories, slug)) return proficiencies.attacks[slug];
                if (objectHasKey(CONFIG.PF2E.armorCategories, slug)) return proficiencies.defenses[slug];
                if (objectHasKey(CONFIG.PF2E.classTraits, slug)) {
                    type PartialClassDCData = Pick<ClassDCData, "attribute" | "label" | "rank">;
                    const classDCs: Record<string, PartialClassDCData> = proficiencies.classDCs;
                    const attribute = increase.attribute ?? "str";
                    return (classDCs[slug] ??= { attribute, label: CONFIG.PF2E.classTraits[slug], rank: 0 });
                }
                return null;
            })();
            if (proficiency && increase?.rank) {
                proficiency.rank = Math.max(proficiency.rank, increase.rank);
            }
        }

        // Senses
        const senseData: SenseData[] = actor.system.perception.senses;
        const acuityValues = { precise: 2, imprecise: 1, vague: 0 };

        for (const [type, data] of R.toPairs.strict(subfeatures.senses)) {
            if (senseData.some((s) => s.type === type)) continue;

            if (type === "darkvision" && data.special && Object.values(data.special).includes(true)) {
                const ancestry = actor.ancestry;
                if (ancestry?.system.vision === "darkvision") continue;

                // This feat grants darkvision but requires that the character's ancestry has low-light vision, the
                // character to have low-light vision from any prior source, or that this feat has been taken twice.
                const special = data.special;
                const llvFeats = actor.itemTypes.feat.filter(
                    (f: FeatPF2e) => f !== this && f.system.subfeatures.senses["low-light-vision"],
                );
                const ancestryFeatures = (): FeatPF2e[] => {
                    return ancestry
                        ? llvFeats.filter(
                              (f) =>
                                  f.category === "ancestryfeature" &&
                                  f.system.subfeatures.senses["low-light-vision"] &&
                                  f.flags.pf2e.grantedBy?.id === ancestry.id,
                          )
                        : [];
                };
                const ancestryHasLLV = ancestry?.system.vision === "low-light-vision" || ancestryFeatures().length > 0;
                const hasLLVRule = (rules: RuleElementSource[]) =>
                    rules.some(
                        (r) => r.key === "Sense" && !r.ignored && "selector" in r && r.selector === "low-light-vision",
                    );
                const heritageHasLLV = () => hasLLVRule(actor.heritage?.system.rules ?? []);
                const backgroundHasLLV = () => hasLLVRule(actor.background?.system.rules ?? []);

                const levelTaken = this.system.level.taken ?? 1;
                const ancestryLLVSatisfied = ancestryHasLLV;
                const takenTwiceSatisfied = () =>
                    actor.itemTypes.feat.some(
                        (f: FeatPF2e) =>
                            f.sourceId === this.sourceId && f !== this && (f.system.level.taken ?? 1) <= levelTaken,
                    );
                const llvAnywhereSatisfied = () =>
                    ancestryHasLLV ||
                    heritageHasLLV() ||
                    backgroundHasLLV() ||
                    llvFeats.some(
                        (f: FeatPF2e) =>
                            (f.system.level.taken ?? 1) <= levelTaken &&
                            (f.system.subfeatures.senses["low-light-vision"] || hasLLVRule(f.system.rules)),
                    );

                const specialClauseSatisfied =
                    (special.ancestry && ancestryLLVSatisfied) ||
                    (special.second && takenTwiceSatisfied()) ||
                    (special.llv && llvAnywhereSatisfied());
                if (!specialClauseSatisfied) continue;
            }

            const newSense: SenseData = {
                type,
                acuity: data.acuity ?? "precise",
                range: data.range ?? Infinity,
                source: this.name,
            };
            const existing = senseData.find((s) => s.type === type);
            if (!existing) {
                senseData.push(newSense);
            } else if ((data.range ?? Infinity) > (existing.range ?? Infinity)) {
                senseData.splice(senseData.indexOf(existing), 1, newSense);
            } else if (acuityValues[data.acuity ?? "vague"] > acuityValues[existing.acuity ?? "precise"]) {
                senseData.splice(senseData.indexOf(existing), 1, newSense);
            }
        }
    }

    override prepareSiblingData(): void {
        this.grants = Object.values(this.flags.pf2e.itemGrants).flatMap((grant) => {
            const item = this.actor?.items.get(grant.id);
            return (item?.isOfType("feat") && !item.system.location) || item?.isOfType("heritage") ? [item] : [];
        });
        for (const grant of this.grants.filter((g): g is FeatPF2e<NonNullable<TParent>> => g.isOfType("feat"))) {
            grant.system.level.taken = this.system.level.taken;
        }
    }

    override onPrepareSynthetics(this: FeatPF2e<ActorPF2e>): void {
        processSanctification(this);
    }

    override async getChatData(
        this: FeatPF2e<ActorPF2e>,
        htmlOptions: EnrichmentOptions = {},
    ): Promise<ItemSummaryData> {
        const actor = this.actor;
        const classSlug = actor.isOfType("character") && actor.class?.slug;
        // Exclude non-matching class traits
        const traitSlugs =
            ["class", "classfeature"].includes(this.category) &&
            actor.isOfType("character") &&
            classSlug &&
            this.system.traits.value.includes(classSlug)
                ? this.system.traits.value.filter((t) => t === classSlug || !(t in CONFIG.PF2E.classTraits))
                : this.system.traits.value;
        const traits = this.traitChatData(CONFIG.PF2E.featTraits, traitSlugs);
        const levelLabel =
            this.isFeat && this.level > 0 ? game.i18n.format("PF2E.Item.Feat.LevelN", { level: this.level }) : null;
        const rarity =
            this.rarity === "common"
                ? null
                : {
                      slug: this.rarity,
                      label: CONFIG.PF2E.rarityTraits[this.rarity],
                      description: CONFIG.PF2E.traitsDescriptions[this.rarity],
                  };

        return this.processChatData(htmlOptions, {
            ...this.system,
            levelLabel,
            traits,
            rarity,
        });
    }

    /** Generate a list of strings for use in predication */
    override getRollOptions(prefix = "feat"): string[] {
        prefix = prefix === "feat" && this.isFeature ? "feature" : prefix;
        return R.compact([
            ...super.getRollOptions(prefix).filter((o) => !o.endsWith("level:0")),
            `${prefix}:category:${this.category}`,
            this.isFeat ? `${prefix}:rarity:${this.rarity}` : null,
            this.frequency ? `${prefix}:frequency:limited` : null,
        ]);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override async _preCreate(
        data: this["_source"],
        options: DocumentModificationContext<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        // In case this was copied from an actor, clear the location if there's no parent.
        if (!this.parent) {
            this._source.system.location = null;
            delete this._source.system.level.taken;
            if (this._source.system.frequency) {
                delete this._source.system.frequency.value;
            }
        }

        return super._preCreate(data, options, user);
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DocumentModificationContext<TParent>,
        user: UserPF2e,
    ): Promise<boolean | void> {
        if (!changed.system) return super._preUpdate(changed, options, user);

        // Ensure an empty-string `location` property is null
        if ("location" in changed.system) {
            changed.system.location ||= null;
        }

        if (typeof changed.system.level?.value === "number" && changed.system.level.value !== 1) {
            changed.system.onlyLevel1 = false;
        }

        // Normalize action data
        normalizeActionChangeData(this, changed);

        // Ensure onlyLevel1 and takeMultiple are consistent
        const traits = changed.system.traits?.value;
        if (setHasElement(FEATURE_CATEGORIES, changed.system.category ?? this.category)) {
            changed.system.onlyLevel1 = false;
            changed.system.maxTakable = 1;

            if (this.category !== "ancestry" && Array.isArray(traits)) {
                traits.findSplice((t) => t === "lineage");
            }
        } else if ((Array.isArray(traits) && traits.includes("lineage")) || changed.system?.onlyLevel1) {
            fu.mergeObject(changed, { system: { maxTakable: 1 } });
        }

        return super._preUpdate(changed, options, user);
    }

    /** Warn the owning user(s) if this feat was taken despite some restriction */
    protected override _onCreate(
        data: FeatSource,
        options: DocumentModificationContext<TParent>,
        userId: string,
    ): void {
        super._onCreate(data, options, userId);

        if (!(this.isOwner && this.actor?.isOfType("character") && this.isFeat)) return;

        const actorItemNames = { actor: this.actor.name, item: this.name };

        if (this.onlyLevel1 && this.actor.level > 1) {
            const formatParams = { ...actorItemNames, actorLevel: this.actor.level };
            const warning = game.i18n.format("PF2E.Item.Feat.Warning.TakenAfterLevel1", formatParams);
            ui.notifications.warn(warning);
        }

        // Skip subsequent warnings if this feat is from a grant
        if (this.flags.pf2e.grantedBy) return;

        const slug = this.slug ?? sluggify(this.name);
        const timesTaken = this.actor.itemTypes.feat.filter((f) => f.slug === slug).length;
        const { maxTakable } = this;
        if (maxTakable === 1 && timesTaken > 1) {
            ui.notifications.warn(game.i18n.format("PF2E.Item.Feat.Warning.TakenMoreThanOnce", actorItemNames));
        } else if (timesTaken > maxTakable) {
            const formatParams = { ...actorItemNames, maxTakable, timesTaken };
            ui.notifications.warn(game.i18n.format("PF2E.Item.Feat.Warning.TakenMoreThanMax", formatParams));
        }
    }
}

interface FeatPF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: FeatSource;
    system: FeatSystemData;

    /** Interface alignment with other "attack items" */
    readonly range?: never;
}

export { FeatPF2e };
