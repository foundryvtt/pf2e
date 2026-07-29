import type { ActorPF2e } from "@actor";
import type CompendiumCollection from "@client/documents/collections/compendium-collection.d.mts";
import type { ItemPF2e } from "@item";
import { MigrationList, MigrationRunner } from "@module/migration/index.ts";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import type { UnmigratedDocument } from "../migration-summary/app.ts";
import Root from "./app.svelte";

interface CompendiumMigrationStatusConfiguration extends fa.ApplicationConfiguration {
    compendium: CompendiumCollection<ActorPF2e<null> | ItemPF2e<null>>;
}

/** Dialog used to view compendium data and migrate them. */
class CompendiumMigrationStatus extends SvelteApplicationMixin<
    AbstractConstructorOf<fa.api.ApplicationV2> & {
        DEFAULT_OPTIONS: DeepPartial<CompendiumMigrationStatusConfiguration>;
    }
>(fa.api.ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<CompendiumMigrationStatusConfiguration> = {
        id: "{id}",
        classes: ["compendium-migration-status"],
        window: {
            title: "PF2E.CompendiumMigrationStatus.Title",
        },
    };

    protected root = Root;

    declare options: CompendiumMigrationStatusConfiguration;

    constructor(options: DeepPartial<CompendiumMigrationStatusConfiguration> & { compendium: CompendiumCollection }) {
        // Reuse an existing instance for this pack
        const existing = foundry.applications.instances.get(
            `compendium-migration-status-${options.compendium.metadata.id}`,
        );
        if (existing instanceof CompendiumMigrationStatus) return existing;
        super(options);
    }

    /** The number of documents still below the latest schema version as of the last render */
    #outdatedCount = 0;

    /** Whether a migration has been run from this window */
    #ranMigration = false;

    get compendium(): CompendiumCollection<ActorPF2e<null> | ItemPF2e<null>> {
        return this.options.compendium;
    }

    protected override _initializeApplicationOptions(
        options: Partial<CompendiumMigrationStatusConfiguration>,
    ): CompendiumMigrationStatusConfiguration {
        const initialized = super._initializeApplicationOptions(options) as CompendiumMigrationStatusConfiguration;
        initialized.uniqueId = `compendium-migration-status-${initialized.compendium.metadata.id}`;
        return initialized;
    }

    /** Re-render when the pack's contents or configuration (such as its lock state) change */
    protected override async _onFirstRender(
        context: CompendiumMigrationStatusContext,
        options: fa.ApplicationRenderOptions,
    ): Promise<void> {
        await super._onFirstRender(context, options);
        this.compendium.apps.push(this);
    }

    protected override _tearDown(options: fa.ApplicationClosingOptions): void {
        this.compendium.apps.findSplice((a) => a === this);
        super._tearDown(options);
    }

    protected override async _prepareContext(
        options: fa.ApplicationRenderOptions,
    ): Promise<CompendiumMigrationStatusContext> {
        const context = await super._prepareContext(options);
        const latestVersion = MigrationRunner.LATEST_SCHEMA_VERSION;

        // Request a throwaway random field to force a fresh index from the server: the local index can be
        // stale for documents another client updated
        const index = await this.compendium.getIndex({
            fields: [fu.randomID(), "system._migration", "system.schema", "data.schema"],
        });
        const entries = index.map((entry) => ({ entry, version: MigrationRunner.schemaVersionFromIndex(entry) }));
        const schemaVersion = Math.min(...entries.map((e) => e.version));
        const outdated = entries.filter((e) => !(e.version >= latestVersion));
        this.#outdatedCount = outdated.length;

        // The latest Foundry generation whose starting schema version this pack has reached
        const foundryGeneration = [...MigrationRunner.FOUNDRY_SCHEMA_VERSIONS].findLast(
            ([, schema]) => schemaVersion >= schema,
        )?.[0];
        const foundryVersion = foundryGeneration?.toString() ?? _loc("PF2E.CompendiumMigrationStatus.FoundryOld");

        return Object.assign(context, {
            foundryApp: this,
            state: {
                label: this.compendium.metadata.label,
                documentName: this.compendium.documentName,
                moduleTitle: game.modules.get(this.compendium.metadata.packageName ?? "")?.title ?? null,
                size: index.contents.length,
                schemaVersion: Number.isNaN(schemaVersion)
                    ? _loc("PF2E.CompendiumMigrationStatus.Invalid")
                    : schemaVersion,
                latestVersion,
                foundryVersion,
                updated: schemaVersion >= latestVersion,
                outdatedCount: this.#outdatedCount,
                locked: this.compendium.locked,
                // Before a run, only documents with recorded failures. After one, everything still out of date.
                failures: outdated
                    .map(({ entry }): UnmigratedDocument => ({
                        uuid: entry.uuid,
                        name: entry.name,
                        reason: MigrationRunner.lastRunFailures.get(entry.uuid) ?? null,
                    }))
                    .filter((d) => this.#ranMigration || !!d.reason)
                    .sort((a, b) => a.name.localeCompare(b.name)),
            },
            migrate: () => this.#migrate(),
        });
    }

    async #migrate(): Promise<void> {
        const runner = new MigrationRunner(MigrationList.constructFromVersion(null));
        await runner.runCompendiumMigration(this.compendium);
        this.#ranMigration = true;
        await this.render();
    }
}

interface CompendiumMigrationStatusContext extends SvelteApplicationRenderContext {
    foundryApp: CompendiumMigrationStatus;
    state: {
        label: string;
        documentName: string;
        moduleTitle: string | null;
        size: number;
        schemaVersion: number | string;
        latestVersion: number;
        foundryVersion: string;
        updated: boolean;
        outdatedCount: number;
        locked: boolean;
        /** Outdated documents with a recorded failure reason from the last migration run this session */
        failures: UnmigratedDocument[];
    };
    migrate: () => Promise<void>;
}

export { CompendiumMigrationStatus };
export type { CompendiumMigrationStatusContext };
