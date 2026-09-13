import { MigrationRunner } from "@module/migration/index.ts";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import Root from "./app.svelte";

/** A summary window that opens after a system migration completes */
class MigrationSummary extends SvelteApplicationMixin(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<fa.ApplicationConfiguration> = {
        id: "migration-summary",
        window: {
            contentClasses: ["standard-form"],
        },
        position: {
            width: 400,
        },
    };

    protected root = Root;

    #troubleshoot = false;

    constructor(options: DeepPartial<fa.ApplicationConfiguration> & { troubleshoot?: boolean } = {}) {
        const existing = foundry.applications.instances.get("migration-summary");
        if (existing instanceof MigrationSummary) {
            existing.#setTroubleshoot(options.troubleshoot ?? existing.#troubleshoot);
            return existing;
        }

        super(options);
        this.#troubleshoot = options.troubleshoot ?? false;
    }

    /** Set the mode and refresh the frame title: rendering only applies it on first render */
    #setTroubleshoot(value: boolean): void {
        this.#troubleshoot = value;
        if (this.rendered) this._updateFrame({ window: { title: this.title } });
    }

    override get title(): string {
        return this.#troubleshoot
            ? _loc("PF2E.Migrations.Summary.Troubleshoot.Title")
            : _loc("PF2E.Migrations.Summary.Title");
    }

    protected override async _prepareContext(options: fa.ApplicationRenderOptions): Promise<MigrationSummaryContext> {
        const context = await super._prepareContext(options);
        const unmigrated = {
            actors: this.#collectUnmigrated(game.actors),
            items: this.#collectUnmigrated(game.items),
        };
        const actors = { successful: game.actors.size - unmigrated.actors.length, total: game.actors.size };
        const items = { successful: game.items.size - unmigrated.items.length, total: game.items.size };
        const canRemigrate = this.#troubleshoot || unmigrated.actors.length > 0 || unmigrated.items.length > 0;

        return Object.assign(context, {
            foundryApp: this,
            state: {
                troubleshoot: this.#troubleshoot,
                systemVersion: game.system.version,
                actors,
                items,
                unmigrated,
                canRemigrate,
                helpResources: await TextEditorPF2e.enrichHTML(_loc("PF2E.Migrations.Summary.HelpResources")),
            },
            remigrate: () => this.#remigrate(),
            downloadReport: () => this.#downloadReport(),
        });
    }

    /** Download a plain-text report of unmigrated documents and their failure reasons, for bug reports */
    #downloadReport(): void {
        const unmigrated = [...this.#collectUnmigrated(game.actors), ...this.#collectUnmigrated(game.items)];
        const report = [
            `${game.system.title} ${game.system.version} (schema version ${MigrationRunner.LATEST_SCHEMA_VERSION})`,
            `Foundry VTT ${game.version}`,
            `World schema version: ${game.settings.get(SYSTEM_ID, "worldSchemaVersion")}`,
            `Unmigrated documents: ${unmigrated.length}`,
            ...unmigrated.map((d) => (d.reason ? `- ${d.name} (${d.uuid}): ${d.reason}` : `- ${d.name} (${d.uuid})`)),
        ].join("\n");
        fu.saveDataToFile(report, "text/plain", `${game.system.id}-migration-report.txt`);
        ui.notifications.info("PF2E.Migrations.Summary.ReportDownloaded", { localize: true });
    }

    /** Collect, in one pass, the documents still behind the latest schema */
    #collectUnmigrated(
        collection: Iterable<{ uuid: string; name: string; schemaVersion: number | null }>,
    ): UnmigratedDocument[] {
        const latestSchemaVersion = MigrationRunner.LATEST_SCHEMA_VERSION;
        const unmigrated: UnmigratedDocument[] = [];
        for (const document of collection) {
            if (document.schemaVersion !== latestSchemaVersion) {
                unmigrated.push({
                    uuid: document.uuid,
                    name: document.name,
                    reason: MigrationRunner.lastRunFailures.get(document.uuid) ?? null,
                });
            }
        }
        return unmigrated.sort((a, b) => a.name.localeCompare(b.name));
    }

    async #remigrate(): Promise<void> {
        const { LATEST_SCHEMA_VERSION, RECOMMENDED_SAFE_VERSION } = MigrationRunner;
        const lowestVersion = <T extends { schemaVersion: number | null }>(collection: Collection<string, T>): number =>
            collection.reduce(
                (lowest, document) => Math.min(lowest, document.schemaVersion ?? 0),
                LATEST_SCHEMA_VERSION,
            );
        const lowestSchemaVersion = Math.max(
            Math.min(lowestVersion(game.actors), lowestVersion(game.items)),
            RECOMMENDED_SAFE_VERSION,
        );

        try {
            await game.pf2e.system.remigrate({ from: lowestSchemaVersion });
        } catch (error) {
            console.error(error);
            ui.notifications.error("PF2E.Migrations.Summary.RemigrateFailed", { localize: true });
        }
        this.#setTroubleshoot(false);
        await this.render();
    }
}

interface MigrationSummaryContext extends SvelteApplicationRenderContext {
    foundryApp: MigrationSummary;
    state: {
        troubleshoot: boolean;
        systemVersion: string;
        actors: { successful: number; total: number };
        items: { successful: number; total: number };
        unmigrated: { actors: UnmigratedDocument[]; items: UnmigratedDocument[] };
        canRemigrate: boolean;
        /** Pre-enriched so translations may use content links */
        helpResources: string;
    };
    remigrate: () => Promise<void>;
    downloadReport: () => void;
}

interface UnmigratedDocument {
    uuid: string;
    name: string;
    /** The recorded failure if this document errored during a migration run this session */
    reason: string | null;
}

export { MigrationSummary };
export type { MigrationSummaryContext, UnmigratedDocument };
