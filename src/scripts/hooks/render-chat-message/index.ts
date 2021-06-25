import { ChatMessagePF2e } from '@module/chat-message';
import * as DamageButtons from './damage-buttons';
import * as DegreeOfSuccess from './degree-of-success';

export function listen(): void {
    Hooks.on('renderChatMessage', (message: ChatMessagePF2e, html) => {
        DamageButtons.listen(message, html);
        DegreeOfSuccess.listen(message, html);
    });
}
