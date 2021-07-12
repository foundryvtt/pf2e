export function listen(): void {
    Hooks.on('renderSidebarTab', async (object, $html) => {
        if (object instanceof Settings) {
            const $systemRow = $html.find('li.system');
            const $guideLog = $systemRow.clone();
            $guideLog[0].classList.replace('system', 'system-info');
            $guideLog[0].innerHTML =
                "<a title='Guide' href='https://gitlab.com/hooking/foundry-vtt---pathfinder-2e/-/wikis/Getting-Started-Guide/Getting-Started' style='color:#daa520;'>Guide</a> | <a title='Changelog' href='https://gitlab.com/hooking/foundry-vtt---pathfinder-2e/-/blob/release-0.8.x/CHANGELOG.md' style='color:#daa520;'>Changelog</a>";
            $('#game-details li.system').after($guideLog);
        }
    });
}
