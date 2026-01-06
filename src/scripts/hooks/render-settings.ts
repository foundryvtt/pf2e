import { LegalNotice } from "@module/apps/legal-notice.ts";
import { MigrationSummary } from "@module/apps/migration-summary.ts";
import { ErrorPF2e, createHTMLElement, htmlQuery } from "@util";

/** Attach system buttons and other knickknacks to the settings sidebar */
export const RenderSettings = {
    listen: (): void => {
        Hooks.on("renderSettings", async (_app, html) => {
            // Additional system information resources
            const systemRow = htmlQuery(html, "section.info .system");
            const systemInfo = systemRow?.cloneNode(false);
            if (!(systemInfo instanceof HTMLElement)) {
                throw ErrorPF2e("Unexpected error attaching system information to settings sidebar");
            }

            systemInfo.classList.remove("system");
            systemInfo.classList.add("system-links");
            const links = [
                {
                    url: "https://github.com/foundryvtt/pf2e/blob/v13-dev/CHANGELOG.md",
                    label: "PF2E.SETTINGS.Sidebar.Changelog",
                },
                {
                    url: "https://github.com/foundryvtt/pf2e/wiki",
                    label: "PF2E.SETTINGS.Sidebar.Wiki",
                },
                {
                    url: "https://discord.gg/pf2e",
                    label: "PF2E.SETTINGS.Sidebar.Discord",
                },
            ].map((data): HTMLAnchorElement => {
                const anchor = createHTMLElement("a", { children: [game.i18n.localize(data.label)] });
                anchor.href = data.url;
                anchor.rel = "nofollow noopener";
                anchor.target = "_blank";
                return anchor;
            });
            systemInfo.append(...links);
            systemRow?.after(systemInfo);

            // Add PF2e section (which has license and troubleshooting)
            const header = createHTMLElement("h4", { classes: ["divider"], children: [game.system.title] });
            const pf2eSettings = createHTMLElement("section", { classes: ["pf2e", "flexcol"], children: [header] });
            html.querySelector("section.documentation")?.after(pf2eSettings);

            // Paizo License and remaster information
            const createIcon = fa.fields.createFontAwesomeIcon;
            const licenseButton = document.createElement("button");
            licenseButton.type = "button";
            licenseButton.append(createIcon("balance-scale"), " ", game.i18n.localize("PF2E.LegalNotice.Title"));
            licenseButton.addEventListener("click", () => new LegalNotice().render({ force: true }));

            if (SYSTEM_ID === "pf2e") {
                const remasterButton = document.createElement("button");
                remasterButton.type = "button";
                remasterButton.append(createIcon("rocket"), game.i18n.localize("PF2E.SETTINGS.Sidebar.Remaster"));
                remasterButton.addEventListener("click", async () => {
                    const entry = await fromUuid("Compendium.pf2e.journals.JournalEntry.6L2eweJuM8W7OCf2");
                    entry?.sheet.render(true);
                });
                pf2eSettings.append(licenseButton, remasterButton);
            }

            // Migration Troubleshooting (if GM)
            if (game.user.isGM) {
                const shootButton = document.createElement("button");
                shootButton.type = "button";
                shootButton.append(createIcon("wrench"), game.i18n.localize("PF2E.Migrations.Troubleshooting"));
                shootButton.addEventListener("click", () => new MigrationSummary({ troubleshoot: true }).render(true));
                pf2eSettings.append(shootButton);
            }
        });
    },
};
