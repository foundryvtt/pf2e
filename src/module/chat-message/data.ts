import { BaseRawModifier, DamageDicePF2e } from "@actor/modifiers.ts";
import { ItemType } from "@item/data/index.ts";
import { MagicTradition } from "@item/spell/types.ts";
import { ZeroToTwo } from "@module/data.ts";
import { RollNoteSource } from "@module/notes.ts";
import { CheckRollContext } from "@system/check/index.ts";
import { DamageRollContext } from "@system/damage/types.ts";
import { DegreeAdjustmentsRecord, DegreeOfSuccessString } from "@system/degree-of-success.ts";
import type { ChatMessageFlags } from "types/foundry/common/documents/chat-message.d.ts";

interface ChatMessageSourcePF2e extends foundry.documents.ChatMessageSource {
    flags: ChatMessageFlagsPF2e;
}

export interface ItemOriginFlag {
    type: ItemType;
    uuid: string;
    castLevel?: number;
    messageId?: string;
    variant?: { overlays: string[] };
}

type ChatMessageFlagsPF2e = ChatMessageFlags & {
    pf2e: {
        damageRoll?: DamageRollFlag;
        context?: ChatContextFlag;
        origin?: ItemOriginFlag | null;
        casting?: { id: string; tradition: MagicTradition } | null;
        modifierName?: string;
        modifiers?: (BaseRawModifier | DamageDicePF2e)[];
        preformatted?: "flavor" | "content" | "both";
        isFromConsumable?: boolean;
        journalEntry?: DocumentUUID;
        strike?: StrikeLookupData | null;
        appliedDamage?: AppliedDamageFlag | null;
        [key: string]: unknown;
    };
    core: NonNullable<ChatMessageFlags["core"]>;
};

type ChatContextFlag = CheckRollContextFlag | DamageRollContextFlag | SpellCastContextFlag | SelfEffectContextFlag;

/** Data used to lookup a strike on an actor */
interface StrikeLookupData {
    actor: ActorUUID | TokenDocumentUUID;
    index: number;
    damaging: boolean;
    name: string;
    altUsage?: "thrown" | "melee" | null;
}

interface DamageRollFlag {
    outcome: DegreeOfSuccessString;
    total: number;
    traits: string[];
    types: Record<string, Record<string, number>>;
    diceResults: Record<string, Record<string, DieResult[]>>;
    baseDamageDice: number;
}

interface DieResult {
    faces: number;
    result: number;
}

interface TargetFlag {
    actor: ActorUUID | TokenDocumentUUID;
    token?: TokenDocumentUUID;
}

type ContextFlagOmission =
    | "actor"
    | "altUsage"
    | "createMessage"
    | "damaging"
    | "dosAdjustments"
    | "item"
    | "mapIncreases"
    | "notes"
    | "options"
    | "range"
    | "target"
    | "token";

interface CheckRollContextFlag extends Required<Omit<CheckRollContext, ContextFlagOmission>> {
    actor: string | null;
    token: string | null;
    item?: string;
    dosAdjustments?: DegreeAdjustmentsRecord;
    target: TargetFlag | null;
    altUsage?: "thrown" | "melee" | null;
    notes: RollNoteSource[];
    options: string[];
}

interface DamageRollContextFlag extends Required<Omit<DamageRollContext, ContextFlagOmission | "self">> {
    actor: string | null;
    token: string | null;
    item?: string;
    mapIncreases?: ZeroToTwo;
    target: TargetFlag | null;
    notes: RollNoteSource[];
    options: string[];
}

interface SpellCastContextFlag {
    type: "spell-cast";
    domains: string[];
    options: string[];
    outcome?: DegreeOfSuccessString;
    /** The roll mode (i.e., 'roll', 'blindroll', etc) to use when rendering this roll. */
    rollMode?: RollMode;
}

interface SelfEffectContextFlag {
    type: "self-effect";
    item: string;
    domains?: never;
    options?: never;
    outcome?: never;
}

interface AppliedDamageFlag {
    uuid: ActorUUID;
    isHealing: boolean;
    isReverted?: boolean;
    persistent: string[];
    shield: {
        id: string;
        damage: number;
    } | null;
    updates: { path: string; value: number }[];
}

export {
    AppliedDamageFlag,
    ChatContextFlag,
    ChatMessageFlagsPF2e,
    ChatMessageSourcePF2e,
    CheckRollContextFlag,
    DamageRollContextFlag,
    DamageRollFlag,
    StrikeLookupData,
    TargetFlag,
};
