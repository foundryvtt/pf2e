import type { ActorPF2e, CharacterPF2e } from "@actor";
import type { FeatPF2e, HeritagePF2e, ItemPF2e } from "@item";
import { ItemSystemData } from "@item/base/data/system.ts";
import { FeatOrFeatureCategory } from "@item/feat/types.ts";
import { sluggify, tupleHasValue } from "@util";
import * as R from "remeda";

class CharacterFeats<TActor extends CharacterPF2e> extends Collection<FeatGroup<TActor>> {
    /** Feats belonging no actual group ("bonus feats" in rules text) */
    bonus: FeatGroup<TActor>;

    constructor(private actor: TActor) {
        super();

        const classFeatSlots = actor.class?.grantedFeatSlots;

        this.bonus = new FeatGroup(actor, {
            id: "bonus",
            label: "PF2E.FeatBonusHeader",
        });

        this.createGroup({
            id: "ancestryfeature",
            label: "PF2E.FeaturesAncestryHeader",
            supported: ["ancestryfeature"],
        });
        this.createGroup({
            id: "classfeature",
            label: "PF2E.FeaturesClassHeader",
            supported: ["classfeature"],
        });

        // Find every ancestry and versatile heritage the actor counts as, then get all the traits that match them,
        // falling back to homebrew
        const ancestryTraitsFilter =
            actor.system.details.ancestry?.countsAs
                .map((t) => getVanillaOrHomebrewTrait(t))
                .flatMap((t) => (t ? `traits-${t}` : [])) ?? [];

        this.createGroup({
            id: "ancestry",
            label: "PF2E.FeatAncestryHeader",
            featFilter: ancestryTraitsFilter,
            supported: ["ancestry"],
            slots: classFeatSlots?.ancestry ?? [],
        });

        // Attempt to acquire the trait corresponding with actor's class, falling back to homebrew variations
        const classSlug = actor.class ? actor.class.slug ?? sluggify(actor.class.name) : null;
        const classTrait = getVanillaOrHomebrewTrait(classSlug);

        const classFeatFilter = !classTrait
            ? // A class hasn't been selected: no useful pre-filtering available
              []
            : this.actor.level < 2
            ? // The PC's level is less than 2: only show feats for the class
              [`traits-${classTrait}`]
            : this.actor.itemTypes.feat.some((f) => f.traits.has("dedication"))
            ? // The PC has at least one dedication feat: include all archetype feats
              [`traits-${classTrait}`, "traits-archetype"]
            : // No dedication feat has been selected: include dedication but no other archetype feats
              [`traits-${classTrait}`, "traits-dedication"];
        this.createGroup({
            id: "class",
            label: "PF2E.FeatClassHeader",
            featFilter: classFeatFilter,
            supported: ["class"],
            slots: classFeatSlots?.class ?? [],
        });

        const evenLevels = new Array(actor.level)
            .fill(0)
            .map((_, idx) => idx + 1)
            .filter((idx) => idx % 2 === 0);

        // Add dual class if active
        if (game.settings.get("pf2e", "dualClassVariant")) {
            this.createGroup({
                id: "dualclass",
                label: "PF2E.FeatDualClassHeader",
                supported: ["class"],
                slots: [1, ...evenLevels],
            });
        }

        // Add free archetype (if active)
        if (game.settings.get("pf2e", "freeArchetypeVariant")) {
            this.createGroup({
                id: "archetype",
                label: "PF2E.FeatArchetypeHeader",
                supported: ["class"],
                slots: evenLevels,
                featFilter: this.actor.itemTypes.feat.some((f) => f.traits.has("dedication"))
                    ? ["traits-archetype"]
                    : ["traits-dedication"],
            });
        }

        const backgroundSkillFeats =
            actor.background && Object.keys(actor.background.system.items ?? {}).length > 0
                ? {
                      id: actor.background.id,
                      level: 1,
                      label: game.i18n.localize("PF2E.FeatBackgroundShort"),
                  }
                : null;
        this.createGroup({
            id: "skill",
            label: "PF2E.FeatSkillHeader",
            supported: ["skill"],
            slots: R.compact([backgroundSkillFeats, classFeatSlots?.skill].flat()),
        });

        this.createGroup({
            id: "general",
            label: "PF2E.FeatGeneralHeader",
            supported: ["general", "skill"],
            slots: classFeatSlots?.general ?? [],
        });

        // Add campaign feats if enabled
        if (game.settings.get("pf2e", "campaignFeats")) {
            this.createGroup({ id: "campaign", label: "PF2E.FeatCampaignHeader" });
        }
    }

