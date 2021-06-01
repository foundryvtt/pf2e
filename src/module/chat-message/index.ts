import type { ActorPF2e } from '@actor/index';
import { CheckModifiersContext } from '@module/system/check-modifiers-dialog';
import { ChatCards } from './listeners/cards';

export class ChatMessagePF2e extends ChatMessage<ActorPF2e> {
    /** @override */
    async getHTML(): Promise<JQuery> {
        const $html = await super.getHTML();
        ChatCards.listen($html);

        return $html;
    }
}

export interface ChatMessagePF2e {
    readonly data: foundry.data.ChatMessageData<this>;

    getFlag(scope: 'core', key: 'RollTable'): unknown;
    getFlag(scope: 'pf2e', key: 'canReroll'): boolean | undefined;
    getFlag(scope: 'pf2e', key: 'damageRoll'): object | undefined;
    getFlag(scope: 'pf2e', key: 'totalModifier'): number | undefined;
    getFlag(scope: 'pf2e', key: 'context'): (CheckModifiersContext & { rollMode: RollMode }) | undefined;
}
