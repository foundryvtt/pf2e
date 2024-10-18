import type { ActorPF2e } from "@actor";
import type { FeatPF2e, HeritagePF2e, ItemPF2e } from "@item";
import type { FeatOrFeatureCategory } from "@item/feat/index.ts";
import { sluggify, tupleHasValue } from "@util/misc.ts";
import type { FeatGroupData, FeatLike, FeatSlot } from "./types.ts";

class FeatGroup<TActor extends ActorPF2e = ActorPF2e, TItem extends FeatLike = FeatPF2e> {
    actor: TActor;

    id: string;
    label: string;
    feats: (FeatSlot<TItem> | FeatNotSlot<TItem>)[] = [];
    /** Whether the feats are slotted by level or free-form */
    slotted = false;
    /** Will move to sheet data later */
    featFilter: string[];

    /** Feat Types that are supported */
    supported: FeatOrFeatureCategory[] = [];

    /** Lookup for the slots themselves */
    slots: Record<string, FeatSlot<TItem> | undefined> = {};

    /** This groups level for the purpose of showing feats. Usually equal to actor level */
    level: number;

    constructor(actor: TActor, data: FeatGroupData, options: { level?: number } = {}) {
        this.actor = actor;
        this.id = data.id;
        this.label = data.label;
        this.level = options.level ?? actor.level;
        this.supported = data.supported ?? [];
        this.featFilter = Array.from(
            new Set([this.supported.map((s) => `category-${s}`), data.featFilter ?? []].flat()),
        );

        if (data.slots) {
            this.slotted = true;
            for (const slotOption of data.slots) {
                const slotData =
                    typeof slotOption === "number"
                        ? { id: `${this.id}-${slotOption}`, level: slotOption, label: slotOption.toString() }
                        : typeof slotOption === "string"
                          ? { id: `${this.id}-${sluggify(slotOption)}`, level: null, label: slotOption }
                          : slotOption;
                if (typeof slotData.level === "number" && slotData.level > this.level) {
                    continue;
                }

                const slot = { ...slotData, level: slotData.level ?? null, children: [] };
                this.feats.push(slot);
                this.slots[slot.id] = slot;
            }
        }
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
}

interface FeatNotSlot<T extends FeatLike = FeatPF2e> {
    feat: T;
    children: FeatSlot<FeatLike | HeritagePF2e>[];
}

function isFeatLike<TActor extends ActorPF2e | null>(item: ItemPF2e<TActor>): item is FeatLike<TActor> {
    return "category" in item && "location" in item.system && "isFeat" in item && "isFeature" in item;
}

export { FeatGroup };
