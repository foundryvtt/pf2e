export function listen(): void {
    Hooks.on('renderSidebarTab', async (object, html) => {
        if (object instanceof Settings) {
            const details = html.find('#game-details');
            details
                .children()[1]
                .insertAdjacentHTML(
                    'afterend',
                    "<li class='system-links' align='right'><a title='Guide' href='https://gitlab.com/hooking/foundry-vtt---pathfinder-2e/-/wikis/Getting-Started-Guide/Getting-Started' style='color:#daa520;'>Wiki</a> | <a title='Changelog' href='https://gitlab.com/hooking/foundry-vtt---pathfinder-2e/-/blob/release-0.8.x/CHANGELOG.md' style='color:#daa520;'>Changelog</a></li>",
                );
            details
                .children()[0]
                .insertAdjacentHTML(
                    'afterend',
                    "<li class='system-links' align='right'><a title='Guide' href='https://foundryvtt.com/kb/' style='color:#daa520;'>Wiki</a> | <a title='Changelog' href='https://foundryvtt.com/releases/' style='color:#daa520;'>Changelog</a></li>",
                );
        }
    });
}
