import * as R from "remeda";
import { localizer } from "@util";
import { KingdomCHG, KingdomGovernment } from "./data.ts";

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
const KINGDOM_COMMODITIES = ["food", "lumber", "luxuries", "ore", "stone"] as const;

const KINGDOM_ABILITY_LABELS = R.mapToObj(KINGDOM_ABILITIES, (a) => [a, `PF2E.Kingmaker.Abilities.${a}`]);

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

export { KINGDOM_ABILITIES, KINGDOM_ABILITY_LABELS, KINGDOM_COMMODITIES, getKingdomABCData, KINGDOM_LEADERSHIP };
