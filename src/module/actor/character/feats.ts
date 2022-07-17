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
    unorganized = new Array<BonusFeat>();

    constructor(private actor: CharacterPF2e) {
        super();

        const classFeatSlots = actor.class?.grantedFeatSlots;
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
            .map((_, idx) => idx)
            .filter((idx) => idx && idx % 2 === 0);

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
            levels: classFeatSlots?.skill ?? [],
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

        // Add background skill feat slot
        const background = actor.background;
        if (background && Object.keys(background.data.data.items).length > 0) {
            this.get("skill").feats.unshift({
                id: background.id,
                level: game.i18n.localize("PF2E.FeatBackgroundShort"),
                grants: [],
            });
        }
    }

    createCategory(options: FeatCategoryOptions) {
        this.set(options.id, new FeatCategory(options));
    }

    private combineGrants(feat: FeatPF2e) {
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

    async insertFeat(feat: FeatPF2e, options: { categoryId: string; slotId?: string }): Promise<ItemPF2e[]> {
        const { categoryId, slotId } = options;
        const group = this.get(categoryId);
        const location = group?.slotted ? slotId ?? "" : categoryId;
        const isFeatValidInSlot = group?.isFeatValid(feat);
        const alreadyHasFeat = this.actor.items.has(feat.id);
        const existing = this.actor.itemTypes.feat.filter((x) => x.data.data.location === location);

        // Handle case where its actually dragging away from a location
        if (alreadyHasFeat && feat.data.data.location && !isFeatValidInSlot) {
            return this.actor.updateEmbeddedDocuments("Item", [{ _id: feat.id, "data.location": "" }]);
        }

        const changed: ItemPF2e[] = [];

        // If this is a new feat, create a new feat item on the actor first
        if (!alreadyHasFeat && isFeatValidInSlot) {
            const source = feat.toObject();
            source.data.location = location;
            changed.push(...(await this.actor.createEmbeddedDocuments("Item", [source])));
        }

        // Determine what feats we have to move around
        const locationUpdates = group?.slotted ? existing.map((x) => ({ _id: x.id, "data.location": "" })) : [];
        if (alreadyHasFeat && isFeatValidInSlot) {
            locationUpdates.push({ _id: feat.id, "data.location": location });
        }

        if (locationUpdates.length > 0) {
            changed.push(...(await this.actor.updateEmbeddedDocuments("Item", locationUpdates)));
        }

        return changed;
    }

    assignFeats() {
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
                console.debug(`Foundry VTT | Multiple feats with same index: ${feat.name}, ${slot.feat.name}`);
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
