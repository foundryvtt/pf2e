import * as R from "remeda";
import { localizer } from "@util";
import {
    KingdomAbility,
    KingdomCHG,
    KingdomCharter,
    KingdomGovernment,
    KingdomLeadershipRole,
    KingdomNationType,
    KingdomSettlementType,
    KingdomSkill,
} from "./types.ts";
import { ModifierAdjustment, RawModifier } from "@actor/modifiers.ts";

const KINGDOM_ABILITIES = ["culture", "economy", "loyalty", "stability"] as const;
const KINGDOM_LEADERSHIP = [
    "ruler",
    "counselor",
    "general",
    "emissary",
    "magister",
    "treasurer",
    "viceroy",
    "warden",
] as const;
const KINGDOM_COMMODITIES = ["food", "luxuries", "lumber", "ore", "stone"] as const;
const KINGDOM_SKILLS = [
    "agriculture",
    "arts",
    "boating",
    "defense",
    "engineering",
    "exploration",
    "folklore",
    "industry",
    "intrigue",
    "magic",
    "politics",
    "scholarship",
    "statecraft",
    "trade",
    "warfare",
    "wilderness",
] as const;

const KINGDOM_LEADERSHIP_ABILITIES: Record<KingdomLeadershipRole, KingdomAbility> = {
    ruler: "loyalty",
    counselor: "culture",
    general: "stability",
    emissary: "loyalty",
    magister: "culture",
    treasurer: "economy",
    viceroy: "economy",
    warden: "stability",
};

const KINGDOM_SKILL_ABILITIES: Record<KingdomSkill, KingdomAbility> = {
    agriculture: "stability",
    arts: "culture",
    boating: "economy",
    defense: "stability",
    engineering: "stability",
    exploration: "economy",
    folklore: "culture",
    industry: "economy",
    intrigue: "loyalty",
    magic: "culture",
    politics: "loyalty",
    scholarship: "culture",
    statecraft: "loyalty",
    trade: "economy",
    warfare: "loyalty",
    wilderness: "stability",
};

const KINGDOM_ABILITY_LABELS = R.mapToObj(KINGDOM_ABILITIES, (a) => [a, `PF2E.Kingmaker.Abilities.${a}`]);

const KINGDOM_COMMODITY_LABELS = R.mapToObj(KINGDOM_COMMODITIES, (c) => [c, `PF2E.Kingmaker.Kingdom.Commodity.${c}`]);

/** Ruin label by ability slug */
const KINGDOM_RUIN_LABELS = {
    culture: "PF2E.Kingmaker.Kingdom.Ruin.corruption",
    economy: "PF2E.Kingmaker.Kingdom.Ruin.crime",
    stability: "PF2E.Kingmaker.Kingdom.Ruin.decay",
    loyalty: "PF2E.Kingmaker.Kingdom.Ruin.strife",
};

const KINGDOM_SKILL_LABELS = R.mapToObj(KINGDOM_SKILLS, (a) => [a, `PF2E.Kingmaker.Skills.${a}`]);

interface KingdomSizeData {
    faces: number;
    type: KingdomNationType;
    controlMod: number;
    storage: number;
}

const CONTROL_DC_BY_LEVEL = [14, 15, 16, 18, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32, 34, 35, 36, 38, 39, 40];
const KINGDOM_SIZE_DATA = {
    1: { faces: 4, type: "territory", controlMod: 0, storage: 4 },
    10: { faces: 6, type: "province", controlMod: 1, storage: 8 },
    25: { faces: 8, type: "state", controlMod: 2, storage: 12 },
    50: { faces: 10, type: "country", controlMod: 3, storage: 16 },
    100: { faces: 12, type: "dominion", controlMod: 4, storage: 20 },
} satisfies Record<number, KingdomSizeData>;

const KINGDOM_SETTLEMENT_TYPES = ["village", "town", "city", "metropolis"] as const;
const KINGDOM_SETTLEMENT_TYPE_LABELS = R.mapToObj(KINGDOM_SETTLEMENT_TYPES, (size) => [
    size,
    `PF2E.Kingmaker.Settlement.Type.${size}`,
]);

interface KingdomSettlementTypeData {
    blocks: number;
    population: [number, number];
    level: [number, number];
    consumption: number;
    maxItemBonus: number;
    influence: number;
}

const KINGDOM_SETTLEMENT_TYPE_DATA = {
    village: { blocks: 1, population: [0, 400], level: [1, 1], consumption: 1, maxItemBonus: 1, influence: 0 },
    town: { blocks: 4, population: [401, 2000], level: [2, 4], consumption: 2, maxItemBonus: 1, influence: 1 },
    city: { blocks: 9, population: [2001, 25000], level: [5, 9], consumption: 4, maxItemBonus: 2, influence: 2 },
    metropolis: {
        blocks: Infinity,
        population: [25001, Infinity],
        level: [10, Infinity],
        consumption: 6,
        maxItemBonus: 3,
        influence: 3,
    },
} satisfies Record<KingdomSettlementType, KingdomSettlementTypeData>;

