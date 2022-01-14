import { MigrationRunner } from "@module/migration";

/** A summary window that opens after a system migration completes */
export class MigrationSummary extends Application<MigrationSummaryOptions> {
    /** Is a remigration currently running? */
    private isRemigrating = false;

    constructor(options: Partial<MigrationSummaryOptions> = {}) {
        super(options);
        this.options.troubleshoot ??= false;
        this.options.title = options.troubleshoot
            ? game.i18n.localize("PF2E.Migrations.Summary.Troubleshoot.Title")
            : game.i18n.localize("PF2E.Migrations.Summary.Title");

        const existing = Object.values(ui.windows).find(
            (app): app is MigrationSummary => app instanceof MigrationSummary
        );
        if (existing) {
            existing.options = mergeObject(existing.options, options);
            return existing;
        }
    }

    override get template(): string {
        return "systems/pf2e/templates/system/migration-summary.html";
    }

    static override get defaultOptions() {
        return {
            ...super.defaultOptions,
            id: "migration-summary",
            width: 400,
            height: "auto",
        };
    }

    override getData(): MigrationSummaryData {
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

        return {
            options: this.options,
            systemVersion: game.system.data.version,
            latestSchemaVersion,
            actors,
            items,
            canRemigrate,
            helpResources: canRemigrate && this.isRemigrating,
        };
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        $html.find('button[data-action="remigrate"]').on("click", async (event) => {
            const lowestSchemaVersion = Math.max(
                Math.min(0, ...game.actors.map((actor) => actor.schemaVersion ?? 0)),
                MigrationRunner.RECOMMENDED_SAFE_VERSION
            );
            $html.find(".docs-successful").text("...");

            try {
                this.isRemigrating = true;
                this.options.troubleshoot = false;
                $(event.currentTarget).prop("disabled", true);
                await game.pf2e.system.remigrate({ from: lowestSchemaVersion });
                this.options.troubleshoot = false;
                this.render(false);
            } catch {
                return;
            }
        });

        $html.find('button[data-action="close"]').on("click", () => this.close());
    }
}

interface MigrationSummaryOptions extends ApplicationOptions {
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
}
