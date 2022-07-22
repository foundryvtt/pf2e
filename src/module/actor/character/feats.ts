import { FeatPF2e, ItemPF2e } from "@item";
import { ItemGrantData } from "@item/data/base";
import { FeatType } from "@item/feat/data";
import { CharacterPF2e } from ".";
import { BonusFeat, GrantedFeat, SlottedFeat } from "./data";

type FeatSlotLevel = number | { id: string; label: string };

interface FeatCategoryOptions {
    id: string;
    label: string;
    featFilter?: string;
    supported?: FeatType[];
    levels?: FeatSlotLevel[];
}

class CharacterFeats extends Collection<FeatCategory> {
    /** Feats with no actual category (referred to by paizo as bonus feats)  */
    unorganized = new Array<BonusFeat>();

    constructor(private actor: CharacterPF2e) {
        super();

        const classFeatSlots = actor.class?.grantedFeatSlots;
        const skillPrepend = (() => {
            if (actor.background && Object.keys(actor.background.data.data.items).length) {
                return [{ id: actor.background?.id, label: game.i18n.localize("PF2E.FeatBackgroundShort") }];
            }
            return [];
        })();

        this.createCategory({
            id: "ancestryfeature",
            label: "PF2E.FeaturesAncestryHeader",
            supported: ["ancestryfeature"],
        });
        this.createCategory({
            id: "classfeature",
            label: "PF2E.FeaturesClassHeader",
            supported: ["classfeature"],
        });
        this.createCategory({
            id: "ancestry",
            label: "PF2E.FeatAncestryHeader",
            featFilter: "ancestry-" + actor.ancestry?.slug,
            supported: ["ancestry"],
            levels: classFeatSlots?.ancestry ?? [],
        });
        this.createCategory({
            id: "class",
            label: "PF2E.FeatClassHeader",
            featFilter: "classes-" + actor.class?.slug,
            supported: ["class"],
            levels: classFeatSlots?.class ?? [],
        });

        const evenLevels = new Array(actor.level)
            .fill(0)
            .map((_, idx) => idx + 1)
            .filter((idx) => idx % 2 === 0);

        // Add dual class if active
        if (game.settings.get("pf2e", "dualClassVariant")) {
            this.createCategory({
                id: "dualclass",
                label: "PF2E.FeatDualClassHeader",
                supported: ["class"],
                levels: [1, ...evenLevels],
            });
        }

        // Add free archetype (if active)
        if (game.settings.get("pf2e", "freeArchetypeVariant")) {
            this.createCategory({
                id: "archetype",
                label: "PF2E.FeatArchetypeHeader",
                supported: ["class"],
                levels: evenLevels,
            });
        }

        this.createCategory({
            id: "skill",
            label: "PF2E.FeatSkillHeader",
            supported: ["skill"],
            levels: [...skillPrepend, ...(classFeatSlots?.skill ?? [])],
        });
        this.createCategory({
            id: "general",
            label: "PF2E.FeatGeneralHeader",
            supported: ["general", "skill"],
            levels: classFeatSlots?.general ?? [],
        });

        // Add campaign feats if enabled
        if (game.settings.get("pf2e", "campaignFeats")) {
            this.createCategory({ id: "campaign", label: "PF2E.FeatCampaignHeader" });
        }
    }

    createCategory(options: FeatCategoryOptions) {
        this.set(options.id, new FeatCategory(options));
    }

    private combineGrants(feat: FeatPF2e): { feat: FeatPF2e; grants: GrantedFeat[] } {
        const getGrantedItems = (grants: ItemGrantData[]): GrantedFeat[] => {
            return grants.flatMap((grant) => {
                const item = this.actor.items.get(grant.id);
                return item?.isOfType("feat") && !item.data.data.location
                    ? { feat: item, grants: getGrantedItems(item.data.flags.pf2e.itemGrants) }
                    : [];
            });
        };

        return { feat, grants: getGrantedItems(feat.data.flags.pf2e.itemGrants) };
    }

    /** Inserts a feat into the character. If category is empty string, its a bonus feat */
    async insertFeat(feat: FeatPF2e, options: { categoryId: string; slotId?: string }): Promise<ItemPF2e[]> {
        const { category, slotId } = this.get(options.categoryId)?.isFeatValid(feat)
            ? {
                  category: this.get(options.categoryId)!,
                  slotId: options.slotId ?? null,
              }
            : this.findBestLocation(feat);
        const location = (category?.slotted ? slotId : category?.id) || null;
        const isFeatValidInSlot = !!category?.isFeatValid(feat);
        const alreadyHasFeat = this.actor.items.has(feat.id);
        const existing = this.actor.itemTypes.feat.filter((x) => x.data.data.location === location);

        // If the feat is invalid in the targeted category and no alternative was found, warn and exit out
        if (category && !category.isFeatValid(feat)) {
            const label = game.i18n.format(category.label);
            ui.notifications.warn(
                game.i18n.format("PF2E.Item.Feat.Warning.InvalidCategory", {
                    item: feat.name,
                    category: label,
                })
            );
            return [];
        }

        // Handle case where its actually dragging away from a location
        if (alreadyHasFeat && feat.data.data.location && !isFeatValidInSlot) {
            return this.actor.updateEmbeddedDocuments("Item", [{ _id: feat.id, "data.location": null }]);
        }

        const changed: ItemPF2e[] = [];

        // If this is a new feat, create a new feat item on the actor first
        if (!alreadyHasFeat && (isFeatValidInSlot || !location)) {
            const source = feat.toObject();
            source.data.location = location;
            changed.push(...(await this.actor.createEmbeddedDocuments("Item", [source])));
            const label = game.i18n.localize(category?.label ?? "PF2E.FeatBonusHeader");
            ui.notifications.info(game.i18n.format("PF2E.Item.Feat.Info.Added", { item: feat.name, category: label }));
        }

        // Determine what feats we have to move around
        const locationUpdates: { _id: string; "data.location": string | null }[] = category?.slotted
            ? existing.map((x) => ({ _id: x.id, "data.location": null }))
            : [];
        if (alreadyHasFeat && isFeatValidInSlot) {
            locationUpdates.push({ _id: feat.id, "data.location": location });
        }

        if (locationUpdates.length > 0) {
            changed.push(...(await this.actor.updateEmbeddedDocuments("Item", locationUpdates)));
        }

        return changed;
    }

