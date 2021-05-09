import { ActorPF2e } from '@actor/base';
import { ChatCards } from './listeners/cards';

export class ChatMessagePF2e extends ChatMessage<ActorPF2e> {
    /** @override */
    async render(force?: boolean, options?: EntityRenderOptions): Promise<JQuery<HTMLLIElement>> {
        const $html = await super.render(force, options);

        ChatCards.listen($html);

        return $html;
    }
}
