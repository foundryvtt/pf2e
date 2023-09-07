import { MigrationSummary } from "@module/apps/migration-summary.ts";
import { ErrorPF2e, createHTMLElement, fontAwesomeIcon } from "@util";

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

            // Add PF2e section (which has license and troubleshooting)
            const header = createHTMLElement("h2", { children: [game.system.title] });
            const pf2eSettings = createHTMLElement("div");
            html.querySelector("#settings-documentation")?.after(header, pf2eSettings);

            // Paizo License and remaster information
            const licenseButton = document.createElement("button");
            licenseButton.type = "button";
            licenseButton.append(fontAwesomeIcon("balance-scale"), game.i18n.localize("PF2E.LicenseViewer.Label"));
            licenseButton.addEventListener("click", () => {
                game.pf2e.licenseViewer.render(true);
            });

            const remasterButton = document.createElement("button");
            remasterButton.type = "button";
            remasterButton.append(fontAwesomeIcon("rocket"), game.i18n.localize("PF2E.SETTINGS.Sidebar.Remaster"));
            remasterButton.addEventListener("click", () => {
                fromUuid("Compendium.pf2e.journals.JournalEntry.6L2eweJuM8W7OCf2").then((entry) => {
                    entry?.sheet.render(true);
                });
            });

            pf2eSettings.append(licenseButton, remasterButton);

            // Migration Troubleshooting (if GM)
            if (game.user.isGM) {
                const shootButton = document.createElement("button");
                shootButton.type = "button";
                shootButton.append(fontAwesomeIcon("wrench"), game.i18n.localize("PF2E.Migrations.Troubleshooting"));
                shootButton.addEventListener("click", () => {
                    new MigrationSummary({ troubleshoot: true }).render(true);
                });

                pf2eSettings.append(shootButton);
            }
        });
    },
};
