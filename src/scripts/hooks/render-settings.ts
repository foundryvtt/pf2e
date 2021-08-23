import { fontAwesomeIcon } from "@module/utils";

export const RenderSettings = {
    listen: (): void => {
        Hooks.on("renderSettings", async (_app, $html) => {
            // Guide and Changelog
            const $systemRow = $html.find("li.system");
            const $guideLog = $systemRow.clone();
            $guideLog.addClass("system-info").removeClass("system");
            $guideLog.html(
                '<a title="Guide" href="https://gitlab.com/hooking/foundry-vtt---pathfinder-2e/-/wikis/Getting-Started-Guide/Getting-Started" style="color:#daa520;">Guide</a> | <a title="Changelog" href="https://gitlab.com/hooking/foundry-vtt---pathfinder-2e/-/blob/release-0.8.x/CHANGELOG.md" style="color:#daa520;">Changelog</a>'
            );
            $("#game-details > li.system").after($guideLog);

            // Paizo License
            const $container = $("<div>").attr({ id: "pf2e-license" });
            const $button = $('<button type="button">').append(
                fontAwesomeIcon("balance-scale"),
                game.i18n.localize("PF2E.LicenseViewer.Label")
            );
            $container.append($button);
            $("#settings-documentation").after("<h2>Pathfinder 2e</h2>", $container);
            $button.on("click", () => game.pf2e.licenseViewer.render(true));
        });
    },
};
