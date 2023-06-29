export const RenderChatPopout = {
    listen: (): void => {
        Hooks.on("renderChatPopout", (_app, $html) => {
            ui.chat.activateClickListener($html[0]);
        });
    },
};
