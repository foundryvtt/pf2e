import { MigrationSummary } from "@module/apps/migration-summary.ts";
import { ErrorPF2e, fontAwesomeIcon } from "@util";

/** Attach system buttons and other knickknacks to the settings sidebar */
export const RenderSettings = {
    listen: (): void => {
        Hooks.on("renderSettings", async (_app, $html) => {
            const html = $html[0]!;
            // Additional system information resources
            const systemRow = html.querySelector<HTMLLIElement>(".settings-sidebar li.system");
            const systemInfo = systemRow?.cloneNode(false);
            if (!(systemInfo instanceof HTMLLIElement)) {
                throw ErrorPF2e("Unexpected error attaching system information to settings sidebar");
            }

            systemInfo.classList.remove("system");
            systemInfo.classList.add("system-links");
            const links = [
                {
                    url: "https://github.com/foundryvtt/pf2e/blob/release/CHANGELOG.md",
                    label: "PF2E.SETTINGS.Sidebar.Changelog",
                },
                {
                    url: "https://github.com/foundryvtt/pf2e/wiki",
                    label: "PF2E.SETTINGS.Sidebar.Wiki",
                },
                {
                    url: "https://discord.gg/SajryVzCyf",
                    label: "PF2E.SETTINGS.Sidebar.Discord",
                },
            ].map((data): HTMLAnchorElement => {
                const anchor = document.createElement("a");
                anchor.href = data.url;
                anchor.innerText = game.i18n.localize(data.label);
                anchor.target = "_blank";
                return anchor;
            });
            systemInfo.append(...links);
            systemRow?.after(systemInfo);

            if (!game.user.hasRole("GAMEMASTER")) return;

            // Paizo License and Migration Troubleshooting
            const license = document.createElement("div");
            license.id = "pf2e-license";
            const licenseButton = document.createElement("button");
            licenseButton.type = "button";
            licenseButton.append(fontAwesomeIcon("balance-scale"), game.i18n.localize("PF2E.LicenseViewer.Label"));
            licenseButton.addEventListener("click", () => {
                game.pf2e.licenseViewer.render(true);
            });
            license.append(licenseButton);

            const troubleshooting = document.createElement("div");
            troubleshooting.id = "pf2e-troubleshooting";
            const shootButton = document.createElement("button");
            shootButton.type = "button";
            shootButton.append(fontAwesomeIcon("wrench"), game.i18n.localize("PF2E.Migrations.Troubleshooting"));
            shootButton.addEventListener("click", () => {
                new MigrationSummary({ troubleshoot: true }).render(true);
            });
            troubleshooting.append(shootButton);

            const header = document.createElement("h2");
            header.innerText = "Pathfinder 2e";
            html.querySelector("#settings-documentation")?.after(header, license, troubleshooting);
        });
    },
};
