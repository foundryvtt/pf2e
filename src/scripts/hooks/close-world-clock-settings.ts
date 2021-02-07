/** Refresh scene controls for non-GMs when WorldClockSettings is updated */
export function listen(): void {
    Hooks.on('closeWorldClockSettings', (): void => {
        if (game.user.isGM) {
            game.socket.emit('system.pf2e', { request: 'refreshSceneControls', data: { layer: 'TokenLayer' } });
        }
    });
}
