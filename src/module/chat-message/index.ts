import { ActorPF2e } from '@actor/base';
import { ChatCards } from './listeners/cards';

export class ChatMessagePF2e extends ChatMessage<ActorPF2e> {
    /** @override */
    async getHTML(): Promise<JQuery<HTMLLIElement>> {
        const $html = await super.getHTML();
        ChatCards.listen($html);

        return $html;
    }
}
