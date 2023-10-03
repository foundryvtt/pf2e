import type { KINGDOM_SCHEMA, KINGDOM_SETTLEMENT_SCHEMA } from "./schema.ts";
import type {
    KINGDOM_ABILITIES,
    KINGDOM_COMMODITIES,
    KINGDOM_LEADERSHIP,
    KINGDOM_SETTLEMENT_TYPES,
    KINGDOM_SKILLS,
} from "./values.ts";

interface KingdomCHG {
    name: string;
    img: ImageFilePath;
    description: string;
    boosts: (KingdomAbility | "free")[];
    flaw?: KingdomAbility | null;
    feat?: CompendiumUUID | null;
}

interface KingdomCharter extends KingdomCHG {
    flaw: KingdomAbility | null;
}

interface KingdomGovernment extends KingdomCHG {
    skills: KingdomSkill[];
    feat: CompendiumUUID | null;
}

type KingdomAbility = (typeof KINGDOM_ABILITIES)[number];
type KingdomSkill = (typeof KINGDOM_SKILLS)[number];
type KingdomLeadershipRole = (typeof KINGDOM_LEADERSHIP)[number];
type KingdomCommodity = (typeof KINGDOM_COMMODITIES)[number];
type KingdomNationType = "territory" | "province" | "state" | "country" | "dominion";
type KingdomSettlementType = (typeof KINGDOM_SETTLEMENT_TYPES)[number];

type KingdomSchema = typeof KINGDOM_SCHEMA;
type KingdomSource = SourceFromSchema<typeof KINGDOM_SCHEMA>;
type KingdomData = ModelPropsFromSchema<typeof KINGDOM_SCHEMA>;
type KingdomAbilityData = KingdomData["abilities"][KingdomAbility];
type KingdomLeadershipData = KingdomData["leadership"][KingdomLeadershipRole];
type KingdomSettlementData = ModelPropsFromSchema<typeof KINGDOM_SETTLEMENT_SCHEMA>;

type FameType = "fame" | "infamy";

export type {
    KingdomAbility,
    KingdomAbilityData,
    KingdomCommodity,
    KingdomCHG,
    KingdomCharter,
    KingdomData,
    KingdomGovernment,
    KingdomLeadershipData,
    KingdomLeadershipRole,
    KingdomNationType,
    KingdomSchema,
    KingdomSettlementData,
    KingdomSettlementType,
    KingdomSkill,
    KingdomSource,
    FameType,
};
