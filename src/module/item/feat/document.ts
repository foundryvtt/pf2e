import type { ActorPF2e } from "@actor";
import type { FeatGroup } from "@actor/character/feats.ts";
import { ItemPF2e, type HeritagePF2e } from "@item";
import { normalizeActionChangeData } from "@item/ability/helpers.ts";
import { ActionCost, Frequency, ItemSummaryData } from "@item/base/data/index.ts";
import { Rarity } from "@module/data.ts";
import type { UserPF2e } from "@module/user/index.ts";
import { getActionTypeLabel, setHasElement, sluggify } from "@util";
import * as R from "remeda";
import { FeatSource, FeatSystemData } from "./data.ts";
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

        this.system.subfeatures = mergeObject({ keyOptions: [] }, this.system.subfeatures ?? {});

        this.system.selfEffect ??= null;
        // Self effects are only usable with actions
        if (this.system.actionType.value === "passive") {
            this.system.selfEffect = null;
        }
    }

    /** Set a self roll option for this feat(ure) */
    override prepareActorData(this: FeatPF2e<ActorPF2e>): void {
        const { actor } = this;
        const prefix = this.isFeature ? "feature" : "feat";
        const slug = this.slug ?? sluggify(this.name);
        actor.rollOptions.all[`${prefix}:${slug}`] = true;

        const { subfeatures } = this.system;
        if (!featCanHaveKeyOptions(this)) subfeatures.keyOptions = [];

        // Add key ability options to parent's list
        if (actor.isOfType("character") && subfeatures.keyOptions.length > 0) {
            actor.system.build.attributes.keyOptions = R.uniq([
                ...actor.system.build.attributes.keyOptions,
                ...subfeatures.keyOptions,
            ]);
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

    override async getChatData(
        this: FeatPF2e<ActorPF2e>,
        htmlOptions: EnrichmentOptions = {},
    ): Promise<ItemSummaryData> {
        const levelLabel = game.i18n.format("PF2E.LevelN", { level: this.level });
        const actionTypeLabel = getActionTypeLabel(this.actionCost?.type, this.actionCost?.value);
        const properties = actionTypeLabel ? [levelLabel, actionTypeLabel] : [levelLabel];
        const traits = this.traitChatData(CONFIG.PF2E.featTraits);

        return this.processChatData(htmlOptions, { ...this.system, properties, traits });
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
        // Ensure an empty-string `location` property is null
        if (typeof changed.system?.location === "string") {
            changed.system.location ||= null;
        }

        // Normalize action data
        normalizeActionChangeData(this, changed);

        // Ensure onlyLevel1 and takeMultiple are consistent
        const traits = changed.system?.traits?.value;

        if (this.isFeature && changed.system) {
            changed.system.onlyLevel1 = false;
            changed.system.maxTakable = 1;

            if (this.category !== "ancestry" && Array.isArray(traits)) {
                traits.findSplice((t) => t === "lineage");
            }
        } else if ((Array.isArray(traits) && traits.includes("lineage")) || changed.system?.onlyLevel1) {
            mergeObject(changed, { system: { maxTakable: 1 } });
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
