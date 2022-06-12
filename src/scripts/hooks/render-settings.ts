import { MigrationSummary } from "@module/apps/migration-summary";
import { fontAwesomeIcon } from "@util";

export const RenderSettings = {
    listen: (): void => {
        Hooks.on("renderSettings", async (_app, $html) => {
            // Guide and Changelog
            const $systemRow = $html.find("#game-details > li.system");
            const $guideLog = $systemRow.clone().empty().removeClass("system").addClass("system-info");
            const links = {
                guide: {
                    url: "https://github.com/foundryvtt/pf2e/wiki",
                    label: game.i18n.localize("PF2E.SETTINGS.Sidebar.Wiki"),
                },
                changelog: {
                    url: "https://github.com/foundryvtt/pf2e/blob/release-v9/CHANGELOG.md",
                    label: game.i18n.localize("PF2E.SETTINGS.Sidebar.Changelog"),
                },
                discord: {
                    url: "https://discord.gg/SajryVzCyf",
                    label: game.i18n.localize("PF2E.SETTINGS.Sidebar.Discord"),
                },
            };
            $guideLog.append(
                `<a href="${links.guide.url}">${links.guide.label}</a>`,
                `<a href="${links.changelog.url}">${links.changelog.label}</a>`,
                `<a href="${links.discord.url}">${links.discord.label}</a>`
            );
            $systemRow.after($guideLog);

            // Paizo License and Migration Troubleshooting
            const $license = $("<div>").attr({ id: "pf2e-license" });
            const $licenseButton = $('<button type="button">')
                .append(fontAwesomeIcon("balance-scale"), game.i18n.localize("PF2E.LicenseViewer.Label"))
                .on("click", () => game.pf2e.licenseViewer.render(true));
            $license.append($licenseButton);

            if (game.user.hasRole("GAMEMASTER")) {
                const $troubleshooting = $("<div>").attr({ id: "pf2e-troubleshooting" });
                const $shootButton = $('<button type="button">')
                    .append(fontAwesomeIcon("wrench"), game.i18n.localize("PF2E.Migrations.Troubleshooting"))
                    .on("click", () => new MigrationSummary({ troubleshoot: true }).render(true));
                $troubleshooting.append($shootButton);

                $("#settings-documentation").after("<h2>Pathfinder 2e</h2>", $license, $troubleshooting);
            }
        });
    },
};
