import type { ActorPF2e } from "@actor/base.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import type { ItemPF2e } from "@item/base.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import type { MacroPF2e } from "@module/macro.ts";
import { MigrationBase } from "@module/migration/base.ts";
import { MigrationRunnerBase } from "@module/migration/runner/base.ts";
import type { UserPF2e } from "@module/user/index.ts";
import { ScenePF2e } from "@scene/index.ts";
import { TokenDocumentPF2e } from "@scene/token-document/index.ts";
import { Progress } from "@system/progress.ts";

export class MigrationRunner extends MigrationRunnerBase {
    override needsMigration(): boolean {
        return super.needsMigration(game.settings.get("pf2e", "worldSchemaVersion"));
    }

    /** Ensure that an actor or item reflects the current data schema before it is created */
    static async ensureSchemaVersion(document: ActorPF2e | ItemPF2e, migrations: MigrationBase[]): Promise<void> {
        if (migrations.length === 0) return;
        const currentVersion = this.LATEST_SCHEMA_VERSION;

        if ((Number(document.schemaVersion) || 0) < currentVersion) {
            const runner = new this(migrations);
            const source = document._source;
            const updated = await (async () => {
                try {
                    return "items" in source
                        ? await runner.getUpdatedActor(source, runner.migrations)
                        : await runner.getUpdatedItem(source, runner.migrations);
                } catch {
                    return null;
                }
            })();
            if (updated) document.updateSource(updated);
        }

        document.updateSource({ "system.schema.version": currentVersion });
        // Discriminate between item and actor without importing, which would throw errors on the migration test
        if ("items" in document && "token" in document) {
            for (const item of document.items) {
                if (!item.schemaVersion) {
                    item.updateSource({ "system.schema.version": currentVersion });
                }
            }
        }
    }

