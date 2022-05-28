import { ItemType } from "@item/data";
import { MagicTradition } from "@item/spell/types";
import { RawModifier } from "@actor/modifiers";
import { DegreeOfSuccessString } from "@system/degree-of-success";
import { CheckRollContextFlag } from "@system/rolls";
import { ChatMessagePF2e } from ".";

interface ChatMessageDataPF2e<TChatMessage extends ChatMessagePF2e = ChatMessagePF2e>
    extends foundry.data.ChatMessageData<TChatMessage> {
    readonly _source: ChatMessageSourcePF2e;
    flags: ChatMessageFlagsPF2e;
}

interface ChatMessageSourcePF2e extends foundry.data.ChatMessageSource {
    flags: ChatMessageFlagsPF2e;
}

type ChatMessageFlagsPF2e = foundry.data.ChatMessageFlags & {
    pf2e: {
        damageRoll?: DamageRollFlag;
        context?: CheckRollContextFlag;
        origin?: { type: ItemType; uuid: string } | null;
        casting?: { id: string; tradition: MagicTradition } | null;
        modifierName?: string;
        modifiers?: RawModifier[];
        preformatted?: "flavor" | "content" | "both";
        isFromConsumable?: boolean;
        journalEntry?: DocumentUUID;
        [key: string]: unknown;
    };
    core: NonNullable<foundry.data.ChatMessageFlags["core"]>;
};

interface DamageRollFlag {
    outcome: DegreeOfSuccessString;
    rollMode: RollMode;
    total: number;
    traits: string[];
    types: Record<string, Record<string, number>>;
    diceResults: Record<string, Record<string, number[]>>;
    baseDamageDice: number;
}

export { ChatMessageDataPF2e, ChatMessageSourcePF2e, ChatMessageFlagsPF2e, DamageRollFlag };
