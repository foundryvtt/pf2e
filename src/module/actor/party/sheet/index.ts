import { HitPointsSummary } from "@actor/base.ts";
import { CreaturePF2e, Language, ResourceData } from "@actor/creature/index.ts";
import { ActorSizePF2e } from "@actor/data/size.ts";
import { isReallyPC } from "@actor/helpers.ts";
import { CoinageSummary, InventoryItem, SheetInventory } from "@actor/sheet/data-types.ts";
import { condenseSenses, createBulkPerLabel } from "@actor/sheet/helpers.ts";
import { SaveType } from "@actor/types.ts";
import { SAVE_TYPES } from "@actor/values.ts";
import { PhysicalItemPF2e } from "@item";
import { ZeroToFour } from "@module/data.ts";
import { SheetOptions, coinsToSheetData, createSheetTags } from "@module/sheet/helpers.ts";
import { BaseSvelteState, SvelteApplicationMixin, SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import { Statistic } from "@system/statistic/statistic.ts";
import * as R from "remeda";
import { ApplicationRenderOptions } from "types/foundry/client-esm/applications/_types.js";
import type { DocumentSheetConfiguration } from "types/foundry/client-esm/applications/api/document-sheet.js";
import { PartyPF2e } from "../document.ts";
import Root from "./app.svelte";

interface PartySheetConfiguration extends DocumentSheetConfiguration<PartyPF2e> {}

class PartySheetV2 extends SvelteApplicationMixin(foundry.applications.api.DocumentSheetV2) {
    static override DEFAULT_OPTIONS = {
        position: {
            width: 720,
            height: 720,
        },
        window: {
            contentClasses: ["compact"],
            resizable: true,
        },
        form: {
            submitOnChange: true,
        },
    };

    override root = Root;

    declare options: PartySheetConfiguration;

    override tabGroups = {
        main: "overview",
        summary: "languages",
    };

    get actor(): PartyPF2e {
        return this.document;
    }

    override _canRender(options: ApplicationRenderOptions): false | void {
        if (super._canRender(options) === false) {
            return false;
        }

        if (!options.force && !this.rendered) {
            return false;
        }
    }

    protected override async _prepareContext(): Promise<PartySheetContext> {
        const base = await super._prepareContext();
        const members = this.actor.members;
        const canDistributeCoins =
            game.user.isGM && this.isEditable
                ? this.actor.inventory.coins.copperValue > 0 && members.some(isReallyPC)
                : false;

        const travelSpeed = this.actor.system.attributes.speed.total;
        const restricted = !(game.user.isGM || game.pf2e.settings.metagame.partyStats);

        return {
            ...base,
            state: {
                ...base.state,
                actor: R.pick(this.document, ["id", "name", "img", "uuid", "type"]),
                playerRestricted: !game.pf2e.settings.metagame.partyStats,
                restricted,
                members: this.#prepareMembers(),
                overviewSummary: this.#prepareOverviewSummary(),
                inventorySummary: {
                    totalCoins:
                        R.sumBy(members, (actor) => actor.inventory.coins.goldValue ?? 0) +
                        this.actor.inventory.coins.goldValue,
                    totalWealth:
                        R.sumBy(members, (actor) => actor.inventory.totalWealth.goldValue ?? 0) +
                        this.actor.inventory.totalWealth.goldValue,
                    totalBulk: members
                        .map((actor) => actor.inventory.bulk.value)
                        .reduce((a, b) => a.plus(b), this.actor.inventory.bulk.value),
                },
                inventory: {
                    coinage: this.prepareCoinage(),
                    canDistributeCoins,
                },
                travel: {
                    speed: travelSpeed,
                    feetPerMinute: travelSpeed * 10,
                    milesPerHour: travelSpeed / 10,
                    milesPerDay: travelSpeed * 0.8,
                    activities:
                        Object.entries(CONFIG.PF2E.hexplorationActivities).find(
                            ([max]) => Number(max) >= this.actor.system.attributes.speed.total,
                        )?.[1] ?? 0,
                },

                orphaned: this.actor.items
                    .filter((i) => !i.isOfType(...this.actor.allowedItemTypes))
                    .map((i) => ({
                        ...R.pick(i, ["id", "name", "img", "type"]),
                        isIdentified: "isIdentified" in i ? !!i.isIdentified : null,
                    })),
            },
        };
    }

    #prepareMembers(): MemberBreakdown[] {
        return this.actor.members.map((actor): MemberBreakdown => {
            const observer = actor.testUserPermission(game.user, "OBSERVER");
            const restricted = !(game.pf2e.settings.metagame.partyStats || observer);
            const genderPronouns = actor.isOfType("character")
                ? actor.system.details.gender.value.trim() || null
                : null;
            console.log("MAPPING MEMBER");
            const blurb =
                actor.isOfType("character") && actor.ancestry && actor.class
                    ? game.i18n.format("PF2E.Actor.Character.Blurb", {
                          level: actor.level,
                          ancestry: actor.ancestry.name,
                          class: actor.class.name,
                      })
                    : actor.isOfType("familiar") && actor.master
                      ? game.i18n.format("PF2E.Actor.Familiar.Blurb", { master: actor.master.name })
                      : actor.isOfType("npc")
                        ? actor.system.details.blurb.trim() || null
                        : null;
            const activities = actor.isOfType("character")
                ? actor.system.exploration.map((id) => actor.items.get(id)).filter(R.isTruthy)
                : [];

            const mythicPoints = actor.getResource("mythic-points");
            const heroPoints = isReallyPC(actor) ? actor.getResource("hero-points") : null;

            return {
                // Base actor data and permissions
                actor: R.pick(actor, ["id", "name", "img", "uuid", "type"]),
                owner: actor.isOwner,
                observer,
                limited: observer || actor.limited,
                restricted,

                // View data
                hasBulk: actor.inventory.bulk.encumberedAfter !== Infinity,
                bestSkills: Object.values(actor.skills ?? {})
                    .filter((s) => s.proficient && !s.lore)
                    .sort((a, b) => b.mod - a.mod)
                    .slice(0, 4)
                    .map((s) => ({ slug: s.slug, mod: s.mod, label: s.label, rank: s.rank })),
                genderPronouns,
                blurb,
                resource: mythicPoints?.max ? mythicPoints : heroPoints,
                speed: actor.attributes.speed.total,
                speeds: [
                    { label: "PF2E.Actor.Speed.Label", value: actor.attributes.speed.value },
                    ...actor.attributes.speed.otherSpeeds.map((s) => R.pick(s, ["label", "value"])),
                ],
                senses: (() => {
                    return condenseSenses(actor.perception.senses.contents).map((r) => ({
                        acuity: r.acuity,
                        labelFull: r.label ?? "",
                        label: CONFIG.PF2E.senses[r.type] ?? r.type,
                    }));
                })(),
                hp: actor.hitPoints,
                ac: actor.attributes.ac.value,
                saves: R.mapToObj(SAVE_TYPES, (s) => [s, actor.saves[s].mod]),
                perception: {
                    ...R.pick(actor.perception, ["label", "rank", "mod"]),
                    dc: actor.perception.dc.value,
                },
                activities: activities.map((action) => ({
                    uuid: action.uuid,
                    name: action.name,
                    img: action.img,
                    traits: createSheetTags(CONFIG.PF2E.actionTraits, action.system.traits?.value ?? []),
                })),
                totalWealth: actor.inventory.totalWealth.goldValue,
                bulk: actor.inventory.bulk.value.toString(),
            };
        });
    }

    #prepareOverviewSummary(): PartySheetState["overviewSummary"] | null {
        const members = this.actor.members;
        if (members.length === 0) return null;

        // Get all member languages. If the common language is taken, replace with "common" explicitly
        const commonLanguage = game.pf2e.settings.campaign.languages.commonLanguage;
        const allLanguages = new Set(members.flatMap((m) => m.system.details.languages?.value ?? []));
        if (commonLanguage && allLanguages.delete(commonLanguage)) {
            allLanguages.add("common");
        }

        const baseKnowledgeSkills = [
            "arcana",
            "nature",
            "occultism",
            "religion",
            "crafting",
            "society",
            "medicine",
        ] as const;

        const loreSkills = new Set(
            members
                .flatMap((m) => Object.values(m.skills))
                .filter((s) => s.lore)
                .map((s) => s.slug),
        );

        function getBestSkill(slug: string): SkillSheetData | null {
            const bestMember = R.firstBy(members, [(m) => m.skills[slug]?.mod ?? -Infinity, "desc"]);
            const statistic = bestMember?.skills[slug];
            return statistic ? R.pick(statistic, ["slug", "mod", "label", "rank"]) : null;
        }

        return {
            languages: R.sortBy(
                [...allLanguages].map(
                    (language): LanguageSheetData => ({
                        slug: language,
                        label:
                            language === "common" && commonLanguage
                                ? game.i18n.format("PF2E.Actor.Creature.Language.CommonLanguage", {
                                      language: game.i18n.localize(CONFIG.PF2E.languages[commonLanguage]),
                                  })
                                : game.i18n.localize(CONFIG.PF2E.languages[language]),
                        actors: this.#getActorsThatUnderstand(language),
                    }),
                ),
                (l) => (l.slug === "common" ? "" : l.label),
            ),
            skills: R.sortBy(
                Object.entries(CONFIG.PF2E.skills).map(([slug, { label }]): SkillSheetData => {
                    const best = getBestSkill(slug);
                    return best ?? { mod: 0, label, slug, rank: 0 };
                }),
                (s) => s.label,
            ),
            knowledge: {
                regular: baseKnowledgeSkills.map(getBestSkill).filter(R.isTruthy),
                lore: R.sortBy([...loreSkills].map(getBestSkill).filter(R.isTruthy), (s) => s.label),
            },
        };
    }

    protected prepareCoinage(): CoinageSheetData {
        const coins = this.actor.inventory.coins;
        return {
            coins: coinsToSheetData(coins),
            totalCoins: coins.goldValue,
            totalWealth: this.actor.inventory.totalWealth.goldValue,
        };
    }

    protected prepareInventory(): SheetInventory {
        const sections: SheetInventory["sections"] = [
            {
                label: game.i18n.localize("PF2E.Actor.Inventory.Section.WeaponsAndShields"),
                types: ["weapon", "shield"],
                items: [],
            },
            { label: game.i18n.localize("TYPES.Item.armor"), types: ["armor"], items: [] },
            { label: game.i18n.localize("TYPES.Item.equipment"), types: ["equipment"], items: [] },
            {
                label: game.i18n.localize("PF2E.Item.Consumable.Plural"),
                types: ["consumable"],
                items: [],
            },
            { label: game.i18n.localize("TYPES.Item.treasure"), types: ["treasure"], items: [] },
            { label: game.i18n.localize("PF2E.Item.Container.Plural"), types: ["backpack"], items: [] },
        ];

        const actor = this.actor.clone({}, { keepId: true });
        for (const item of actor.inventory.contents.sort((a, b) => (a.sort || 0) - (b.sort || 0))) {
            if (item.isInContainer) continue;
            const section = sections.find((s) => s.types.includes(item.type));
            section?.items.push(this.prepareInventoryItem(item));
        }

        return {
            sections,
            bulk: actor.inventory.bulk,
            showValueAlways: actor.isOfType("npc", "loot", "party"),
            showUnitBulkPrice: false,
            hasStowedWeapons:
                actor.itemTypes.weapon.some((i) => i.isStowed) || actor.itemTypes.shield.some((i) => i.isStowed),
            hasStowingContainers: actor.itemTypes.backpack.some((c) => c.system.stowing && !c.isInContainer),
            invested: actor.inventory.invested,
        };
    }

    protected prepareInventoryItem(item: PhysicalItemPF2e): InventoryItem {
        const editable = game.user.isGM || item.isIdentified;
        const heldItems = item.isOfType("backpack") ? item.contents.map((i) => this.prepareInventoryItem(i)) : null;
        heldItems?.sort((a, b) => (a.item.sort || 0) - (b.item.sort || 0));

        const actor = this.actor;
        const actorSize = new ActorSizePF2e({ value: actor.size });
        const itemSize = new ActorSizePF2e({ value: item.size });
        const sizeDifference = itemSize.difference(actorSize, { smallIsMedium: true });

        return {
            item,
            canBeEquipped: !item.isStowed,
            hasCharges: item.isOfType("consumable") && item.system.uses.max > 0,
            heldItems,
            isContainer: item.isOfType("backpack"),
            isInvestable: false,
            isSellable: editable && item.isOfType("treasure") && !item.isCoinage,
            itemSize: sizeDifference !== 0 ? itemSize : null,
            unitBulk: actor.isOfType("loot") ? createBulkPerLabel(item) : null,
            hidden: false,
        };
    }

    #getActorsThatUnderstand(slug: Language) {
        return this.actor.members.filter((m): m is CreaturePF2e => !!m?.system.details.languages?.value.includes(slug));
    }
}

