import { ItemPF2e } from "..";
import { FeatData, FeatSource, FeatTrait, FeatType } from "./data";
import { OneToThree } from "@module/data";
import { UserPF2e } from "@module/user";
import { sluggify } from "@util";

class FeatPF2e extends ItemPF2e {
    get featType(): FeatType {
        return this.data.data.featType.value;
    }

    get level(): number {
        return this.data.data.level.value;
    }

    get traits(): Set<FeatTrait> {
        return new Set(this.data.data.traits.value);
    }

    get actionCost() {
        const actionType = this.data.data.actionType.value || "passive";
        if (actionType === "passive") return null;

        return {
            type: actionType,
            value: this.data.data.actions.value,
        };
    }

    get isFeature(): boolean {
        return ["classfeature", "ancestryfeature"].includes(this.featType);
    }

    get isFeat(): boolean {
        return !this.isFeature;
    }

    /** Whether this feat must be taken at character level 1 */
    get onlyLevel1(): boolean {
        return this.data.data.onlyLevel1;
    }

    /** The maximum number of times this feat can be taken */
    get maxTakeable(): number {
        return this.data.data.maxTakable;
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        const traits = this.data.data.traits.value;

        // Add the General trait if of the general feat type
        if (this.featType === "general" && !traits.includes("general")) {
            traits.push("general");
        }

        if (this.featType === "skill") {
            // Add the Skill trait
            if (!traits.includes("skill")) traits.push("skill");

            // Add the General trait only if the feat is not an archetype skill feat
            if (!traits.includes("general") && !traits.includes("archetype")) {
                traits.push("general");
            }
        }

        // Only archetype feats can have the dedication trait
        if (traits.includes("dedication")) {
            this.featType === "archetype";
            if (!traits.includes("archetype")) traits.push("archetype");
        }

        // Feats with the Lineage trait can only ever be taken at level 1
        if (this.data.data.traits.value.includes("lineage")) {
            this.data.data.onlyLevel1 = true;
        }

        // `Infinity` stored as `null` in JSON, so change back
        this.data.data.maxTakable ??= Infinity;

        // Feats takable only at level 1 can never be taken multiple times
        if (this.data.data.onlyLevel1) {
            this.data.data.maxTakable = 1;
        }
    }

    /** Set a self roll option for this feat(ure) */
    override prepareActorData(this: Embedded<FeatPF2e>): void {
        const prefix = this.isFeature ? "feature" : "feat";
        const slug = this.slug ?? sluggify(this.name);
        this.actor.rollOptions.all[`${prefix}:${slug}`] = true;
    }

    override getChatData(this: Embedded<FeatPF2e>, htmlOptions: EnrichHTMLOptions = {}): Record<string, unknown> {
        const data = this.data.data;
        const properties = [
            `Level ${data.level.value || 0}`,
            data.actionType.value ? CONFIG.PF2E.actionTypes[data.actionType.value] : null,
        ].filter((p) => p);
        const traits = this.traitChatData(CONFIG.PF2E.featTraits);
        return this.processChatData(htmlOptions, { ...data, properties, traits });
    }

    /** Generate a list of strings for use in predication */
    override getRollOptions(prefix = "feat"): string[] {
        prefix = prefix === "feat" && this.isFeature ? "feature" : prefix;
        const delimitedPrefix = prefix ? `${prefix}:` : "";
        const baseOptions = super.getRollOptions(prefix).filter((o) => !o.endsWith("level:0"));
        const featTypeInfix = this.isFeature ? "feature-type" : "feat-type";
        const featTypeSuffix = this.featType.replace("feature", "");

        return [...baseOptions, `${delimitedPrefix}${featTypeInfix}:${featTypeSuffix}`];
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override async _preUpdate(
        changed: DeepPartial<this["data"]["_source"]>,
        options: DocumentModificationContext<this>,
        user: UserPF2e
    ): Promise<void> {
        // Ensure an empty-string `location` property is null
        if (typeof changed.data?.location === "string") {
            changed.data.location ||= null;
        }

        // Normalize action counts
        const actionCount = changed.data?.actions;
        if (actionCount) {
            actionCount.value = (Math.clamped(Number(actionCount.value), 0, 3) || null) as OneToThree | null;
        }

        // Ensure onlyLevel1 and takeMultiple are consistent
        const traits = changed.data?.traits?.value;

        if (this.isFeature && changed.data) {
            changed.data.onlyLevel1 = false;
            changed.data.maxTakable = 1;

            if (this.featType !== "ancestry" && Array.isArray(traits)) {
                traits.findSplice((t) => t === "lineage");
            }
        } else if ((Array.isArray(traits) && traits.includes("lineage")) || changed.data?.onlyLevel1) {
            mergeObject(changed, { data: { maxTakable: 1 } });
        }

        await super._preUpdate(changed, options, user);
    }

    /** Warn the owning user(s) if this feat was taken despite some restriction */
    protected override _onCreate(data: FeatSource, options: DocumentModificationContext<this>, userId: string): void {
        super._onCreate(data, options, userId);

        if (!(this.isOwner && this.actor?.isOfType("character") && this.isFeat)) return;

        const actorItemNames = { actor: this.actor.name, item: this.name };

        if (this.onlyLevel1 && this.actor.level > 1) {
            const formatParams = { ...actorItemNames, actorLevel: this.actor.level };
            const warning = game.i18n.format("PF2E.Item.Feat.Warning.TakenAfterLevel1", formatParams);
            ui.notifications.warn(warning);
        }

        // Skip subsequent warnings if this feat is from a grant
        if (this.data.flags.pf2e.grantedBy) return;

        const slug = this.slug ?? sluggify(this.name);
        const timesTaken = this.actor.itemTypes.feat.filter((f) => f.slug === slug).length;
        const { maxTakeable } = this;
        if (maxTakeable === 1 && timesTaken > 1) {
            ui.notifications.warn(game.i18n.format("PF2E.Item.Feat.Warning.TakenMoreThanOnce", actorItemNames));
        } else if (timesTaken > maxTakeable) {
            const formatParams = { ...actorItemNames, maxTakeable, timesTaken };
            ui.notifications.warn(game.i18n.format("PF2E.Item.Feat.Warning.TakenMoreThanMax", formatParams));
        }
    }
}

interface FeatPF2e {
    readonly data: FeatData;
}

export { FeatPF2e };