const vacancyLabel = (role: KingdomLeadershipRole) =>
    game.i18n.format("PF2E.Kingmaker.Kingdom.VacantRole", {
        role: game.i18n.localize(`PF2E.Kingmaker.Kingdom.LeadershipRole.${role}`),
    });

type VacancyPenalty = {
    adjustments?: Record<string, ModifierAdjustment[]>;
    modifiers?: Record<string, (RawModifier & { slug: string })[]>;
};
const VACANCY_PENALTIES: Record<KingdomLeadershipRole, () => VacancyPenalty> = {
    ruler: () => ({
        // ruler vacancy stacks with all sources
        modifiers: {
            "kingdom-check": [{ slug: "vacancy-ruler", label: vacancyLabel("ruler"), modifier: -1 }],
            "control-dc": [{ slug: "vacancy-ruler", label: vacancyLabel("ruler"), modifier: 2 }],
        },
    }),
    counselor: () => ({
        modifiers: {
            "culture-based": [{ slug: "vacancy", label: vacancyLabel("counselor"), modifier: -1 }],
        },
    }),
    general: () => ({
        modifiers: {
            warfare: [
                {
                    slug: "vacancy",
                    label: vacancyLabel("general"),
                    modifier: 0,
                },
            ],
        },
        adjustments: {
            warfare: [
                {
                    slug: "vacancy",
                    test: () => true,
                    relabel: vacancyLabel("general"),
                    getNewValue: () => -4,
                },
            ],
        },
    }),
    emissary: () => ({
        modifiers: {
            "loyalty-based": [{ slug: "vacancy", label: vacancyLabel("emissary"), modifier: -1 }],
        },
    }),
    magister: () => ({
        modifiers: {
            warfare: [
                {
                    slug: "vacancy",
                    label: vacancyLabel("magister"),
                    modifier: 0,
                },
            ],
        },
        adjustments: {
            warfare: [
                {
                    slug: "vacancy",
                    test: () => true,
                    relabel: vacancyLabel("magister"),
                    getNewValue: () => -4,
                },
            ],
        },
    }),
    treasurer: () => ({
        modifiers: {
            "economy-based": [{ slug: "vacancy", label: vacancyLabel("treasurer"), modifier: -1 }],
        },
    }),
    viceroy: () => ({
        modifiers: {
            "stability-based": [{ slug: "vacancy", label: vacancyLabel("viceroy"), modifier: -1 }],
        },
    }),
    warden: () => ({
        modifiers: {
            "kingdom-check": [
                {
                    slug: "vacancy",
                    label: vacancyLabel("warden"),
                    modifier: 0,
                },
            ],
        },
        adjustments: {
            "kingdom-check": [
                {
                    slug: "vacancy",
                    test: (options) => [...options].includes("region"),
                    relabel: vacancyLabel("warden"),
                    getNewValue: () => -4,
                },
            ],
        },
    }),
};

interface KingdomCHGData {
    charter: Record<string, KingdomCharter | undefined>;
    heartland: Record<string, KingdomCHG | undefined>;
    government: Record<string, KingdomGovernment | undefined>;
}

