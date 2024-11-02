import type { CharacterPF2e } from "@actor";
import type { FeatPF2e, ItemPF2e } from "@item";
import { sluggify } from "@util";
import * as R from "remeda";
import { FeatGroup } from "./group.ts";
import { FeatGroupData, FeatSlotData } from "./types.ts";

class CharacterFeats<TActor extends CharacterPF2e> extends Collection<FeatGroup<TActor>> {
    /** Feats belonging no actual group ("bonus feats" in rules text) */
    bonus: FeatGroup<TActor>;

    constructor(private actor: TActor) {
        super();

        const classFeatSlots = actor.class?.grantedFeatSlots;

        this.bonus = new FeatGroup(actor, {
            id: "bonus",
            label: "PF2E.Actor.Character.FeatSlot.BonusHeader",
        });

        this.createGroup({
            id: "ancestryfeature",
            label: "PF2E.Actor.Character.FeatSlot.AncestryFeaturesHeader",
            supported: ["ancestryfeature"],
        });
        this.createGroup({
            id: "classfeature",
            label: "PF2E.Actor.Character.FeatSlot.ClassFeaturesHeader",
            supported: ["classfeature"],
            sorted: true,
        });

        const ancestry = actor.system.details.ancestry;
        this.createGroup({
            id: "ancestry",
            label: "PF2E.Actor.Character.FeatSlot.AncestryHeader",
            supported: ["ancestry"],
            filter: {
                traits: ancestry?.countsAs.flatMap((t) => (t in CONFIG.PF2E.featTraits ? t : [])) ?? [],
            },
            slots: classFeatSlots?.ancestry ?? [],
        });

        // Attempt to acquire the trait corresponding with actor's class, falling back to homebrew variations
        const classTrait = ((): string | null => {
            const slug = actor.class ? (actor.class.slug ?? sluggify(actor.class.name)) : null;
            return slug && slug in CONFIG.PF2E.featTraits ? slug : null;
        })();

        const hasDedicationFeat = this.actor.itemTypes.feat.some((f) => f.traits.has("dedication"));
        this.createGroup({
            id: "class",
            label: "PF2E.Actor.Character.FeatSlot.ClassHeader",
            supported: ["class"],
            filter: {
                traits: [classTrait, hasDedicationFeat ? "archetype" : "dedication"].filter((t): t is string => !!t),
            },
            slots: classFeatSlots?.class ?? [],
        });

        const evenLevels = new Array(actor.level)
            .fill(0)
            .map((_, idx) => idx + 1)
            .filter((idx) => idx % 2 === 0);

        // Add free archetype (if active)
        if (game.pf2e.settings.variants.fa) {
            this.createGroup({
                id: "archetype",
                label: "PF2E.Actor.Character.FeatSlot.ArchetypeHeader",
                supported: ["class"],
                filter: {
                    traits: [
                        this.actor.itemTypes.feat.some((f) => f.traits.has("dedication")) ? "archetype" : "dedication",
                    ],
                },
                slots: evenLevels,
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
            label: "PF2E.Actor.Character.FeatSlot.SkillHeader",
            supported: ["skill"],
            slots: [backgroundSkillFeats, classFeatSlots?.skill].flat().filter(R.isTruthy),
        });

        this.createGroup({
            id: "general",
            label: "PF2E.Actor.Character.FeatSlot.GeneralHeader",
            supported: ["general", "skill"],
            slots: classFeatSlots?.general ?? [],
        });

        // Add mythic if enabled
        const mythicSetting = game.pf2e.settings.campaign.mythic;
        if (mythicSetting !== "disabled") {
            this.createGroup({
                id: "mythic",
                label: "PF2E.Actor.Character.FeatSlot.MythicHeader",
                placeholder: "PF2E.Actor.Character.FeatSlot.MythicFeatPlaceholder",
                customLimit:
                    mythicSetting === "variant-tiers"
                        ? {
                              label: "Tier",
                              min: 0,
                              max: 10,
                          }
                        : null,
                filter: {
                    traits: ["mythic"],
                },
                slots: [
                    {
                        id: "mythic-calling",
                        label: "PF2E.Actor.Character.FeatSlot.MythicCallingShort",
                        placeholder: "PF2E.Actor.Character.FeatSlot.MythicCallingPlaceholder",
                        filter: {
                            traits: ["calling"],
                        },
                    },
                    ...[2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map((level, idx): FeatSlotData => {
                        const tier = mythicSetting === "variant-tiers" ? idx + 1 : null;
                        const label = String(mythicSetting === "variant-tiers" ? idx + 1 : level);
                        const base = { id: `mythic-${level}`, level, tier, label };
                        if (level === 12) {
                            return {
                                ...base,
                                placeholder: "PF2E.Actor.Character.FeatSlot.MythicDestinyPlaceholder",
                                filter: {
                                    traits: ["destiny"],
                                },
                            };
                        }

                        return {
                            ...base,
                            filter: {
                                categories: ["class"],
                                traits: ["mythic"],
                                omitTraits: ["calling", "destiny"],
                                conjunction: "and",
                            },
                        };
                    }),
                ],
                requiresInitial: true,
            });
        }

        // Add campaign feats if enabled
        if (game.pf2e.settings.campaign.feats.enabled) {
            this.createGroup({ id: "campaign", label: "PF2E.Actor.Character.FeatSlot.CampaignHeader" });
        }
    }

    createGroup(data: FeatGroupData): FeatGroup {
        const group = new FeatGroup(this.actor, data);
        this.set(data.id, group);
        return group;
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
            const slotId = group.slotted ? (Object.values(group.slots).find((slot) => !slot?.feat)?.id ?? null) : null;
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
            if (!group?.assignFeat(feat)) this.bonus.assignFeat(feat);
        }

        // Run all post assignment tasks
        for (const group of this) {
            group.postProcess();
        }
    }
}

function isBoonOrCurse(feat: FeatPF2e) {
    return ["pfsboon", "deityboon", "curse"].includes(feat.category);
}

export { CharacterFeats };
