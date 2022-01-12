import { ItemType } from "@item/data";
import { RawModifier } from "@module/modifiers";
import { CheckModifiersContext } from "@system/rolls";
import { ChatMessagePF2e } from ".";

export interface ChatMessageDataPF2e<TChatMessage extends ChatMessagePF2e = ChatMessagePF2e>
    extends foundry.data.ChatMessageData<TChatMessage> {
    readonly _source: ChatMessageSourcePF2e;
    flags: ChatMessageFlagsPF2e;
}

export interface ChatMessageSourcePF2e extends foundry.data.ChatMessageSource {
    flags: ChatMessageFlagsPF2e;
}

export type ChatMessageFlagsPF2e = Record<string, Record<string, unknown>> & {
    pf2e: {
        damageRoll?: boolean;
        context?: (CheckModifiersContext & { rollMode: RollMode }) | undefined;
        origin?: { type: ItemType; uuid: string } | null;
        casting?: { id: string } | null;
        modifierName?: string;
        modifiers?: RawModifier[];
        preformatted?: "flavor" | "content" | "both";
        [key: string]: unknown;
    };
    core: {
        canPopout?: boolean;
        RollTable?: string;
        [key: string]: unknown;
    };
};
