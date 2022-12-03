import { ItemType } from "@item/data";
import { MagicTradition } from "@item/spell/types";
import { RawModifier } from "@actor/modifiers";
import { DegreeOfSuccessString } from "@system/degree-of-success";
import { ChatMessagePF2e } from ".";
import { RollNoteSource } from "@module/notes";
import { CheckRollContext } from "@system/check";
import { DamageRollContext } from "@system/damage";

interface ChatMessageDataPF2e<TChatMessage extends ChatMessagePF2e = ChatMessagePF2e>
    extends foundry.data.ChatMessageData<TChatMessage> {
    readonly _source: ChatMessageSourcePF2e;
}

interface ChatMessageSourcePF2e extends foundry.data.ChatMessageSource {
    flags: ChatMessageFlagsPF2e;
}

type ChatMessageFlagsPF2e = foundry.data.ChatMessageFlags & {
    pf2e: {
        damageRoll?: DamageRollFlag;
        context?: CheckRollContextFlag | DamageRollContextFlag;
        origin?: { type: ItemType; uuid: string } | null;
        casting?: { id: string; level: number; tradition: MagicTradition } | null;
        modifierName?: string;
        modifiers?: RawModifier[];
        preformatted?: "flavor" | "content" | "both";
        isFromConsumable?: boolean;
        journalEntry?: DocumentUUID;
        spellVariant?: { overlayIds: string[] };
        strike?: StrikeLookupData | null;
        [key: string]: unknown;
    };
    core: NonNullable<foundry.data.ChatMessageFlags["core"]>;
};

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
    | "dosAdjustments"
    | "item"
    | "notes"
    | "options"
    | "target"
    | "token";

interface CheckRollContextFlag extends Required<Omit<CheckRollContext, ContextFlagOmission>> {
    actor: string | null;
    token: string | null;
    item?: undefined;
    dosAdjustments?: undefined;
    target: TargetFlag | null;
    altUsage?: "thrown" | "melee" | null;
    notes: RollNoteSource[];
    options: string[];
}

interface DamageRollContextFlag extends Required<Omit<DamageRollContext, ContextFlagOmission | "self">> {
    actor: string | null;
    token: string | null;
    item?: undefined;
    target: TargetFlag | null;
    notes: RollNoteSource[];
    options: string[];
}

export {
    ChatMessageDataPF2e,
    ChatMessageSourcePF2e,
    ChatMessageFlagsPF2e,
    CheckRollContextFlag,
    DamageRollFlag,
    DamageRollContextFlag,
    StrikeLookupData,
    TargetFlag,
};
