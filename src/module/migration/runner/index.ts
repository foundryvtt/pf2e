import type { ActorPF2e } from "@actor/base";
import type { ItemPF2e } from "@item/base";
import type { MacroPF2e } from "@module/macro";
import { MigrationRunnerBase } from "@module/migration/runner/base";
import { MigrationBase } from "@module/migration/base";
import type { UserPF2e } from "@module/user";
import { TokenDocumentPF2e } from "@module/scene/token-document";
import { ItemSourcePF2e } from "@item/data";
import { ActorSourcePF2e } from "@actor/data";

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
    private async migrateWorldDocuments<TDocument extends ActorPF2e | ItemPF2e>(
        collection: WorldCollection<TDocument>,
        migrations: MigrationBase[]
    ): Promise<void> {
        const DocumentClass = collection.documentClass as unknown as typeof ClientDocument;
        const updateGroup: TDocument["_source"][] = [];
        // Have familiars go last so that their data migration and re-preparation happen after their master's
        for (const document of collection.contents.sort((a) => (a.type === "familiar" ? 1 : -1))) {
            if (updateGroup.length === 50) {
                try {
                    await DocumentClass.updateDocuments(updateGroup, { noHook: true });
                } catch (error) {
                    console.warn(error);
                } finally {
                    updateGroup.length = 0;
                }
            }
            const updated =
                "items" in document
                    ? await this.migrateWorldActor(migrations, document)
                    : await this.migrateWorldItem(migrations, document);
            if (updated) updateGroup.push(updated);
        }
        if (updateGroup.length > 0) {
            try {
                await DocumentClass.updateDocuments(updateGroup, { noHook: true });
            } catch (error) {
                console.warn(error);
            }
        }
    }

    private async migrateWorldItem(migrations: MigrationBase[], item: ItemPF2e): Promise<ItemSourcePF2e | null> {
        const baseItem = item.toObject();
        const updatedItem = await (() => {
            try {
                return this.getUpdatedItem(baseItem, migrations);
            } catch (error) {
                console.error(error);
                return null;
            }
        })();
        if (!updatedItem) return null;

        const baseAEs = [...baseItem.effects];
        const updatedAEs = [...updatedItem.effects];
        const aeDiff = this.diffCollection(baseAEs, updatedAEs);
        if (aeDiff.deleted.length > 0) {
            try {
                const finalDeleted = aeDiff.deleted.filter((deletedId) =>
                    item.effects.some((effect) => effect.id === deletedId)
                );
                await item.deleteEmbeddedDocuments("ActiveEffect", finalDeleted, { noHook: true });
            } catch (error) {
                console.warn(error);
            }
        }

        updatedItem.effects = item.actor?.isToken ? updatedAEs : aeDiff.updated;
        return updatedItem;
    }

    private async migrateWorldActor(migrations: MigrationBase[], actor: ActorPF2e): Promise<ActorSourcePF2e | null> {
        const baseActor = actor.toObject();
        const updatedActor = await (() => {
            try {
                return this.getUpdatedActor(baseActor, migrations);
            } catch (error) {
                // Output the error, since this means a migration threw it
                console.error(error);
                return null;
            }
        })();
        if (!updatedActor) return null;

        const baseItems = [...baseActor.items];
        const baseAEs = [...baseActor.effects];
        const updatedItems = [...updatedActor.items];
        const updatedAEs = [...updatedActor.effects];

        // We pull out the items here so that the embedded document operations get called
        const itemDiff = this.diffCollection(baseItems, updatedItems);
        if (itemDiff.deleted.length > 0) {
            try {
                const finalDeleted = itemDiff.deleted.filter((deletedId) =>
                    actor.items.some((item) => item.id === deletedId)
                );
                await actor.deleteEmbeddedDocuments("Item", finalDeleted, { noHook: true });
            } catch (error) {
                // Output as a warning, since this merely means data preparation following the update
                // (hopefully intermittently) threw an error
                console.warn(error);
            }
        }

        const aeDiff = this.diffCollection(baseAEs, updatedAEs);
        if (aeDiff.deleted.length > 0) {
            try {
                const finalDeleted = aeDiff.deleted.filter((deletedId) =>
                    actor.effects.some((effect) => effect.id === deletedId)
                );
                await actor.deleteEmbeddedDocuments("ActiveEffect", finalDeleted, { noHook: true });
            } catch (error) {
                console.warn(error);
            }
        }

        if (itemDiff.inserted.length > 0) {
            try {
                await actor.createEmbeddedDocuments("Item", itemDiff.inserted, { noHook: true });
            } catch (error) {
                console.warn(error);
            }
        }

        // Delete embedded ActiveEffects on embedded Items
        for (const updated of updatedItems) {
            const original = baseActor.items.find((i) => i._id === updated._id);
            if (!original) continue;
            const itemAEDiff = this.diffCollection(original.effects, updated.effects);
            if (itemAEDiff.deleted.length > 0) {
                // Doubly-embedded documents can't be updated or deleted directly, so send up the entire item
                // as a full replacement update
                try {
                    await Item.updateDocuments([updated], { parent: actor, diff: false, recursive: false });
                } catch (error) {
                    console.warn(error);
                }
            }
        }

        updatedActor.items = actor.isToken ? updatedItems : itemDiff.updated;
        return updatedActor;
    }

    private async migrateWorldJournalEntry(journalEntry: JournalEntry, migrations: MigrationBase[]): Promise<void> {
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

    private async migrateWorldMacro(macro: MacroPF2e, migrations: MigrationBase[]): Promise<void> {
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

    private async migrateWorldTable(table: RollTable, migrations: MigrationBase[]): Promise<void> {
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

    private async migrateSceneToken(
        token: TokenDocumentPF2e,
        migrations: MigrationBase[]
    ): Promise<foundry.data.TokenSource | null> {
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

    private async migrateUser(user: UserPF2e, migrations: MigrationBase[]): Promise<void> {
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

    async runMigrations(migrations: MigrationBase[]): Promise<void> {
        if (migrations.length === 0) return;

        // Migrate World Actors
        await this.migrateWorldDocuments(game.actors as WorldCollection<ActorPF2e>, migrations);

        // Migrate World Items
        await this.migrateWorldDocuments(game.items, migrations);

        // Migrate world journal entries
        for (const entry of game.journal) {
            await this.migrateWorldJournalEntry(entry, migrations);
        }

        const promises: Promise<unknown>[] = [];
        // Migrate World Macros
        for (const macro of game.macros) {
            promises.push(this.migrateWorldMacro(macro, migrations));
        }

        // Migrate World RollTables
        for (const table of game.tables) {
            promises.push(this.migrateWorldTable(table, migrations));
        }

        for (const user of game.users) {
            promises.push(this.migrateUser(user, migrations));
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

                const wasSuccessful = !!(await this.migrateSceneToken(token, migrations));
                if (!wasSuccessful) continue;

                // Only migrate if the synthetic actor has replaced migratable data
                const hasMigratableData =
                    !!token._source.actorData.flags?.pf2e ||
                    Object.keys(token._source.actorData).some((k) => ["items", "system"].includes(k));

                if (actor.isToken && hasMigratableData) {
                    const updated = await this.migrateWorldActor(migrations, actor);
                    if (updated) {
                        try {
                            await actor.update(updated);
                        } catch (error) {
                            console.warn(error);
                        }
                    }
                }
            }
        }
    }

    async runMigration(force = false) {
        const schemaVersion = {
            latest: MigrationRunner.LATEST_SCHEMA_VERSION,
            current: game.settings.get("pf2e", "worldSchemaVersion"),
        };
        const systemVersion = game.system.version;

        ui.notifications.info(game.i18n.format("PF2E.Migrations.Starting", { version: systemVersion }), {
            permanent: true,
        });

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
