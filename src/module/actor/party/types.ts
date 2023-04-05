import { ActorSheetDataPF2e } from "@actor/sheet/data-types.ts";
import { PartyPF2e } from "./document.ts";
import { Bulk } from "@item/physical/bulk.ts";
import { ZeroToFour } from "@module/data.ts";
import { ActorPF2e } from "@actor";

interface PartySheetData extends ActorSheetDataPF2e<PartyPF2e> {
    members: MemberBreakdown[];
    languages: LanguageSheetData[];
    inventorySummary: {
        totalCoins: number;
        totalWealth: number;
        totalBulk: Bulk;
    };
}

interface SkillData {
    slug: string;
    label: string;
    mod: number;
    rank?: ZeroToFour | null;
}

interface MemberBreakdown {
    actor: ActorPF2e;
    heroPoints: {
        value: number;
        inactive: number;
    } | null;
    hasBulk: boolean;
    bestSkills: SkillData[];
    senses: { label: string | null; labelFull: string; acuity?: string }[];
}

interface LanguageSheetData {
    slug: string;
    label: string;
    actors: ActorPF2e[];
}

export { PartySheetData, LanguageSheetData };