    createGroup(options: FeatGroupOptions): this {
        return this.set(options.id, new FeatGroup(this.actor, options));
    }

    /** Inserts a feat into the character. If groupId is empty string, it's a bonus feat. */
    async insertFeat(
        feat: FeatPF2e,
        slotData: { groupId: string; slotId: string | null } | null,
    ): Promise<ItemPF2e<TActor>[]> {
        // Certain feat types aren't "real" feats and need to be inserted normally
        const alreadyHasFeat = this.actor.items.has(feat.id);
        if (isBoonOrCurse(feat)) {
            return alreadyHasFeat ? [] : this.actor.createEmbeddedDocuments("Item", [feat.toObject()]);
        }

        const groupId = slotData?.groupId ?? "";
        const { group, slotId } = this.get(groupId)?.isFeatValid(feat)
            ? { group: this.get(groupId), slotId: slotData?.slotId ?? null }
            : this.#findBestLocation(feat, { requested: groupId });
        const isFeatValidInSlot = !!group?.isFeatValid(feat);

        // If the feat is invalid in the targeted category and no alternative was found, warn and exit out
        if (groupId !== "bonus" && !group) {
            const badGroup = this.get(groupId);
            if (badGroup) {
                ui.notifications.warn(
                    game.i18n.format("PF2E.Item.Feat.Warning.InvalidCategory", {
                        item: feat.name,
                        category: game.i18n.format(badGroup.label),
                    }),
                );
                return [];
            }
        }

        // Handle case where its actually dragging away from a location
        if (alreadyHasFeat && feat.system.location && !isFeatValidInSlot) {
            return this.actor.updateEmbeddedDocuments("Item", [{ _id: feat.id, "system.location": null }]);
        }

        return group?.insertFeat(feat, slotId) ?? this.bonus.insertFeat(feat);
    }

    /** If a drop target is omitted or turns out to be invalid, make a limited attempt to find an eligible slot */
    #findBestLocation(
        feat: FeatPF2e,
        { requested }: { requested?: string },
    ): { group: FeatGroup<TActor> | null; slotId: string | null } {
        if (feat.isFeature) return { group: this.get(feat.category) ?? null, slotId: null };
        if (requested === "bonus") return { group: null, slotId: null };

        const validGroups = this.filter((c) => c.isFeatValid(feat) && !c.isFull);
        const group = validGroups.at(0);
        if (validGroups.length === 1 && group) {
            const slotId = group.slotted ? Object.values(group.slots).find((slot) => !slot?.feat)?.id ?? null : null;
            return { group, slotId };
        }

        return { group: null, slotId: null };
    }

    /** Assigns existing feats to their correct spots during data preparation */
    assignToSlots(): void {
        const slotted = this.contents.filter((g) => g.slotted);
        const groupsBySlot = slotted.reduce((previous: Partial<Record<string, FeatGroup<TActor>>>, current) => {
            for (const slot of Object.keys(current.slots)) {
                previous[slot] = current;
            }
            return previous;
        }, {});

        // put the feats in their feat slots
        const feats = this.actor.itemTypes.feat.sort((f1, f2) => f1.sort - f2.sort);
        for (const feat of feats.filter((f) => !isBoonOrCurse(f))) {
            if (feat.flags.pf2e.grantedBy && !feat.system.location) {
                const granter = this.actor.items.get(feat.flags.pf2e.grantedBy.id);
                if (granter?.isOfType("feat") && granter.grants.includes(feat)) {
                    continue;
                }
            }

            // Find the group then assign the feat
            const location = feat.system.location ?? "";
            const group = groupsBySlot[location] ?? this.get(location) ?? this.get(feat.category);
            group?.assignFeat(feat) || this.bonus.assignFeat(feat);
        }

        this.get("classfeature").feats.sort((a, b) => (a.feat?.level || 0) - (b.feat?.level || 0));
    }
}

