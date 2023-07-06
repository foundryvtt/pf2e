import * as R from "remeda";
import { localizer } from "@util";
import {
    KingdomAbility,
    KingdomCHG,
    KingdomGovernment,
    KingdomLeadershipRole,
    KingdomNationType,
    KingdomSkill,
} from "./data.ts";
import { ModifierAdjustment, RawModifier } from "@actor/modifiers.ts";

const KINGDOM_ABILITIES = ["culture", "economy", "loyalty", "stability"] as const;
const KINGDOM_ABILITY_LABELS = R.mapToObj(KINGDOM_ABILITIES, (a) => [a, `PF2E.Kingmaker.Abilities.${a}`]);

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

const KINGDOM_COMMODITIES = ["food", "lumber", "luxuries", "ore", "stone"] as const;

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

const KINGDOM_SKILL_LABELS = R.mapToObj(KINGDOM_SKILLS, (a) => [a, `PF2E.Kingmaker.Skills.${a}`]);

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

const CONTROL_DC_BY_LEVEL = [14, 15, 16, 18, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32, 34, 35, 36, 38, 39, 40];
const KINGDOM_SIZE_DATA = {
    1: { faces: 4, type: "territory", controlMod: 0 },
    10: { faces: 6, type: "province", controlMod: 1 },
    25: { faces: 8, type: "state", controlMod: 2 },
    50: { faces: 10, type: "country", controlMod: 3 },
    100: { faces: 12, type: "dominion", controlMod: 4 },
} satisfies Record<number, { faces: number; type: KingdomNationType; controlMod: number }>;

const vacancyLabel = (role: KingdomLeadershipRole) =>
    game.i18n.format("PF2E.Kingmaker.Kingdom.VacantRole", {
        role: game.i18n.localize(`PF2E.Kingmaker.Kingdom.Leadership.${role}`),
    });

type VacancyPenalty = { adjustments?: ModifierAdjustment[]; modifiers?: Record<string, RawModifier[]> };
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
            "kingdom-check": [
                { slug: "vacancy", label: vacancyLabel("general"), modifier: -4, predicate: ["warfare"] },
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
            "kingdom-check": [
                { slug: "vacancy", label: vacancyLabel("magister"), modifier: -4, predicate: ["warfare"] },
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
            "kingdom-check": [{ slug: "vacancy", label: vacancyLabel("warden"), modifier: -4, predicate: ["region"] }],
        },
    }),
};

function getKingdomABCData(): {
    charter: Record<string, KingdomCHG | undefined>;
    heartland: Record<string, KingdomCHG | undefined>;
    government: Record<string, KingdomGovernment | undefined>;
} {
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
                flaw: null,
            },
            hillOrPlain: {
                name: localize("Heartland.hillOrPlain.Name"),
                description: localize("Heartland.hillOrPlain.Description"),
                img: "/icons/environment/creatures/horses.webp",
                boosts: ["loyalty"],
                flaw: null,
            },
            lakeOrRiver: {
                name: localize("Heartland.lakeOrRiver.Name"),
                description: localize("Heartland.lakeOrRiver.Description"),
                img: "/icons/environment/settlement/bridge-stone.webp",
                boosts: ["economy"],
                flaw: null,
            },
            mountainOrRuins: {
                name: localize("Heartland.mountainOrRuins.Name"),
                description: localize("Heartland.mountainOrRuins.Description"),
                img: "/icons/environment/wilderness/cave-entrance-mountain.webp",
                boosts: ["stability"],
                flaw: null,
            },
        },
        government: {
            despotism: {
                name: localize("Government.despotism.Name"),
                description: localize("Government.despotism.Description"),
                img: "/icons/environment/settlement/pyramid.webp",
                boosts: ["stability", "economy", "free"],
                flaw: null,
                skills: [],
            },
            feudalism: {
                name: localize("Government.feudalism.Name"),
                description: localize("Government.feudalism.Description"),
                img: "/icons/environment/settlement/watchtower-cliff.webp",
                boosts: ["stability", "culture", "free"],
                flaw: null,
                skills: [],
            },
            oligarchy: {
                name: localize("Government.oligarchy.Name"),
                description: localize("Government.oligarchy.Description"),
                img: "/icons/environment/settlement/house-manor.webp",
                boosts: ["loyalty", "economy", "free"],
                flaw: null,
                skills: [],
            },
            republic: {
                name: localize("Government.republic.Name"),
                description: localize("Government.republic.Description"),
                img: "/icons/environment/settlement/gazebo.webp",
                boosts: ["stability", "economy", "free"],
                flaw: null,
                skills: [],
            },
            thaumocracy: {
                name: localize("Government.thaumocracy.Name"),
                description: localize("Government.thaumocracy.Description"),
                img: "/icons/environment/settlement/wizard-castle.webp",
                boosts: ["economy", "culture", "free"],
                flaw: null,
                skills: [],
            },
            yeomanry: {
                name: localize("Government.yeomanry.Name"),
                description: localize("Government.yeomanry.Description"),
                img: "/icons/environment/settlement/house-farmland-small.webp",
                boosts: ["loyalty", "culture", "free"],
                flaw: null,
                skills: [],
            },
        },
    };
}

export {
    CONTROL_DC_BY_LEVEL,
    KINGDOM_ABILITIES,
    KINGDOM_ABILITY_LABELS,
    KINGDOM_COMMODITIES,
    KINGDOM_SIZE_DATA,
    KINGDOM_SKILLS,
    KINGDOM_SKILL_ABILITIES,
    KINGDOM_SKILL_LABELS,
    KINGDOM_LEADERSHIP,
    VACANCY_PENALTIES,
    getKingdomABCData,
};
