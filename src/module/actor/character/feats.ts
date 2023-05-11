import { FeatPF2e, ItemPF2e } from "@item";
import { FeatCategory } from "@item/feat/types.ts";
import { sluggify } from "@util";
import { CharacterPF2e } from "./document.ts";
import { BonusFeat, SlottedFeat } from "./data/index.ts";
import { ActorPF2e } from "@actor";

type FeatSlotLevel = number | { id: string; label: string };

interface FeatCategoryOptions {
    id: string;
    label: string;
    featFilter?: string | null;
    supported?: FeatCategory[];
    slots?: FeatSlotLevel[];
    level?: number;
}

class CharacterFeats<TActor extends CharacterPF2e> extends Collection<FeatGroup> {
    /** Feats with no actual category ("bonus feats" in rules text) */
    unorganized: BonusFeat[] = [];

    constructor(private actor: TActor) {
        super();

        const classFeatSlots = actor.class?.grantedFeatSlots;
        const skillPrepend = (() => {
            if (actor.background && Object.keys(actor.background.system.items).length) {
                return [{ id: actor.background?.id, label: game.i18n.localize("PF2E.FeatBackgroundShort") }];
            }
            return [];
        })();

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
        this.createGroup({
            id: "ancestry",
            label: "PF2E.FeatAncestryHeader",
            featFilter: actor.system.details.ancestry?.trait ? `traits-${actor.system.details.ancestry.trait}` : null,
            supported: ["ancestry"],
            slots: classFeatSlots?.ancestry ?? [],
        });

        // Attempt to acquire the trait corresponding with actor's class, falling back to homebrew variations
        const classSlug = actor.class ? actor.class.slug ?? sluggify(actor.class.name) : null;
        const classTrait =
            (classSlug ?? "") in CONFIG.PF2E.featTraits
                ? classSlug
                : `hb_${classSlug}` in CONFIG.PF2E.featTraits
                ? `hb_${classSlug}`
                : null;

        const classFeatFilter = !classTrait
            ? // A class hasn't been selected: no useful pre-filtering available
              null
            : this.actor.level < 2
            ? // The PC's level is less than 2: only show feats for the class
              `traits-${classTrait}`
            : this.actor.itemTypes.feat.some((f) => f.traits.has("dedication"))
            ? // The PC has at least one dedication feat: include all archetype feats
              `traits-${classTrait},traits-archetype`
            : // No dedication feat has been selected: include dedication but no other archetype feats
              `traits-${classTrait},traits-dedication`;
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
            });
        }

        this.createGroup({
            id: "skill",
            label: "PF2E.FeatSkillHeader",
            supported: ["skill"],
            slots: [...skillPrepend, ...(classFeatSlots?.skill ?? [])],
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

    createGroup(options: FeatCategoryOptions): void {
        this.set(options.id, new FeatGroup(this.actor, options));
    }

    /** Inserts a feat into the character. If category is empty string, its a bonus feat */
    async insertFeat(feat: FeatPF2e, options: { categoryId: string; slotId?: string }): Promise<ItemPF2e<TActor>[]> {
        const { category, slotId } = this.get(options.categoryId)?.isFeatValid(feat)
            ? {
                  category: this.get(options.categoryId),
                  slotId: options.slotId ?? null,
              }
            : this.findBestLocation(feat, { requested: options.categoryId });
        const location = (category?.slotted ? slotId : category?.id) || null;
        const isFeatValidInSlot = !!category?.isFeatValid(feat);
        const alreadyHasFeat = this.actor.items.has(feat.id);
        const existing = this.actor.itemTypes.feat.filter((x) => x.system.location === location);

        // If the feat is invalid in the targeted category and no alternative was found, warn and exit out
        if (options.categoryId !== "bonus" && !category) {
            const badCategory = this.get(options.categoryId);
            if (badCategory) {
                ui.notifications.warn(
                    game.i18n.format("PF2E.Item.Feat.Warning.InvalidCategory", {
                        item: feat.name,
                        category: game.i18n.format(badCategory.label),
                    })
                );
                return [];
            }
        }

        // Handle case where its actually dragging away from a location
        if (alreadyHasFeat && feat.system.location && !isFeatValidInSlot) {
            return this.actor.updateEmbeddedDocuments("Item", [{ _id: feat.id, "system.location": null }]);
        }

        const changed: ItemPF2e<TActor>[] = [];

        // If this is a new feat, create a new feat item on the actor first
        if (!alreadyHasFeat && (isFeatValidInSlot || !location)) {
            const source = feat.toObject();
            source.system.location = location;
            changed.push(...(await this.actor.createEmbeddedDocuments("Item", [source])));
            const label = game.i18n.localize(location && category?.label ? category.label : "PF2E.FeatBonusHeader");
            ui.notifications.info(game.i18n.format("PF2E.Item.Feat.Info.Added", { item: feat.name, category: label }));
        }

        // Determine what feats we have to move around
        const locationUpdates: { _id: string; "system.location": string | null }[] = category?.slotted
            ? existing.map((x) => ({ _id: x.id, "system.location": null }))
            : [];
        if (alreadyHasFeat && isFeatValidInSlot) {
            locationUpdates.push({ _id: feat.id, "system.location": location });
        }

        if (locationUpdates.length > 0) {
            changed.push(...(await this.actor.updateEmbeddedDocuments("Item", locationUpdates)));
        }

        return changed;
    }

    /** If a drop target is omitted or turns out to be invalid, make a limited attempt to find an eligible slot */
    private findBestLocation(
        feat: FeatPF2e,
        { requested }: { requested?: string }
    ): { category: FeatGroup | null; slotId: string | null } {
        if (feat.isFeature) return { category: this.get(feat.category) ?? null, slotId: null };
        if (requested === "bonus") return { category: null, slotId: null };

        const validCategories = this.filter((c) => c.isFeatValid(feat) && !c.isFull);
        const category = validCategories.at(0);
        if (validCategories.length === 1 && category) {
            const slotId = category.slotted
                ? Object.keys(category.slots).find((s) => !category.slots[s]?.feat) ?? null
                : null;
            return { category, slotId };
        }

        return { category: null, slotId: null };
    }

    assignFeats(): void {
        const slotted = this.contents.filter((category) => category.slotted);
        const categoryBySlot = slotted.reduce((previous: Partial<Record<string, FeatGroup>>, current) => {
            for (const slot of Object.keys(current.slots)) {
                previous[slot] = current;
            }
            return previous;
        }, {});

        // put the feats in their feat slots
        const feats = this.actor.itemTypes.feat.sort((f1, f2) => f1.sort - f2.sort);
        for (const feat of feats) {
            if (feat.flags.pf2e.grantedBy && !feat.system.location) {
                const granter = this.actor.items.get(feat.flags.pf2e.grantedBy.id);
                if (granter?.isOfType("feat")) continue;
            }

            // We don't handle certain feat types here
            if (["pfsboon", "deityboon", "curse"].includes(feat.category)) {
                continue;
            }

            // Find the group then assign the feat
            const location = feat.system.location ?? "";
            const group = categoryBySlot[location] ?? this.get(location) ?? this.get(feat.category);
            if (!group?.assignFeat(feat)) {
                this.unorganized.push({ feat });
            }
        }

        this.get("classfeature").feats.sort((a, b) => (a.feat?.level || 0) - (b.feat?.level || 0));
    }
}

interface CharacterFeats<TActor extends CharacterPF2e> extends Collection<FeatGroup> {
    get(key: "ancestry" | "ancestryfeature" | "class" | "classfeature" | "general" | "skill"): FeatGroup;
    get(key: string): FeatGroup | undefined;
}

class FeatGroup {
    id: string;
    label: string;
    feats: (SlottedFeat | BonusFeat)[] = [];
    /** Whether the feats are slotted by level or free-form */
    slotted = false;
    /** Will move to sheet data later */
    featFilter: string | null;

    /** Feat Types that are supported */
    supported: FeatCategory[] = [];

    /** Lookup for the slots themselves */
    slots: Record<string, SlottedFeat | undefined> = {};

    constructor(actor: ActorPF2e, options: FeatCategoryOptions) {
        const maxLevel = options.level ?? actor.level;
        this.id = options.id;
        this.label = options.label;
        this.supported = options.supported ?? [];
        this.featFilter = options.featFilter ?? null;
        if (options.slots) {
            this.slotted = true;
            for (const level of options.slots) {
                if (typeof level === "number" && level > maxLevel) {
                    continue;
                }

                const { id, label } = typeof level === "object" ? level : { id: `${this.id}-${level}`, label: level };
                const slot = { id, level: label, grants: [] };
                this.feats.push(slot);
                this.slots[id] = slot;
            }
        }
    }

    /** Assigns a feat to its correct slot, returning true if it was assigned successfully */
    assignFeat(feat: FeatPF2e): boolean {
        const slot: SlottedFeat | undefined = this.slots[feat.system.location ?? ""];
        if (!slot && this.slotted) return false;

        if (slot?.feat) {
            console.debug(`PF2e System | Multiple feats with same index: ${feat.name}, ${slot.feat.name}`);
            return false;
        }

        if (slot) {
            slot.feat = feat;
        } else {
            this.feats.push({ feat });
        }

        feat.group = this;
        return true;
    }

    /** Is this category slotted and without any empty slots */
    get isFull(): boolean {
        return this.slotted && Object.values(this.slots).every((s) => !!s?.feat);
    }

    isFeatValid(feat: FeatPF2e): boolean {
        return this.supported.length === 0 || this.supported.includes(feat.category);
    }
}

export { CharacterFeats, FeatGroup, FeatCategoryOptions, FeatSlotLevel };
