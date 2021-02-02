import { PF2EActor } from './actor/actor';
import { PF2EItem } from './item/item';
import { MigrationRunnerBase } from './migration-runner-base';
import { MigrationBase } from './migrations/base';

export class MigrationRunner extends MigrationRunnerBase {
    latestVersion: number;
    migrations: MigrationBase[];

    constructor(migrations: MigrationBase[]) {
        super(migrations);
    }

    needsMigration(): boolean {
        return super.needsMigration(game.settings.get('pf2e', 'worldSchemaVersion'));
    }

    protected async migrateWorldItem(item: PF2EItem, migrations: MigrationBase[]) {
        try {
            const updatedItem = await this.getUpdatedItem(item._data, migrations);
            const changes = diffObject(item, updatedItem);
            if (!isObjectEmpty(changes)) {
                await item.update(changes, { enforceTypes: false });
            }
        } catch (err) {
            console.error(err);
        }
    }

    protected async migrateWorldActor(actor: PF2EActor, migrations: MigrationBase[]) {
        try {
            const baseActor = duplicate(actor._data);
            const updatedActor = await this.getUpdatedActor(baseActor, migrations);

            const baseItems = baseActor.items;
            const updatedItems = updatedActor.items;

            delete baseActor.items;
            delete updatedActor.items;
            if (JSON.stringify(baseActor) !== JSON.stringify(updatedActor)) {
                await actor.update(updatedActor, { enforceTypes: false });
            }

            // we pull out the items here so that the embedded document operations get called
            const itemDiff = this.diffItems(baseItems, updatedItems);
            if (itemDiff.deleted.length > 0) {
                await actor.deleteEmbeddedEntity('OwnedItem', itemDiff.deleted);
            }
            if (itemDiff.inserted.length > 0) {
                await actor.createEmbeddedEntity('OwnedItem', itemDiff.inserted);
            }
            if (itemDiff.updated.length > 0) {
                await actor.updateEmbeddedEntity('OwnedItem', itemDiff.updated);
            }
        } catch (err) {
            console.error(err);
        }
    }

    protected async migrateSceneToken(scene: Scene, tokenData: TokenData, migrations: MigrationBase[]) {
        try {
            if (tokenData.actorLink || !game.actors.has(tokenData.actorId)) {
                // if the token is linked or has no actor, we don't need to do anything
                return;
            }

            // build up the actor data
            const baseActor = game.actors.get(tokenData.actorId);
            const actorData = mergeObject(baseActor._data, tokenData.actorData, { inplace: false });

            const updatedActor = await this.getUpdatedActor(actorData, migrations);
            const changes = diffObject(actorData, updatedActor);
            if (!isObjectEmpty(changes)) {
                const actorDataChanges = Object.fromEntries(
                    Object.entries(changes).map(([k, v]) => [`actorData.${k}`, v]),
                );
                await scene.updateEmbeddedEntity(
                    'Token',
                    { _id: tokenData._id, ...actorDataChanges },
                    { enforceTypes: false },
                );
            }
        } catch (err) {
            console.error(err);
        }
    }

    async runMigrations(migrations: MigrationBase[]) {
        let promises = [];

        // Migrate World Actors
        for (const actor of game.actors.entities) {
            promises.push(this.migrateWorldActor(actor, migrations));
        }

        // Migrate World Items
        for (const item of game.items.entities) {
            promises.push(this.migrateWorldItem(item, migrations));
        }

        // call the free-form migration function. can really do anything
        for (const migration of migrations) {
            promises.push(migration.migrate());
        }

        // the we should wait for the promises to complete before updating the tokens
        // because the unlinked tokens might not need to be updated anymore since they
        // base their data on global actors
        await Promise.all(promises);
        promises = [];

        // Migrate Scene Actors
        for (const scene of game.scenes.entities) {
            for (const token of scene.data.tokens) {
                promises.push(this.migrateSceneToken(scene, token, migrations));
            }
        }

        await Promise.all(promises);
    }

    async runMigration() {
        const systemVersion = game.system.data.version;
        const currentVersion = game.settings.get('pf2e', 'worldSchemaVersion');

        ui.notifications.info(
            `Applying PF2E System Migration to version ${systemVersion}. Please be patient and do not close your game or shut down your server.`,
            { permanent: true },
        );

        const migrationsToRun = this.migrations.filter((x) => currentVersion < x.version);

        // We need to break the migration into phases sometimes.
        // for instance, if a migration creates an item, we need to push that to
        // the foundry backend in order to get an id for the item.
        // This way if a later migration depends on the item actually being created,
        // it will work.
        const migrationPhases = [[]];
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

        game.settings.set('pf2e', 'worldSchemaVersion', this.latestVersion);
        ui.notifications.info(`PF2E System Migration to version ${systemVersion} completed!`, { permanent: true });
    }
}
