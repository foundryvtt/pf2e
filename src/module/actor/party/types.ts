import { ActorUpdateContext } from "@actor/base.ts";
import { ItemType } from "@item/data/index.ts";
import { TokenDocumentPF2e } from "@scene";
import { Statistic } from "@system/statistic/index.ts";
import type DataModel from "types/foundry/common/abstract/data.d.ts";
import { PartyPF2e } from "./document.ts";

interface PartyUpdateContext<TParent extends TokenDocumentPF2e | null> extends ActorUpdateContext<TParent> {
    removedMembers?: string[];
}

/** Interface for a party campaign implementation, alternative data preparation used by parties for special campaigns */
interface PartyCampaign extends DataModel<PartyPF2e, {}> {
    type: string;
    level?: number;
    /** Any additional item types supported by the campaign */
    extraItemTypes?: ItemType[];
    /** Sidebar buttons to inject into the party header */
    createSidebarButtons?(): HTMLElement[];
    /** Returns any additional statistics that should be returned by the party */
    getStatistic?(slug: string): Statistic | null;
    /** Additional data for inline rolls */
    getRollData?(): Record<string, unknown>;
}

export { PartyCampaign, PartyUpdateContext };
