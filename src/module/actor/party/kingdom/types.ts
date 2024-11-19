import type {
    KINGDOM_ABILITIES,
    KINGDOM_COMMODITIES,
    KINGDOM_LEADERSHIP,
    KINGDOM_SETTLEMENT_TYPES,
    KINGDOM_SKILLS,
} from "./values.ts";

type KingdomAbility = (typeof KINGDOM_ABILITIES)[number];
type KingdomBoostCategory = "charter" | "heartland" | "government" | "1" | "5" | "10" | "15" | "20";
type KingdomSkill = (typeof KINGDOM_SKILLS)[number];
type KingdomLeadershipRole = (typeof KINGDOM_LEADERSHIP)[number];
type KingdomCommodity = (typeof KINGDOM_COMMODITIES)[number];
type KingdomNationType = "territory" | "province" | "state" | "country" | "dominion";
type KingdomSettlementType = (typeof KINGDOM_SETTLEMENT_TYPES)[number];

type FameType = "fame" | "infamy";

export type {
    FameType,
    KingdomAbility,
    KingdomBoostCategory,
    KingdomCommodity,
    KingdomLeadershipRole,
    KingdomNationType,
    KingdomSettlementType,
    KingdomSkill,
};