interface PartySheetContext extends SvelteApplicationRenderContext {
    state: PartySheetState;
}

interface PartySheetState extends BaseSvelteState {
    actor: ActorViewData;

    /** Is the sheet restricted to players? */
    playerRestricted: boolean;
    /** Is the sheet restricted to the current user? */
    restricted: boolean;

    members: MemberBreakdown[];

    overviewSummary: OverviewSummary | null;
    inventorySummary: {
        totalCoins: number;
        totalWealth: number;
        totalBulk: unknown;
    };
    inventory: {
        coinage: CoinageSheetData;
        canDistributeCoins: boolean;
    };
    travel: {
        speed: number;
        feetPerMinute: number;
        milesPerHour: number;
        milesPerDay: number;
        activities: number;
    };

    /** Unsupported items on the sheet, may occur due to disabled campaign data */
    orphaned: {
        id: string;
        name: string;
        type: string;
        img: string;
        isIdentified: boolean | null;
    }[];
}

interface SkillSheetData {
    slug: string;
    label: string;
    mod: number;
    rank?: ZeroToFour | null;
}

interface MemberBreakdown {
    actor: ActorViewData;
    /** If the actor is owned by the current user */
    owner: boolean;
    /** If the actor has observer or greater permission */
    observer: boolean;
    /** If the actor has limited or greater permission */
    limited: boolean;
    /** If true, the current user is restricted from seeing meta details */
    restricted: boolean;

