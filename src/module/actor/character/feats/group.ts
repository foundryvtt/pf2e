import type { ActorPF2e } from "@actor";
import type { FeatPF2e, HeritagePF2e, ItemPF2e } from "@item";
import { FeatOrFeatureCategory } from "@item/feat/types.ts";
import { tupleHasValue } from "@util/misc.ts";
import type { FeatBrowserFilterProps, FeatGroupData, FeatLike, FeatSlot } from "./types.ts";

class FeatGroup<TActor extends ActorPF2e = ActorPF2e, TItem extends FeatLike = FeatPF2e> {
    actor: TActor;

    id: string;
    label: string;
    feats: (FeatSlot<TItem> | FeatNotSlot<TItem>)[] = [];
    /** Whether the feats are slotted by level or free-form */
    slotted = false;

    /** Feat Types that are supported */
    supported: FeatOrFeatureCategory[] = [];

    filter: FeatBrowserFilterProps;

    /** Lookup for the slots themselves */
    slots: Record<string, FeatSlot<TItem> | undefined> = {};

    /** This groups display's limit. Usually equal to actor level */
    limit: number;

    /** This group's level. If slotted, it is equal to the highest leveled slot. */
    level: number;

    /** Data used to create this group. Used for certain uses that isn't exposed to API */
    #data: FeatGroupData;

    customLimit: {
        label: string;
        min: number;
        max: number;
    } | null;

    constructor(actor: TActor, data: FeatGroupData, options: FeatGroupOptions = {}) {
        this.#data = data;
        this.actor = actor;
        this.id = data.id;
        this.label = data.label;
        this.supported = data.supported ?? [];
        this.filter = data.filter ?? {};
        this.customLimit = data.customLimit ?? null;
        if (this.customLimit && actor.isOfType("character")) {
            const { min, max } = this.customLimit;
            this.limit = Math.clamp(options.limit ?? actor.flags.pf2e.featLimits[this.id] ?? 0, min, max);
            actor.flags.pf2e.featLimits[this.id] = this.limit;
        } else {
            this.limit = options.limit ?? actor.level;
        }

        if (data.slots) {
            this.slotted = true;
            for (const slotData of data.slots) {
                const slotObject =
                    typeof slotData === "object"
                        ? slotData
                        : { id: `${this.id}-${slotData}`, level: Number(slotData), label: slotData.toString() };

                // Skip the slot if its over the limit
                if (typeof slotObject.level === "number" && (slotObject.tier ?? slotObject.level) > this.limit) {
                    continue;
                }

                const slot: FeatSlot<TItem> = {
                    ...slotObject,
                    id: slotObject.id ?? `${this.id}-${slotObject.level}`,
                    label: game.i18n.localize(String(slotObject.label ?? slotObject.level)),
                    level: slotObject.level ?? null,
                    placeholder: slotObject.placeholder ?? data.placeholder ?? "PF2E.EmptySlot",
                    children: [],
                };
                this.feats.push(slot);
                this.slots[slot.id] = slot;
            }
        }

        const slotLevels = this.feats.map((f) => f.level).filter((l): l is number => typeof l === "number");
        this.level = slotLevels.length === 0 ? actor.level : Math.max(...slotLevels);
    }

    /** Is this category slotted and without any empty slots */
    get isFull(): boolean {
        return this.slotted && Object.values(this.slots).every((s) => !!s?.feat);
    }

    /** Assigns a feat to its correct slot during data preparation, returning true if successful */
    assignFeat(feat: TItem): boolean {
        const slotId =
            feat.isOfType("feat") && feat.system.location === this.id
                ? (feat.system.level.taken?.toString() ?? "")
                : (feat.system.location ?? "");
        const slot: FeatSlot<TItem> | undefined = this.slots[slotId];
        if (!slot && this.slotted) return false;

        if (slot?.feat) {
            console.debug(`PF2e System | Multiple feats with same index: ${feat.name}, ${slot.feat.name}`);
            return false;
        }

        const childSlots = this.#getChildSlots(feat);
        if (slot) {
            slot.feat = feat;
            slot.children = childSlots;
        } else {
            const label = feat.category === "classfeature" ? (feat.system.level?.value.toString() ?? null) : null;
            this.feats.push({ feat, label, children: childSlots });
        }
        feat.group = this;

        return true;
    }

