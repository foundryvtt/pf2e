import { ChatLogPF2e } from "@module/apps/sidebar/chat-log.ts";

export const RenderChatPopout = {
    listen: (): void => {
        Hooks.on("renderChatPopout", (app, _html, _context, options) => {
            ChatLogPF2e.onRenderChatPopout(app, options);
        });
    },
};