/** Returns every single possible charter, heartland, and government */
function getKingdomCHGData(): KingdomCHGData {
    const localize = localizer("PF2E.Kingmaker");
    return {
        charter: {
            conquest: {
                name: localize("Charter.conquest.Name"),
                description: localize("Charter.conquest.Description"),
                img: "/icons/weapons/swords/sword-guard-steel-green.webp",
                boosts: ["loyalty", "free"],
                flaw: "culture",
            },
            expansion: {
                name: localize("Charter.expansion.Name"),
                description: localize("Charter.expansion.Description"),
                img: "/icons/skills/trades/woodcutting-logging-axe-stump.webp",
                boosts: ["culture", "free"],
                flaw: "stability",
            },
            exploration: {
                name: localize("Charter.exploration.Name"),
                description: localize("Charter.exploration.Description"),
                img: "/icons/tools/navigation/map-chart-tan.webp",
                boosts: ["stability", "free"],
                flaw: "economy",
            },
            grant: {
                name: localize("Charter.grant.Name"),
                description: localize("Charter.grant.Description"),
                img: "/icons/skills/trades/academics-merchant-scribe.webp",
                boosts: ["economy", "free"],
                flaw: "loyalty",
            },
            open: {
                name: localize("Charter.open.Name"),
                description: localize("Charter.open.Description"),
                img: "/icons/sundries/documents/document-sealed-brown-red.webp",
                boosts: ["free"],
                flaw: null,
            },
        },
        heartland: {
            forestOrSwamp: {
                name: localize("Heartland.forestOrSwamp.Name"),
                description: localize("Heartland.forestOrSwamp.Description"),
                img: "/icons/environment/wilderness/tree-oak.webp",
                boosts: ["culture"],
            },
            hillOrPlain: {
                name: localize("Heartland.hillOrPlain.Name"),
                description: localize("Heartland.hillOrPlain.Description"),
                img: "/icons/environment/creatures/horses.webp",
                boosts: ["loyalty"],
            },
            lakeOrRiver: {
                name: localize("Heartland.lakeOrRiver.Name"),
                description: localize("Heartland.lakeOrRiver.Description"),
                img: "/icons/environment/settlement/bridge-stone.webp",
                boosts: ["economy"],
            },
            mountainOrRuins: {
                name: localize("Heartland.mountainOrRuins.Name"),
                description: localize("Heartland.mountainOrRuins.Description"),
                img: "/icons/environment/wilderness/cave-entrance-mountain.webp",
                boosts: ["stability"],
            },
        },
        government: {
            despotism: {
                name: localize("Government.despotism.Name"),
                description: localize("Government.despotism.Description"),
                img: "/icons/environment/settlement/pyramid.webp",
                boosts: ["stability", "economy", "free"],
                skills: ["intrigue", "warfare"],
                feat: "Compendium.pf2e.kingmaker-features.Item.WGpkcIChjIk1i0q0", // Crush Dissent
            },
            feudalism: {
                name: localize("Government.feudalism.Name"),
                description: localize("Government.feudalism.Description"),
                img: "/icons/environment/settlement/watchtower-cliff.webp",
                boosts: ["stability", "culture", "free"],
                skills: ["defense", "trade"],
                feat: "Compendium.pf2e.kingmaker-features.Item.JYY8vQxPe9AIGTvv", // Fortified Fiefs
            },
            oligarchy: {
                name: localize("Government.oligarchy.Name"),
                description: localize("Government.oligarchy.Description"),
                img: "/icons/environment/settlement/house-manor.webp",
                boosts: ["loyalty", "economy", "free"],
                skills: ["arts", "industry"],
                feat: "Compendium.pf2e.kingmaker-features.Item.9dkyZ7r1z7loOxI7", // Insider Trading
            },
            republic: {
                name: localize("Government.republic.Name"),
                description: localize("Government.republic.Description"),
                img: "/icons/environment/settlement/gazebo.webp",
                boosts: ["stability", "economy", "free"],
                skills: ["engineering", "politics"],
                feat: "Compendium.pf2e.kingmaker-features.Item.BChcBEZpcqMnLISC", // Pull Together
            },
            thaumocracy: {
                name: localize("Government.thaumocracy.Name"),
                description: localize("Government.thaumocracy.Description"),
                img: "/icons/environment/settlement/wizard-castle.webp",
                boosts: ["economy", "culture", "free"],
                skills: ["folklore", "magic"],
                feat: "Compendium.pf2e.kingmaker-features.Item.nDDEbrWj2JouxlRw", // Practical Magic,
            },
            yeomanry: {
                name: localize("Government.yeomanry.Name"),
                description: localize("Government.yeomanry.Description"),
                img: "/icons/environment/settlement/house-farmland-small.webp",
                boosts: ["loyalty", "culture", "free"],
                skills: ["agriculture", "wilderness"],
                feat: "Compendium.pf2e.kingmaker-features.Item.WFng3pxgEAdpdy1p", // Muddle Through
            },
        },
    };
}

export {
    CONTROL_DC_BY_LEVEL,
    getKingdomCHGData,
    KINGDOM_ABILITIES,
    KINGDOM_ABILITY_LABELS,
    KINGDOM_COMMODITIES,
    KINGDOM_COMMODITY_LABELS,
    KINGDOM_LEADERSHIP_ABILITIES,
    KINGDOM_LEADERSHIP,
    KINGDOM_RUIN_LABELS,
    KINGDOM_SETTLEMENT_TYPE_DATA,
    KINGDOM_SETTLEMENT_TYPE_LABELS,
    KINGDOM_SETTLEMENT_TYPES,
    KINGDOM_SIZE_DATA,
    KINGDOM_SKILL_ABILITIES,
    KINGDOM_SKILL_LABELS,
    KINGDOM_SKILLS,
    VACANCY_PENALTIES,
};

export type { KingdomCHGData };