    /** If a drop target is omitted or turns out to be invalid, make a limited attempt to find an eligible slot */
    private findBestLocation(feat: FeatPF2e): { category: FeatCategory | null; slotId: string | null } {
        if (feat.isFeature) return { category: this.get(feat.featType) ?? null, slotId: null };

        const validCategories = this.filter((g) => g.isFeatValid(feat));
        const category = validCategories.at(0);
        if (validCategories.length === 1 && category && category.id !== "bonus") {
            const slotId = category.slotted
                ? Object.keys(category.slots).find((s) => !category.slots[s].feat) ?? null
                : null;
            return { category, slotId };
        }

        return { category: null, slotId: null };
    }

    assignFeats(): void {
        const slotted = this.contents.filter((category) => category.slotted);
        const categoryBySlot = slotted.reduce((previous: Partial<Record<string, FeatCategory>>, current) => {
            for (const slot of Object.keys(current.slots)) {
                previous[slot] = current;
            }
            return previous;
        }, {});

        // put the feats in their feat slots
        const feats = this.actor.itemTypes.feat.sort((f1, f2) => f1.data.sort - f2.data.sort);
        for (const feat of feats) {
            if (feat.data.flags.pf2e.grantedBy && !feat.data.data.location) {
                const granter = this.actor.items.get(feat.data.flags.pf2e.grantedBy.id);
                if (granter?.isOfType("feat")) continue;
            }

            // We don't handle certain feat types here
            if (["pfsboon", "deityboon", "curse"].includes(feat.featType)) {
                continue;
            }

            const base = this.combineGrants(feat);

            const location = feat.data.data.location;
            const categoryForSlot = categoryBySlot[location ?? ""];
            const slot = categoryForSlot?.slots[location ?? ""];
            if (slot && slot.feat) {
                console.debug(`PF2e System | Multiple feats with same index: ${feat.name}, ${slot.feat.name}`);
                this.unorganized.push(base);
            } else if (slot) {
                slot.feat = feat;
                slot.grants = base.grants;
                feat.category = categoryForSlot;
            } else {
                // Perhaps this belongs to a un-slotted group matched on the location or
                // on the feat type. Failing that, it gets dumped into bonuses.
                const group = this.get(feat.data.data.location ?? "") ?? this.get(feat.featType);
                if (group && !group.slotted) {
                    group.feats.push(base);
                    feat.category = group;
                } else {
                    this.unorganized.push(base);
                }
            }
        }

        this.get("classfeature").feats.sort((a, b) => (a.feat?.level || 0) - (b.feat?.level || 0));
    }
}

interface CharacterFeats {
    get(key: "ancestryfeature"): FeatCategory;
    get(key: "classfeature"): FeatCategory;
    get(key: "ancestry"): FeatCategory;
    get(key: "class"): FeatCategory;
    get(key: "skill"): FeatCategory;
    get(key: "general"): FeatCategory;
    get(key: string): FeatCategory | undefined;
}

class FeatCategory {
    id: string;
    label: string;
    feats: (SlottedFeat | BonusFeat)[] = [];
    /** Whether the feats are slotted by level or free-form */
    slotted = false;
    /** Will move to sheet data later */
    featFilter?: string;

    /** Feat Types that are supported */
    supported: FeatType[] = [];

    /** Lookup for the slots themselves */
    slots: Record<string, SlottedFeat> = {};

    constructor(options: FeatCategoryOptions) {
        this.id = options.id;
        this.label = options.label;
        this.supported = options.supported ?? [];
        this.featFilter = options.featFilter;
        if (options.levels) {
            this.slotted = true;
            for (const level of options.levels) {
                const { id, label } = typeof level === "object" ? level : { id: `${this.id}-${level}`, label: level };
                const slot = { id, level: label, grants: [] };
                this.feats.push(slot);
                this.slots[id] = slot;
            }
        }
    }

    isFeatValid(feat: FeatPF2e): boolean {
        const resolvedFeatType = (() => {
            if (feat.featType === "archetype") {
                if (feat.data.data.traits.value.includes("skill")) {
                    return "skill";
                } else {
                    return "class";
                }
            }

            return feat.featType;
        })();

        return this.supported.length === 0 || this.supported.includes(resolvedFeatType);
    }
}

export { CharacterFeats, FeatCategory, FeatSlotLevel };