    /** Migrate actor or item documents in batches of 50 */
    async #migrateDocuments<TDocument extends ActorPF2e<null> | ItemPF2e<null>>(
        collection: WorldCollection<TDocument> | CompendiumCollection<TDocument>,
        migrations: MigrationBase[],
        progress?: Progress
    ): Promise<void> {
        const DocumentClass = collection.documentClass;
        const pack = "metadata" in collection ? collection.metadata.id : null;
        const updateGroup: TDocument["_source"][] = [];
        // Have familiars go last so that their data migration and re-preparation happen after their master's
        for (const document of collection.contents.sort((a) => (a.type === "familiar" ? 1 : -1))) {
            if (updateGroup.length === 50) {
                try {
                    await DocumentClass.updateDocuments(updateGroup, { noHook: true, pack });
                    progress?.advance({ by: updateGroup.length });
                } catch (error) {
                    console.warn(error);
                } finally {
                    updateGroup.length = 0;
                }
            }
            const updated =
                "items" in document
                    ? await this.#migrateActor(migrations, document, { pack })
                    : await this.#migrateItem(migrations, document);
            if (updated) updateGroup.push(updated);
        }
        if (updateGroup.length > 0) {
            try {
                await DocumentClass.updateDocuments(updateGroup, { noHook: true, pack });
                progress?.advance({ by: updateGroup.length });
            } catch (error) {
                console.warn(error);
            }
        }
    }

    async #migrateItem(migrations: MigrationBase[], item: ItemPF2e): Promise<ItemSourcePF2e | null> {
        const baseItem = item.toObject();
        try {
            return this.getUpdatedItem(baseItem, migrations);
        } catch (error) {
            if (error instanceof Error) {
                console.error(`Error thrown while migrating ${item.uuid}: ${error.message}`);
            }
            return null;
        }
    }

    async #migrateActor(
        migrations: MigrationBase[],
        actor: ActorPF2e,
        options: { pack?: string | null } = {}
    ): Promise<ActorSourcePF2e | null> {
        const { pack } = options;
        const baseActor = actor.toObject();
        const updatedActor = await (() => {
            try {
                return this.getUpdatedActor(baseActor, migrations);
            } catch (error) {
                // Output the error, since this means a migration threw it
                if (error instanceof Error) {
                    console.error(`Error thrown while migrating ${actor.uuid}: ${error.message}`);
                }
                return null;
            }
        })();
        if (!updatedActor) return null;

        if (actor.effects.size > 0) {
            // What are these doing here?
            actor.deleteEmbeddedDocuments("ActiveEffect", [], { deleteAll: true });
        }

        const baseItems = [...baseActor.items];
        const updatedItems = [...updatedActor.items];

        // We pull out the items here so that the embedded document operations get called
        const itemDiff = this.diffCollection(baseItems, updatedItems);
        const finalDeleted = itemDiff.deleted.filter((id) => actor.items.has(id));
        if (finalDeleted.length > 0) {
            try {
                await actor.deleteEmbeddedDocuments("Item", finalDeleted, { noHook: true, pack });
            } catch (error) {
                // Output as a warning, since this merely means data preparation following the update
                // (hopefully intermittently) threw an error
                console.warn(error);
            }
        }
        const finalUpdated = itemDiff.updated.filter((i) => actor.items.has(i._id));
        updatedActor.items = [...itemDiff.inserted, ...finalUpdated];

        return updatedActor;
    }

    async #migrateWorldJournalEntry(journalEntry: JournalEntry, migrations: MigrationBase[]): Promise<void> {
        if (!migrations.some((migration) => !!migration.updateJournalEntry)) return;

        try {
            const updated = await this.getUpdatedJournalEntry(journalEntry.toObject(), migrations);
            const changes = diffObject(journalEntry.toObject(), updated);
            if (Object.keys(changes).length > 0) {
                await journalEntry.update(changes, { noHook: true });
            }
        } catch (error) {
            console.warn(error);
        }
    }

    async #migrateWorldMacro(macro: MacroPF2e, migrations: MigrationBase[]): Promise<void> {
        if (!migrations.some((migration) => !!migration.updateMacro)) return;

        try {
            const updatedMacro = await this.getUpdatedMacro(macro.toObject(), migrations);
            const changes = diffObject(macro.toObject(), updatedMacro);
            if (Object.keys(changes).length > 0) {
                await macro.update(changes, { noHook: true });
            }
        } catch (error) {
            console.warn(error);
        }
    }

    async #migrateWorldTable(table: RollTable, migrations: MigrationBase[]): Promise<void> {
        if (!migrations.some((migration) => !!migration.updateTable)) return;

        try {
            const updatedMacro = await this.getUpdatedTable(table.toObject(), migrations);
            const changes = diffObject(table.toObject(), updatedMacro);
            if (Object.keys(changes).length > 0) {
                table.update(changes, { noHook: true });
            }
        } catch (error) {
            console.warn(error);
        }
    }

    async #migrateSceneToken(
        token: TokenDocumentPF2e<ScenePF2e>,
        migrations: MigrationBase[]
    ): Promise<foundry.documents.TokenSource | null> {
        if (!migrations.some((migration) => !!migration.updateToken)) return token.toObject();

        try {
            const updatedToken = await this.getUpdatedToken(token, migrations);
            const changes = diffObject(token.toObject(), updatedToken);

            if (Object.keys(changes).length > 0) {
                try {
                    await token.update(changes, { noHook: true });
                } catch (error) {
                    console.warn(error);
                }
            }
            return updatedToken;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    async #migrateUser(user: UserPF2e, migrations: MigrationBase[]): Promise<void> {
        if (!migrations.some((migration) => !!migration.updateUser)) return;

        try {
            const baseUser = user.toObject();
            const updatedUser = await this.getUpdatedUser(baseUser, migrations);
            const changes = diffObject(user.toObject(), updatedUser);
            if (Object.keys(changes).length > 0) {
                await user.update(changes, { noHook: true });
            }
        } catch (error) {
            console.error(error);
        }
    }

    async runCompendiumMigration<T extends ActorPF2e<null> | ItemPF2e<null>>(
        compendium: CompendiumCollection<T>
    ): Promise<void> {
        ui.notifications.info(game.i18n.format("PF2E.Migrations.Starting", { version: game.system.version }));

        const documents = await compendium.getDocuments();
        const lowestSchemaVersion = Math.min(
            MigrationRunnerBase.LATEST_SCHEMA_VERSION,
            ...documents.map((d) => d.system.schema.version).filter((d): d is number => !!d)
        );

        const migrations = this.migrations.filter((migration) => migration.version > lowestSchemaVersion);
        await this.#migrateDocuments(compendium, migrations);

        ui.notifications.info(game.i18n.format("PF2E.Migrations.Finished", { version: game.system.version }));
    }

    async runMigrations(migrations: MigrationBase[]): Promise<void> {
        if (migrations.length === 0) return;

        /** A roughly estimated "progress max" to reach, for display in the progress bar */
        const progress = new Progress({
            label: game.i18n.localize("PF2E.Migrations.Running"),
            max: Math.floor(
                game.actors.size +
                    game.items.size +
                    game.scenes
                        .map((s) => s.tokens.contents)
                        .flat()
                        .filter((t) => t.actor?.isToken).length
            ),
        });

        // Migrate World Actors
        await this.#migrateDocuments(game.actors, migrations, progress);

        // Migrate World Items
        await this.#migrateDocuments(game.items, migrations, progress);

        // Migrate world journal entries
        for (const entry of game.journal) {
            await this.#migrateWorldJournalEntry(entry, migrations);
        }

        const promises: Promise<unknown>[] = [];
        // Migrate World Macros
        for (const macro of game.macros) {
            promises.push(this.#migrateWorldMacro(macro, migrations));
        }

        // Migrate World RollTables
        for (const table of game.tables) {
            promises.push(this.#migrateWorldTable(table, migrations));
        }

        for (const user of game.users) {
            promises.push(this.#migrateUser(user, migrations));
        }

        // call the free-form migration function. can really do anything
        for (const migration of migrations) {
            if (migration.migrate) promises.push(migration.migrate());
        }

        // the we should wait for the promises to complete before updating the tokens
        // because the unlinked tokens might not need to be updated anymore since they
        // base their data on global actors
        await Promise.allSettled(promises);

        // Migrate tokens and synthetic actors
        for (const scene of game.scenes) {
            for (const token of scene.tokens) {
                const { actor } = token;
                if (!actor) continue;

                const wasSuccessful = !!(await this.#migrateSceneToken(token, migrations));
                if (!wasSuccessful) continue;

                // Only migrate if the delta of the synthetic actor has migratable data
                const deltaSource = token.delta?._source;
                const hasMigratableData =
                    (!!deltaSource && !!deltaSource.flags?.pf2e) ||
                    ((deltaSource ?? {}).items ?? []).length > 0 ||
                    Object.keys(deltaSource?.system ?? {}).length > 0;

                if (actor.isToken) {
                    if (hasMigratableData) {
                        const updated = await this.#migrateActor(migrations, actor);
                        if (updated) {
                            try {
                                await actor.update(updated, { noHook: true });
                            } catch (error) {
                                console.warn(error);
                            }
                        }
                    }
                    progress.advance();
                }
            }
        }

        // *Something* was miscalculated, but migrations are complete: close the progress bar.
        if (progress.value < progress.max) progress.close();
    }

    async runMigration(force = false): Promise<void> {
        const schemaVersion = {
            latest: MigrationRunner.LATEST_SCHEMA_VERSION,
            current: game.settings.get("pf2e", "worldSchemaVersion"),
        };
        const systemVersion = game.system.version;

        ui.notifications.info(game.i18n.format("PF2E.Migrations.Starting", { version: systemVersion }));

        const migrationsToRun = force
            ? this.migrations
            : this.migrations.filter((x) => schemaVersion.current < x.version);

        // We need to break the migration into phases sometimes.
        // for instance, if a migration creates an item, we need to push that to
        // the foundry backend in order to get an id for the item.
        // This way if a later migration depends on the item actually being created,
        // it will work.
        const migrationPhases: MigrationBase[][] = [[]];
        for (const migration of migrationsToRun) {
            migrationPhases[migrationPhases.length - 1].push(migration);
            if (migration.requiresFlush) {
                migrationPhases.push([]);
            }
        }

        for (const migrationPhase of migrationPhases) {
            if (migrationPhase.length > 0) {
                await this.runMigrations(migrationPhase);
            }
        }

        await game.settings.set("pf2e", "worldSchemaVersion", schemaVersion.latest);
    }
}
