import { ActorSheetDataPF2e } from "@actor/sheet/data-types.ts";
import { PartyPF2e } from "./document.ts";
import { Bulk } from "@item/physical/bulk.ts";
import { ZeroToFour } from "@module/data.ts";
import { ActorPF2e } from "@actor";
import { TokenDocumentPF2e } from "@scene";
import { ActorUpdateContext } from "@actor/base.ts";
import { ItemType } from "@item/data/index.ts";
import { ItemPF2e } from "@item";

interface PartySheetData extends ActorSheetDataPF2e<PartyPF2e> {
    members: MemberBreakdown[];
    languages: LanguageSheetData[];
    inventorySummary: {
        totalCoins: number;
        totalWealth: number;
        totalBulk: Bulk;
    };
    /** Unsupported items on the sheet, may occur due to disabled campaign data */
    orphaned: ItemPF2e[];
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

interface PartyUpdateContext<TParent extends TokenDocumentPF2e | null> extends ActorUpdateContext<TParent> {
    removedMembers?: string[];
}

/** Interface for a party campaign implementation, alternative data preparation used by parties for special campaigns */
interface PartyCampaign {
    /** Any additional item types supported by the campaign */
    extraItemTypes?: ItemType[];
}

export { MemberBreakdown, PartyCampaign, PartySheetData, PartyUpdateContext, LanguageSheetData };
