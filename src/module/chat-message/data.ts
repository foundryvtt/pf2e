import { ItemType } from "@item/data";
import { MagicTradition } from "@item/spell/types";
import { RawModifier } from "@actor/modifiers";
import { DegreeOfSuccessString } from "@system/degree-of-success";
import { CheckRollContextFlag, DamageRollContextFlag } from "@system/rolls";
import { ChatMessagePF2e } from ".";

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
        [key: string]: unknown;
    };
    core: NonNullable<foundry.data.ChatMessageFlags["core"]>;
};

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

export { ChatMessageDataPF2e, ChatMessageSourcePF2e, ChatMessageFlagsPF2e, DamageRollFlag };
