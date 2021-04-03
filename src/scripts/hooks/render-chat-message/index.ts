import { ActorPF2e } from '@actor/base';
import * as DamageButtons from './damage-buttons';
import * as DegreeOfSuccess from './degree-of-success';

export function listen(): void {
    Hooks.on('renderChatMessage', (message: ChatMessage<ActorPF2e>, html) => {
        DamageButtons.listen(message, html);
        DegreeOfSuccess.listen(message, html);
    });
}
