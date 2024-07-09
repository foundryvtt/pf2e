import type { RawDamageDice, RawModifier } from "@actor/modifiers.ts";
import { ItemType, SpellSource } from "@item/base/data/index.ts";
import { MagicTradition } from "@item/spell/types.ts";
import { ZeroToTwo } from "@module/data.ts";
import { RollNoteSource } from "@module/notes.ts";
import { CheckCheckContext } from "@system/check/index.ts";
import { DamageDamageContext } from "@system/damage/types.ts";
import { DegreeAdjustmentsRecord, DegreeOfSuccessString } from "@system/degree-of-success.ts";
import type { ChatMessageFlags } from "types/foundry/common/documents/chat-message.d.ts";

type ChatMessageSourcePF2e = foundry.documents.ChatMessageSource & {
    flags: ChatMessageFlagsPF2e;
};

export interface ItemOriginFlag {
    actor?: ActorUUID;
    type: ItemType;
    uuid: string;
    castRank?: number;
    messageId?: string;
    variant?: { overlays: string[] };
    rollOptions?: string[];
}

type ChatMessageFlagsPF2e = ChatMessageFlags & {
    pf2e: {
        damageRoll?: DamageRollFlag;
        context?: ChatContextFlag;
        origin?: ItemOriginFlag | null;
        casting?: { id: string; tradition: MagicTradition; embeddedSpell?: SpellSource } | null;
        modifiers?: RawModifier[];
        dice?: RawDamageDice[];
        preformatted?: "flavor" | "content" | "both";
        journalEntry?: DocumentUUID;
        appliedDamage?: AppliedDamageFlag | null;
        treatWoundsMacroFlag?: { bonus: number };
        [key: string]: unknown;
    };
    core: NonNullable<ChatMessageFlags["core"]>;
};

type ChatContextFlag =
    | CheckContextChatFlag
    | DamageDamageContextFlag
    | SpellCastContextFlag
    | SelfEffectContextFlag
    | DamageTakenContextFlag;

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

interface ActorTokenFlag {
    actor: ActorUUID | TokenDocumentUUID;
    token?: TokenDocumentUUID;
}

type ContextFlagOmission =
    | "actor"
    | "action"
    | "altUsage"
    | "createMessage"
    | "damaging"
    | "dosAdjustments"
    | "item"
    | "mapIncreases"
    | "notes"
    | "options"
    | "origin"
    | "range"
    | "target"
    | "token";

interface CheckContextChatFlag extends Required<Omit<CheckCheckContext, ContextFlagOmission>> {
    actor: string | null;
    token: string | null;
    item?: string;
    dosAdjustments?: DegreeAdjustmentsRecord;
    roller?: "origin" | "target";
    origin: ActorTokenFlag | null;
    target: ActorTokenFlag | null;
    altUsage?: "thrown" | "melee" | null;
    notes: RollNoteSource[];
    options: string[];
}

interface DamageDamageContextFlag extends Required<Omit<DamageDamageContext, ContextFlagOmission | "self">> {
    actor: string | null;
    token: string | null;
    item?: string;
    mapIncreases?: ZeroToTwo;
    target: ActorTokenFlag | null;
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

interface DamageTakenContextFlag {
    type: "damage-taken";
    domains?: never;
    options?: string[];
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

export type {
    ActorTokenFlag,
    AppliedDamageFlag,
    ChatContextFlag,
    ChatMessageFlagsPF2e,
    ChatMessageSourcePF2e,
    CheckContextChatFlag,
    DamageDamageContextFlag,
    DamageRollFlag,
};
