import { ActorPF2e, PartyPF2e } from "@actor";
import { FeatGroup } from "@actor/character/feats.ts";
import { ActionCost, Frequency } from "@item/data/base.ts";
import { UserPF2e } from "@module/user/index.ts";
import { sluggify, tupleHasValue } from "@util";
import { ItemPF2e } from "../index.ts";
import { CampaignFeatureSource, CampaignFeatureSystemData, CampaignFeatureSystemSource } from "./data.ts";
import { BehaviorType, KingmakerCategory, KingmakerTrait } from "./types.ts";
import { KINGDOM_CATEGORY_DATA, KINGMAKER_CATEGORY_TYPES } from "./values.ts";

class CampaignFeaturePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    declare group: FeatGroup<PartyPF2e, CampaignFeaturePF2e> | null;
    declare grants: CampaignFeaturePF2e[];
    declare behavior: BehaviorType;

    get category(): KingmakerCategory {
        return this.system.category;
    }

    /** Returns the level if the feature type supports it */
    get level(): number | null {
        return this.behavior !== "activity" ? this.system.level?.value ?? 0 : null;
    }

    get traits(): Set<KingmakerTrait> {
        return new Set(this.system.traits.value);
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
        return this.behavior === "feature";
    }

    get isFeat(): boolean {
        return this.behavior === "feat";
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        const categoryData = KINGDOM_CATEGORY_DATA[this.category] ?? Object.values(KINGDOM_CATEGORY_DATA)[0];
        this.behavior = categoryData.behavior;
        this.group = null;

        // Initialize frequency uses if not set
        if (this.actor && this.system.frequency) {
            this.system.frequency.value ??= this.system.frequency.max;
        }
    }

    /** Set a self roll option for this feat(ure) */
    override prepareActorData(this: CampaignFeaturePF2e<ActorPF2e>): void {
        const { actor } = this;
        const prefix = this.isFeature ? "feature" : this.isFeat ? "feat" : "action";
        const slug = this.slug ?? sluggify(this.name);
        actor.rollOptions.all[`${prefix}:${slug}`] = true;
    }

    override prepareSiblingData(): void {
        const itemGrants = this.flags.pf2e.itemGrants;
        this.grants = Object.values(itemGrants).flatMap((grant) => {
            const item = this.actor?.items.get(grant.id);
            return item?.isOfType("campaignFeature") ? [item] : [];
        });
    }

    /** Generate a list of strings for use in predication */
    override getRollOptions(prefix = "feat"): string[] {
        const actualPrefix = this.isFeature ? "feature" : this.isFeat ? "feat" : "action";
        prefix = prefix === "feat" ? actualPrefix : prefix;
        return [
            ...super.getRollOptions(prefix).filter((o) => !o.endsWith("level:0")),
            `${prefix}:category:${this.category}`,
        ];
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override async _preCreate(
        data: PreDocumentId<CampaignFeatureSource>,
        options: DocumentModificationContext<TParent>,
        user: UserPF2e
    ): Promise<boolean | void> {
        // In case this was copied from an actor, clear the location if there's no parent.
        if (!this.parent) {
            this.updateSource({ "system.location": null });
            if (this._source.system.frequency) {
                this.updateSource({ "system.frequency.-=value": null });
            }
        }

        return super._preCreate(data, options, user);
    }

    protected override async _preUpdate(
        changed: DeepPartial<CampaignFeatureSource>,
        options: DocumentModificationContext<TParent>,
        user: UserPF2e
    ): Promise<boolean | void> {
        // Ensure an empty-string `location` property is null
        if (typeof changed.system?.location === "string") {
            changed.system.location ||= null;
        }

        // Normalize action data
        if (changed.system && ("actionType" in changed.system || "actions" in changed.system)) {
            const actionType = changed.system?.actionType?.value ?? this.system.actionType.value;
            const actionCount = Number(changed.system?.actions?.value ?? this.system.actions.value);
            changed.system = mergeObject(changed.system, {
                actionType: { value: actionType },
                actions: { value: actionType !== "action" ? null : Math.clamped(actionCount, 1, 3) },
            });
        }

        // Delete level if optional for the category type
        if (changed.system && changed.system.category) {
            type SystemSourceWithDeletions = DeepPartial<CampaignFeatureSystemSource> & {
                "-=level"?: null;
            };
            const system: SystemSourceWithDeletions = changed.system;

            const category = tupleHasValue(KINGMAKER_CATEGORY_TYPES, changed.system.category)
                ? changed.system.category
                : KINGMAKER_CATEGORY_TYPES[0];
            const behavior = KINGDOM_CATEGORY_DATA[category].behavior;
            if (behavior === "activity") {
                system["-=level"] = null;
            } else {
                const level = system.level?.value ?? this.system.level?.value ?? 0;
                system.level = { value: level };
            }
        }

        await super._preUpdate(changed, options, user);
    }
}

interface CampaignFeaturePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: CampaignFeatureSource;
    system: CampaignFeatureSystemData;
}

export { CampaignFeaturePF2e };
