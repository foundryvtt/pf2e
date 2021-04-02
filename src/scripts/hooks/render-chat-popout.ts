import { registerItemCardEvents } from '@scripts/chat/item-cards';

export function listen(): void {
    Hooks.on('renderChatPopout', (_log, html) => {
        registerItemCardEvents(html);
    });
}