    #getChildSlots(feat: Maybe<ItemPF2e>): FeatSlot<FeatPF2e<ActorPF2e> | HeritagePF2e<ActorPF2e>>[] {
        if (!feat?.isOfType("feat")) return [];

        return feat.grants.map((grant): FeatSlot<FeatPF2e<ActorPF2e> | HeritagePF2e<ActorPF2e>> => {
            return {
                id: grant.id,
                label: null,
                level: grant.system.level?.taken ?? null,
                feat: grant,
                children: this.#getChildSlots(grant),
            };
        });
    }

    /** Returns true if this feat is a valid type for the group */
    isFeatValid(feat: TItem): boolean {
        return this.supported.length === 0 || tupleHasValue(this.supported, feat.category);
    }

    /** Adds a new feat to the actor, or reorders an existing one, into the correct slot */
    async insertFeat(feat: TItem, slotId: Maybe<string> = null): Promise<ItemPF2e<TActor>[]> {
        const slot = this.slots[slotId ?? ""];
        const location = this.slotted || this.id === "bonus" ? (slot?.id ?? null) : this.id;
        const existing = this.actor.items.filter(
            (i): i is FeatLike<TActor> => isFeatLike(i) && i.system.location === location,
        );
        const isFeatValidInSlot = this.isFeatValid(feat);
        const alreadyHasFeat = this.actor.items.has(feat.id);

        const changed: ItemPF2e<TActor>[] = [];

        // If this is a new feat, create a new feat item on the actor first
        if (!alreadyHasFeat && (isFeatValidInSlot || !location)) {
            const source = fu.mergeObject(feat.toObject(), {
                system: { location, level: { taken: slot?.level ?? this.actor.level } },
            });
            changed.push(...(await this.actor.createEmbeddedDocuments("Item", [source])));
            const label = game.i18n.localize(this.label);
            ui.notifications.info(game.i18n.format("PF2E.Item.Feat.Info.Added", { item: feat.name, category: label }));
        }

        // Determine what feats we have to move around
        const locationUpdates: { _id: string; "system.location": string | null }[] = this.slotted
            ? existing.map((f) => ({
                  _id: f.id,
                  "system.location": null,
                  ...("taken" in (feat._source.system.level ?? {}) ? { "system.level.-=taken": null } : {}),
              }))
            : [];
        if (alreadyHasFeat && isFeatValidInSlot) {
            locationUpdates.push({
                _id: feat.id,
                "system.location": location,
                ...(slot?.level && feat.isOfType("feat") ? { "system.level.taken": slot.level } : {}),
            });
        }

        if (locationUpdates.length > 0) {
            changed.push(...(await this.actor.updateEmbeddedDocuments("Item", locationUpdates)));
        }

        return changed;
    }

    /** Handles any post assignment post-processing */
    postProcess(): void {
        if (this.#data.sorted && !this.slotted) {
            this.feats.sort((a, b) => (a.feat?.level || 0) - (b.feat?.level || 0));
        }

        // If requires initial, remove all empty slots if the first one isn't filled
        // We also override the main filter with that slot's filter so the browse is for the empty slot
        if (this.slotted && this.#data.requiresInitial && !this.feats.at(0)?.feat) {
            this.feats = this.feats.filter((f, idx) => idx === 0 || !!f.feat);
            this.filter = this.feats[0].filter ?? this.filter;
        }
    }
}

interface FeatGroupOptions {
    /** The "rank" to limit visibility to. By default it is actor level */
    limit?: number;
}

interface FeatNotSlot<T extends FeatLike = FeatPF2e> {
    feat: T;
    filter?: never;
    level?: never;
    children: FeatSlot<FeatLike | HeritagePF2e>[];
}

function isFeatLike<TActor extends ActorPF2e | null>(item: ItemPF2e<TActor>): item is FeatLike<TActor> {
    return "category" in item && "location" in item.system && "isFeat" in item && "isFeature" in item;
}

export { FeatGroup };
