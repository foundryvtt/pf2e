import { MigrationRunner } from "@module/migration/index.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import appv1 = foundry.appv1;

/** A summary window that opens after a system migration completes */
export class MigrationSummary extends appv1.api.Application<MigrationSummaryOptions> {
    /** Is a remigration currently running? */
    #isRemigrating = false;

    constructor(options: Partial<MigrationSummaryOptions> = {}) {
        super(options);
        this.options.troubleshoot ??= false;
        this.options.title = options.troubleshoot
            ? game.i18n.localize("PF2E.Migrations.Summary.Troubleshoot.Title")
            : game.i18n.localize("PF2E.Migrations.Summary.Title");

        const existing = Object.values(ui.windows).find(
            (app): app is MigrationSummary => app instanceof MigrationSummary,
        );
        if (existing) {
            existing.options = fu.mergeObject(existing.options, options);
            return existing;
        }
    }

    static override get defaultOptions(): appv1.api.ApplicationV1Options {
        return {
            ...super.defaultOptions,
            id: "migration-summary",
            width: 400,
            height: "auto",
            template: `${SYSTEM_ROOT}/templates/system/migration-summary.hbs`,
        };
    }

    override async getData(): Promise<MigrationSummaryData> {
        const latestSchemaVersion = MigrationRunner.LATEST_SCHEMA_VERSION;
        const actors = {
            successful: game.actors.filter((actor) => actor.schemaVersion === latestSchemaVersion).length,
            total: game.actors.size,
        };
        const items = {
            successful: game.items.filter((item) => item.schemaVersion === latestSchemaVersion).length,
            total: game.items.size,
        };
        const canRemigrate =
            this.options.troubleshoot || actors.successful < actors.total || items.successful < items.total;

        const helpResourcesText = await TextEditorPF2e.enrichHTML(
            game.i18n.localize("PF2E.Migrations.Summary.HelpResources"),
        );

        return {
            options: this.options,
            systemVersion: game.system.version,
            latestSchemaVersion,
            actors,
            items,
            canRemigrate,
            helpResources: canRemigrate && this.#isRemigrating,
            helpResourcesText,
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html[0];

        const remigrateButton = html.querySelector<HTMLButtonElement>("button[data-action=remigrate]");
        remigrateButton?.addEventListener("click", async () => {
            const { LATEST_SCHEMA_VERSION, RECOMMENDED_SAFE_VERSION } = MigrationRunner;
            const lowestVersions = {
                actor:
                    game.actors.size > 0
                        ? Math.min(...game.actors.map((a) => a.schemaVersion ?? 0))
                        : LATEST_SCHEMA_VERSION,
                item:
                    game.items.size > 0
                        ? Math.min(...game.items.map((a) => a.schemaVersion ?? 0))
                        : LATEST_SCHEMA_VERSION,
            };
            const lowestSchemaVersion = Math.max(
                Math.min(lowestVersions.actor, lowestVersions.item),
                RECOMMENDED_SAFE_VERSION,
            );

            const result = html.querySelector<HTMLElement>(".docs-successful");
            if (result) result.textContent = "...";

            try {
                this.#isRemigrating = true;
                this.options.troubleshoot = false;
                remigrateButton.disabled = true;
                await game.pf2e.system.remigrate({ from: lowestSchemaVersion });
                this.options.troubleshoot = false;
                this.render(false);
            } catch {
                return;
            }
        });

        html.querySelector("button[data-action=close]")?.addEventListener("click", () => {
            this.close();
        });
    }
}

interface MigrationSummaryOptions extends appv1.api.ApplicationV1Options {
    troubleshoot: boolean;
}

interface MigrationSummaryData {
    options: MigrationSummaryOptions;
    systemVersion: string;
    latestSchemaVersion: number;
    actors: { successful: number; total: number };
    items: { successful: number; total: number };
    canRemigrate: boolean;
    helpResources: boolean;
    helpResourcesText: string;
}
