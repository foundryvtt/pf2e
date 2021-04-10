import { ActorPF2e } from '@actor/base';
import { DamageCards } from './listeners/damage-cards';

export class ChatMessagePF2e extends ChatMessage<ActorPF2e> {
    /** @override */
    async render(): Promise<JQuery<HTMLLIElement>> {
        const $html = await super.render();

        DamageCards.listen($html);

        return $html;
    }
}
