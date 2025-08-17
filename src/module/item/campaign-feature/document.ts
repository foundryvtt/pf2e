import type { ActorPF2e } from "@actor";
import type { FeatGroup } from "@actor/character/feats/index.ts";
import type { DocumentHTMLEmbedConfig } from "@client/applications/ux/text-editor.d.mts";
import type { DatabaseCreateCallbackOptions, DatabaseUpdateCallbackOptions } from "@common/abstract/_types.d.mts";
import { ItemPF2e } from "@item";
import { normalizeActionChangeData } from "@item/ability/helpers.ts";
import type { ActionCost, Frequency } from "@item/base/data/index.ts";
import { sluggify, tupleHasValue } from "@util";
import * as R from "remeda";
import type { CampaignFeatureSource, CampaignFeatureSystemData } from "./data.ts";
import type { BehaviorType, KingmakerCategory, KingmakerTrait } from "./types.ts";
import { CategoryData, KINGDOM_CATEGORY_DATA, KINGMAKER_CATEGORY_TYPES } from "./values.ts";

class CampaignFeaturePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    declare group: FeatGroup<ActorPF2e, CampaignFeaturePF2e> | null;
    declare grants: CampaignFeaturePF2e[];
    declare behavior: BehaviorType;
    declare levelLabel: string;

    /** The item that granted this feature */
    granter: CampaignFeaturePF2e | null = null;

    static override get validTraits(): Record<KingmakerTrait, string> {
        return CONFIG.PF2E.kingmakerTraits;
    }

    get category(): KingmakerCategory {
        return this.system.category;
    }

    /** Returns the level if the feature type supports it */
    get level(): number | null {
        return this.behavior !== "activity" ? (this.system.level?.value ?? 0) : null;
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

    get isAction(): boolean {
        return this.behavior === "activity";
    }

    get isFeature(): boolean {
        return this.behavior === "feature";
    }

    get isFeat(): boolean {
        return this.behavior === "feat";
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        const categoryData: CategoryData =
            KINGDOM_CATEGORY_DATA[this.category] ?? Object.values(KINGDOM_CATEGORY_DATA)[0];
        this.behavior = categoryData.behavior;
        this.group = null;
        this.levelLabel = categoryData.levelLabel ?? (this.isFeat ? "PF2E.Item.Feat.LevelLabel" : "PF2E.LevelLabel");
    }

    /** Set a self roll option for this feat(ure). Skip for actions */
    override prepareActorData(this: CampaignFeaturePF2e<ActorPF2e>): void {
        const prefix = this.isFeature ? "feature" : this.isFeat ? "feat" : null;
        if (prefix) {
            const slug = this.slug ?? sluggify(this.name);
            this.actor.rollOptions.all[`${prefix}:${slug}`] = true;
        }
    }

    override prepareSiblingData(): void {
        const itemGrants = this.flags.pf2e.itemGrants;
        this.grants = Object.values(itemGrants).flatMap((grant) => {
            const item = this.actor?.items.get(grant.id);
            if (item?.isOfType("campaignFeature")) {
                item.granter = this;
                return [item];
            }
            return [];
        });
    }

    /** Generate a list of strings for use in predication */
    override getRollOptions(prefix?: string, options?: { includeGranter?: boolean }): string[] {
        prefix ??= this.isFeature ? "feature" : this.isFeat ? "feat" : "action";
        return [
            ...super.getRollOptions(prefix, options).filter((o) => !o.endsWith("level:0")),
            `${prefix}:category:${this.category}`,
            this.isAction ? `action:${this.slug}` : null,
        ].filter(R.isTruthy);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** In case this was copied from an actor, clear the location if there's no parent. */
    protected override async _preCreate(
        data: DeepPartial<this["_source"]>,
        options: DatabaseCreateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        if (!this.parent) {
            this.updateSource({ "system.location": null });
            if (this._source.system.frequency) {
                this.updateSource({ "system.frequency.-=value": null });
            }
        }
        return super._preCreate(data, options, user);
    }

    protected override async _preUpdate(
        changed: DeepPartial<this["_source"]>,
        options: DatabaseUpdateCallbackOptions,
        user: fd.BaseUser,
    ): Promise<boolean | void> {
        // Ensure an empty-string `location` property is null
        if (typeof changed.system?.location === "string") {
            changed.system.location ||= null;
        }

        // Normalize action data
        normalizeActionChangeData(this, changed);

        // Delete level if optional for the category type
        if (changed.system && changed.system.category) {
            const system = changed.system;

            const category = tupleHasValue(KINGMAKER_CATEGORY_TYPES, changed.system.category)
                ? changed.system.category
                : KINGMAKER_CATEGORY_TYPES[0];
            const behavior = KINGDOM_CATEGORY_DATA[category].behavior;
            const level = behavior === "activity" ? 1 : (system.level?.value ?? this.system.level?.value ?? 0);
            system.level = { value: level };
        }

        await super._preUpdate(changed, options, user);
    }

    protected override embedHTMLString(config: DocumentHTMLEmbedConfig & { hr?: boolean }): string {
        const list = this.system.prerequisites?.value?.map((item) => item.value).join(", ") ?? "";
        return (
            (list
                ? `<p><strong>${game.i18n.localize("PF2E.FeatPrereqLabel")}</strong> ${list}</p>` +
                  (config.hr === false ? "" : "<hr>")
                : "") + this.description
        );
    }
}

interface CampaignFeaturePF2e<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    readonly _source: CampaignFeatureSource;
    system: CampaignFeatureSystemData;
}

export { CampaignFeaturePF2e };
