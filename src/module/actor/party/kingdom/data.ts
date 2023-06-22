import { KINGDOM_SCHEMA } from "./schema.ts";
import { KINGDOM_ABILITIES, KINGDOM_LEADERSHIP, KINGDOM_SKILLS } from "./values.ts";

interface KingdomCHG {
    name: string;
    img: ImageFilePath;
    description: string;
    boosts: (KingdomAbility | "free")[];
    flaw: KingdomAbility | null;
}

interface KingdomGovernment extends KingdomCHG {
    skills: string[];
}

type KingdomAbility = (typeof KINGDOM_ABILITIES)[number];
type KingdomSkill = (typeof KINGDOM_SKILLS)[number];
type KingdomSchema = typeof KINGDOM_SCHEMA;
type KingdomSource = SourceFromSchema<typeof KINGDOM_SCHEMA>;
type KingdomData = ModelPropsFromSchema<typeof KINGDOM_SCHEMA>;
type KingdomLeadershipData = KingdomData["leadership"][KingdomLeadershipRole];

type FameType = "fame" | "infamy";
type KingdomLeadershipRole = (typeof KINGDOM_LEADERSHIP)[number];

export {
    KingdomAbility,
    KingdomCHG,
    KingdomData,
    KingdomGovernment,
    KingdomLeadershipData,
    KingdomSchema,
    KingdomSkill,
    KingdomSource,
    FameType,
};
