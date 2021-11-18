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
    static async ensureSchemaVersion(
        document: ActorPF2e | ItemPF2e,
        migrations: MigrationBase[],
        { preCreate = true } = {}
    ): Promise<void> {
        const currentVersion = this.LATEST_SCHEMA_VERSION;
        if (!document.sourceId && preCreate) {
            document.data.update({ "data.schema.version": currentVersion });
            if ("items" in document) {
                for (const item of document.items) {
                    if (item.schemaVersion === null) {
                        item.data.update({ "data.schema.version": currentVersion });
                    }
                }
            }
        }

        if ((Number(document.schemaVersion) || 0) < currentVersion) {
            const runner = new this(migrations);
            const source = document.data._source;
            const updated = await (async () => {
                try {
                    return "items" in source
                        ? await runner.getUpdatedActor(source, runner.migrations)
                        : await runner.getUpdatedItem(source, runner.migrations);
                } catch {
                    return null;
                }
            })();
            if (updated) document.data.update(updated);
        }
    }

    /** Migrate actor or item documents in batches of 50 */
    private async migrateWorldDocuments<TDocument extends ActorPF2e | ItemPF2e>(
        collection: WorldCollection<TDocument>,
        DocumentClass: {
            updateDocuments(
                updates?: DocumentUpdateData<TDocument>[],
                context?: DocumentModificationContext
            ): Promise<TDocument[]>;
        },
        migrations: MigrationBase[]
    ): Promise<void> {
        const updateGroup: TDocument["data"]["_source"][] = [];
        for await (const document of collection) {
            if (updateGroup.length === 50) {
                try {
                    await DocumentClass.updateDocuments(updateGroup, { noHook: true });
                } catch (error) {
                    console.error(error);
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
                console.error(error);
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
                console.error(error);
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
        for await (const updated of updatedItems) {
            const original = baseActor.items.find((item) => item._id === updated._id);
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

    private async migrateWorldMacro(migrations: MigrationBase[], macro: MacroPF2e): Promise<void> {
        if (!migrations.some((migration) => !!migration.updateMacro)) return;

        try {
            const updatedMacro = await this.getUpdatedMacro(macro.toObject(), migrations);
            const changes = diffObject(macro.toObject(), updatedMacro);
            if (!isObjectEmpty(changes)) {
                await macro.update(changes, { noHook: true });
            }
        } catch (error) {
            console.warn(error);
        }
    }

    private async migrateWorldTable(migrations: MigrationBase[], table: RollTable): Promise<void> {
        if (!migrations.some((migration) => !!migration.updateTable)) return;

        try {
            const updatedMacro = await this.getUpdatedTable(table.toObject(), migrations);
            const changes = diffObject(table.toObject(), updatedMacro);
            if (!isObjectEmpty(changes)) {
                table.update(changes, { noHook: true });
            }
        } catch (error) {
            console.warn(error);
        }
    }

    private async migrateSceneToken(migrations: MigrationBase[], token: TokenDocumentPF2e): Promise<void> {
        if (!migrations.some((migration) => !!migration.updateToken)) return;

        try {
            const updatedToken = await this.getUpdatedToken(token, migrations);
            const changes = diffObject(token.toObject(), updatedToken);

            if (!isObjectEmpty(changes)) {
                await token.update(changes, { noHook: true });
            }
        } catch (error) {
            console.error(error);
        }
    }

    private async migrateUser(migrations: MigrationBase[], user: UserPF2e): Promise<void> {
        if (!migrations.some((migration) => !!migration.updateUser)) return;

        try {
            const baseUser = user.toObject();
            const updatedUser = await this.getUpdatedUser(baseUser, migrations);
            const changes = diffObject(user.toObject(), updatedUser);
            if (!isObjectEmpty(changes)) {
                await user.update(changes, { noHook: true });
            }
        } catch (error) {
            console.error(error);
        }
    }

    async runMigrations(migrations: MigrationBase[]): Promise<void> {
        if (migrations.length === 0) return;

        // Migrate World Actors
        await this.migrateWorldDocuments(game.actors, CONFIG.Actor.documentClass, migrations);

        // Migrate World Items
        await this.migrateWorldDocuments(game.items, CONFIG.Item.documentClass, migrations);

        const promises: Promise<unknown>[] = [];
        // Migrate World Macros
        for (const macro of game.macros) {
            promises.push(this.migrateWorldMacro(migrations, macro));
        }

        // Migrate World RollTables
        for (const table of game.tables) {
            promises.push(this.migrateWorldTable(migrations, table));
        }

        // Run migrations of world compendia
        const packsToRelock = await this.runPackMigrations(migrations, promises);

        for (const user of game.users) {
            promises.push(this.migrateUser(migrations, user));
        }

        // call the free-form migration function. can really do anything
        for (const migration of migrations) {
            if (migration.migrate) promises.push(migration.migrate());
        }

        // the we should wait for the promises to complete before updating the tokens
        // because the unlinked tokens might not need to be updated anymore since they
        // base their data on global actors
        await Promise.allSettled(promises);

        // Relock unlocked world compendia
        for await (const pack of packsToRelock) {
            await pack.configure({ locked: true });
        }

        // Migrate Scene Actors
        for await (const scene of game.scenes.contents) {
            for await (const token of scene.tokens) {
                const actor = token.actor;
                if (actor) {
                    await this.migrateSceneToken(migrations, token);

                    if (actor.isToken) {
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
    }

    /** Migrate actors and items in world compendia */
    private async runPackMigrations(
        migrations: MigrationBase[],
        promises: Promise<unknown>[]
    ): Promise<CompendiumCollection[]> {
        const worldPacks = game.packs.filter((pack) => pack.metadata.package === "world");
        // Packs need to be unlocked in order for their content to be updated
        const packsToRelock = worldPacks.filter((pack) => pack.locked);
        for await (const pack of packsToRelock) {
            await pack.configure({ locked: false });
        }

        // Migrate Compendium Actors
        const actorPacks = worldPacks.filter(
            (pack): pack is CompendiumCollection<ActorPF2e> => pack.documentName === "Actor"
        );
        for await (const pack of actorPacks) {
            for (const actor of await pack.getDocuments()) {
                promises.push(this.migrateWorldActor(migrations, actor));
            }
        }

        // Migrate Compendium Items
        const itemPacks = worldPacks.filter(
            (pack): pack is CompendiumCollection<ItemPF2e> => pack.documentName === "Item"
        );
        for await (const pack of itemPacks) {
            for (const item of await pack.getDocuments()) {
                promises.push(this.migrateWorldItem(migrations, item));
            }
        }

        // Migrate Compendium Macros
        const macroPacks = worldPacks.filter(
            (pack): pack is CompendiumCollection<Macro> => pack.documentName === "Macro"
        );
        for await (const pack of macroPacks) {
            for (const macro of await pack.getDocuments()) {
                promises.push(this.migrateWorldMacro(migrations, macro));
            }
        }

        // Migrate Compendium RollTables
        const tablePacks = worldPacks.filter(
            (pack): pack is CompendiumCollection<RollTable> => pack.documentName === "RollTable"
        );
        for await (const pack of tablePacks) {
            for (const table of await pack.getDocuments()) {
                promises.push(this.migrateWorldTable(migrations, table));
            }
        }

        return packsToRelock;
    }

    async runMigration(force = false) {
        const schemaVersion = {
            latest: MigrationRunner.LATEST_SCHEMA_VERSION,
            current: game.settings.get("pf2e", "worldSchemaVersion"),
        };
        const systemVersion = game.system.data.version;

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

        for await (const migrationPhase of migrationPhases) {
            if (migrationPhase.length > 0) {
                await this.runMigrations(migrationPhase);
            }
        }

        await game.settings.set("pf2e", "worldSchemaVersion", schemaVersion.latest);
    }
}
