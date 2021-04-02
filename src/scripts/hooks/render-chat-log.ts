import { registerItemCardEvents } from '@scripts/chat/item-cards';

export function listen(): void {
    Hooks.on('renderChatLog', (_log, html) => {
        registerItemCardEvents(html);
    });
}