    genderPronouns: string | null;
    blurb: string | null;
    resource: ResourceData | null;
    hasBulk: boolean;
    bestSkills: SkillSheetData[];

    speed: number;
    speeds: { label: string; value: number }[];
    senses: { label: string; labelFull: string; acuity?: string }[];
    hp: HitPointsSummary;
    ac: number;
    saves: Record<SaveType, number>;
    perception: Pick<Statistic, "label" | "rank" | "mod"> & { dc: number };

    activities: {
        uuid: string;
        name: string;
        img: string;
        traits: SheetOptions;
    }[];

    totalWealth: number;
    bulk: string;
}

interface OverviewSummary {
    languages: LanguageSheetData[];
    skills: SkillSheetData[];
    knowledge: {
        regular: SkillSheetData[];
        lore: SkillSheetData[];
    };
}

interface ActorViewData {
    id: string;
    name: string;
    img: string;
    uuid: string;
    type: string;
}

interface LanguageSheetData {
    slug: string;
    label: string;
    actors: unknown[];
}

interface CoinageSheetData {
    coins: CoinageSummary;
    totalCoins: number;
    totalWealth: number;
}

export { PartySheetV2 };
export type { CoinageSheetData, MemberBreakdown, PartySheetContext, PartySheetState, SkillSheetData };
