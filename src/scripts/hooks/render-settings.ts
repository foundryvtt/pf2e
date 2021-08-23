import { fontAwesomeIcon } from "@module/utils";

export const RenderSettings = {
    listen: (): void => {
        Hooks.on("renderSettings", async (_app, $html) => {
            // Guide and Changelog
            const $systemRow = $html.find("#game-details > li.system");
            const $guideLog = $systemRow.clone().empty().removeClass("system").addClass("system-info");
            const links = {
                guide: {
                    url: "https://gitlab.com/hooking/foundry-vtt---pathfinder-2e/-/wikis/Getting-Started-Guide/Getting-Started",
                    label: game.i18n.localize("PF2E.SETTINGS.Sidebar.Guide"),
                },
                changelog: {
                    url: "https://gitlab.com/hooking/foundry-vtt---pathfinder-2e/-/blob/release-0.8.x/CHANGELOG.md",
                    label: game.i18n.localize("PF2E.SETTINGS.Sidebar.Changelog"),
                },
            };
            $guideLog.append(
                `<a href="${links.guide.url}">${links.guide.label}</a>`,
                `<a href="${links.changelog.url}">${links.changelog.label}</a>`
            );
            $systemRow.after($guideLog);

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