interface CharacterFeats<TActor extends CharacterPF2e> extends Collection<FeatGroup<TActor>> {
    get(key: "ancestry" | "ancestryfeature" | "class" | "classfeature" | "general" | "skill"): FeatGroup<TActor>;
    get(key: string): FeatGroup<TActor> | undefined;
}

/** Any document that is similar enough to a feat/feature to be used as a feat for the purposes of feat groups */
interface FeatLike<TParent extends ActorPF2e | null = ActorPF2e | null> extends ItemPF2e<TParent> {
    category: string;
    group: FeatGroup<NonNullable<TParent>, this> | null;
    isFeat: boolean;
    isFeature: boolean;
    system: ItemSystemData & {
        location: string | null;
    };
}

interface FeatSlot<TItem extends FeatLike | HeritagePF2e = FeatPF2e> {
    id: string;
    label?: Maybe<string>;
    level: number | null;
    feat?: Maybe<TItem>;
    children: FeatSlot<FeatLike | HeritagePF2e>[];
}

interface FeatNotSlot<T extends FeatLike = FeatPF2e> {
    feat: T;
    children: FeatSlot<FeatLike | HeritagePF2e>[];
}

interface FeatSlotCreationData extends Omit<FeatSlot, "children" | "feat" | "level"> {
    level?: Maybe<number>;
}

interface FeatGroupOptions {
    id: string;
    label: string;
    featFilter?: string[];
    supported?: FeatOrFeatureCategory[];
    slots?: (FeatSlotCreationData | string | number)[];
    level?: number;
}

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

    constructor(actor: TActor, options: FeatGroupOptions) {
        this.actor = actor;
        const maxLevel = options.level ?? actor.level;
        this.id = options.id;
        this.label = options.label;
        this.supported = options.supported ?? [];
        this.featFilter = Array.from(
            new Set([this.supported.map((s) => `category-${s}`), options.featFilter ?? []].flat()),
        );

        if (options.slots) {
            this.slotted = true;
            for (const slotOption of options.slots) {
                const slotData =
                    typeof slotOption === "number"
                        ? { id: `${this.id}-${slotOption}`, level: slotOption, label: slotOption.toString() }
                        : typeof slotOption === "string"
                        ? { id: `${this.id}-${sluggify(slotOption)}`, level: null, label: slotOption }
                        : slotOption;
                if (typeof slotData.level === "number" && slotData.level > maxLevel) {
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
                ? feat.system.level.taken?.toString() ?? ""
                : feat.system.location ?? "";
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
            const label = feat.category === "classfeature" ? feat.system.level?.value.toString() ?? null : null;
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
        const location = this.slotted || this.id === "bonus" ? slot?.id ?? null : this.id;
        const existing = this.actor.items.filter(
            (i): i is FeatLike<TActor> => isFeatLike(i) && i.system.location === location,
        );
        const isFeatValidInSlot = this.isFeatValid(feat);
        const alreadyHasFeat = this.actor.items.has(feat.id);

        const changed: ItemPF2e<TActor>[] = [];

        // If this is a new feat, create a new feat item on the actor first
        if (!alreadyHasFeat && (isFeatValidInSlot || !location)) {
            const source = mergeObject(feat.toObject(), { system: { location } });
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

function getVanillaOrHomebrewTrait(slug: string | null) {
    return (slug ?? "") in CONFIG.PF2E.featTraits ? slug : `hb_${slug}` in CONFIG.PF2E.featTraits ? `hb_${slug}` : null;
}

function isBoonOrCurse(feat: FeatPF2e) {
    return ["pfsboon", "deityboon", "curse"].includes(feat.category);
}

function isFeatLike<TActor extends ActorPF2e | null>(item: ItemPF2e<TActor>): item is FeatLike<TActor> {
    return "category" in item && "location" in item.system && "isFeat" in item && "isFeature" in item;
}

export { CharacterFeats, FeatGroup };
export type { FeatGroupOptions, FeatSlotCreationData };
