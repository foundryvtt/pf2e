import { RawDamageDice, RawModifier } from "@actor/modifiers.ts";
import { SpellSource } from "@item/base/data/index.ts";
import { MagicTradition } from "@item/spell/types.ts";
import { ZeroToTwo } from "@module/data.ts";
import { RollNoteSource } from "@module/notes.ts";
import { CheckCheckContext } from "@system/check/index.ts";
import { DamageDamageContext } from "@system/damage/types.ts";
import { DegreeAdjustmentsRecord, DegreeOfSuccessString } from "@system/degree-of-success.ts";
import type { ChatMessageFlags } from "types/foundry/common/documents/chat-message.d.ts";

type ChatMessageSourcePF2e = foundry.documents.ChatMessageSource<string, ChatMessageSystemData> & {
    flags: ChatMessageFlagsPF2e;
};

interface ChatMessageSystemData {
    /** A record of applied damage that can be undone */
    appliedDamage?: AppliedDamageData | null;
    /** Message context data that describes the type of this chat message */
    context?: ChatMessageContext;
}

type ChatMessageFlagsPF2e = ChatMessageFlags & {
    pf2e: {
        damageRoll?: DamageRollFlag;
        /** @deprecated Use `ChatMessagePF2e#system#context` instead */
        context?: ChatMessageContext;
        /** @deprecated Use `ChatMessagePF2e#system#origin` instead */
        origin?: {
            actor?: ActorUUID;
            castRank?: number;
            uuid?: ItemUUID;
            rollOptions?: string[];
            variant?: { overlays: string[] };
        };
        /** @deprecated Use `context#spellcasting` instead */
        casting?: { id: string; tradition: MagicTradition; embeddedSpell?: SpellSource } | null;
        modifiers?: RawModifier[];
        dice?: RawDamageDice[];
        preformatted?: "flavor" | "content" | "both";
        journalEntry?: DocumentUUID;
        /** @deprecated Use `ChatMessagePF2e#system#appliedDamage` instead */
        appliedDamage?: AppliedDamageData;
        suppressDamageButtons?: boolean;
    };
    core: NonNullable<ChatMessageFlags["core"]>;
};

type ChatMessageContext = CheckContextChatData | DamageDamageContextData | SpellCastContextData | SelfEffectContextData;

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

interface ChatMessageOriginData {
    actor: ActorUUID | TokenDocumentUUID | null;
    token?: TokenDocumentUUID;
    item?: ItemUUID;
    rollOptions?: string[];
    /** Is the origin the roller? */
    self?: boolean;
}

interface ChatMessageTargetData {
    actor?: ActorUUID | TokenDocumentUUID | null;
    token?: TokenDocumentUUID;
    item?: ItemUUID;
    distance: number | null;
    rangeIncrement: number | null;
}

interface SpellcastingOriginData {
    /** The id of the `SpellcastingEntry` that this spell belongs to */
    id: string;
    /** The rank the spell was cast at */
    castRank: number;
    /** `SpellSource` of an embedded spell */
    embeddedSpell?: SpellSource;
    /** The spells magic tradition. Unused? */
    tradition: MagicTradition;
    /** Any overlays that were applied to the spell */
    variant?: { overlays: string[] };
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

interface BaseChatMessageContext {
    /** Origin data for this chat message */
    origin?: Maybe<ChatMessageOriginData>;
}

interface CheckContextChatData extends Required<Omit<CheckCheckContext, ContextFlagOmission>> {
    dosAdjustments?: DegreeAdjustmentsRecord;
    roller?: "origin" | "target";
    origin?: Maybe<ChatMessageOriginData>;
    target: ChatMessageTargetData | null;
    altUsage?: "thrown" | "melee" | null;
    notes: RollNoteSource[];
    options: string[];
}

interface DamageDamageContextData
    extends BaseChatMessageContext,
        Required<Omit<DamageDamageContext, ContextFlagOmission | "self">> {
    mapIncreases?: ZeroToTwo;
    target: ChatMessageTargetData | null;
    notes: RollNoteSource[];
    options: string[];
}

interface SpellCastContextData extends BaseChatMessageContext {
    type: "spell-cast";
    domains: string[];
    options: string[];
    outcome?: DegreeOfSuccessString;
    /** The roll mode (i.e., 'roll', 'blindroll', etc) to use when rendering this roll. */
    rollMode?: RollMode;
    spellcasting?: SpellcastingOriginData | null;
}

interface SelfEffectContextData extends BaseChatMessageContext {
    type: "self-effect";
    domains?: never;
    options?: never;
    outcome?: never;
}

interface AppliedDamageData {
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
    AppliedDamageData,
    ChatMessageContext,
    ChatMessageFlagsPF2e,
    ChatMessageOriginData,
    ChatMessageSourcePF2e,
    ChatMessageSystemData,
    ChatMessageTargetData,
    CheckContextChatData,
    DamageDamageContextData,
    DamageRollFlag,
    SpellCastContextData,
    SpellcastingOriginData,
};
