import { ItemPF2e } from '@item/base';

/**
 * Registers and handles global chat events that concern themselves
 * with things like item card buttons.
 */
export class ChatLogPF2e extends ChatLog {
    constructor(options: {}) {
        super(options);
        Hooks.on('renderChatPopout', (_log, html) => {
            this.addListenersPF2e(html);
        });
    }

    /** @override */
    activateListeners(html: JQuery) {
        super.activateListeners(html);
        this.addListenersPF2e(html);
    }

    /**
     * Adds PF2e specific listeners to the chat log or a popout message
     * @param html
     */
    addListenersPF2e(html: JQuery) {
        ItemPF2e.chatListeners(html);
    }
}
