import { ActorPF2e, UserPF2e } from './actor/base';
import { ItemPF2e } from './item/base';
import { MigrationRunnerBase } from './migration-runner-base';
import { MigrationBase } from './migrations/base';

export class MigrationRunner extends MigrationRunnerBase {
    constructor(migrations: MigrationBase[] = []) {
        super(migrations);
    }

    needsMigration(): boolean {
        return super.needsMigration(game.settings.get('pf2e', 'worldSchemaVersion'));
    }

    private async migrateWorldItem(migrations: MigrationBase[], item: ItemPF2e, pack?: Compendium<ItemPF2e>) {
        try {
            const updatedItem = await this.getUpdatedItem(item._data, migrations);
            const changes = diffObject(item._data, updatedItem);
            if (!isObjectEmpty(changes)) {
                pack
                    ? await pack.updateEntity({ _id: item.id, ...changes }, { enforceTypes: false })
                    : await item.update(changes, { enforceTypes: false });
            }
        } catch (err) {
            console.error(err);
        }
    }

    private async migrateWorldActor(migrations: MigrationBase[], actor: ActorPF2e, pack?: Compendium<ActorPF2e>) {
        try {
            const baseActor = duplicate(actor._data);
            const updatedActor = await this.getUpdatedActor(baseActor, migrations);

            const baseItems = baseActor.items;
            const updatedItems = updatedActor.items;

            delete (baseActor as { items?: unknown[] }).items;
            delete (updatedActor as { items?: unknown[] }).items;
            if (JSON.stringify(baseActor) !== JSON.stringify(updatedActor)) {
                pack
                    ? await pack.updateEntity(updatedActor, { enforceTypes: false })
                    : await actor.update(updatedActor, { enforceTypes: false });
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

    private async migrateUser(migrations: MigrationBase[], user: UserPF2e): Promise<void> {
        const baseUser = duplicate(user._data);
        const updatedUser = await this.getUpdatedUser(baseUser, migrations);
        try {
            const changes = diffObject(user._data, updatedUser);
            if (!isObjectEmpty(changes)) {
                await user.update(changes, { enforceTypes: false });
            }
        } catch (err) {
            console.error(err);
        }
    }

    private async migrateSceneToken(migrations: MigrationBase[], scene: Scene, tokenData: TokenData) {
        try {
            if (tokenData.actorLink || !game.actors.has(tokenData.actorId)) {
                // if the token is linked or has no actor, we don't need to do anything
                return;
            }

            // build up the actor data
            const baseActor = game.actors.get(tokenData.actorId);
            if (!baseActor) return;
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

    async runMigrations(migrations: MigrationBase[]): Promise<void> {
        let promises: Promise<void>[] = [];

        // Migrate World Actors
        for (const actor of game.actors) {
            promises.push(this.migrateWorldActor(migrations, actor));
        }

        // Migrate World Items
        for (const item of game.items) {
            promises.push(this.migrateWorldItem(migrations, item));
        }

        // Run migrations of world compendia
        const packsToRelock = await this.runPackMigrations(migrations, promises);

        for (const user of game.users) {
            promises.push(this.migrateUser(migrations, user));
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

        // Relock unlocked world compendia
        for await (const pack of packsToRelock) {
            await pack.configure({ locked: true });
        }

        // Migrate Scene Actors
        for (const scene of game.scenes.entities) {
            for (const token of scene.data.tokens) {
                promises.push(this.migrateSceneToken(migrations, scene, token));
            }
        }

        await Promise.all(promises);
    }

    /** Migrate actors and items in world compendia */
    private async runPackMigrations(migrations: MigrationBase[], promises: Promise<void>[]): Promise<Compendium[]> {
        const worldPacks: Compendium<ActorPF2e | ItemPF2e>[] = game.packs.filter(
            (pack) => pack.collection.startsWith('world.') && ['Actor', 'Item'].includes(pack.entity),
        );
        // Packs need to be unlocked in order for their content to be updated
        const packsToRelock = worldPacks.filter((pack) => pack.locked);
        for await (const pack of packsToRelock) {
            await pack.configure({ locked: false });
        }

        // Migrate Compendium Actors
        const actorPacks = worldPacks.filter((pack): pack is Compendium<ActorPF2e> => pack.entity === 'Actor');
        for await (const pack of actorPacks) {
            for (const actor of await pack.getContent()) {
                promises.push(this.migrateWorldActor(migrations, actor, pack));
            }
        }

        // Migrate Compendium Items
        const itemPacks = worldPacks.filter((pack): pack is Compendium<ItemPF2e> => pack.entity === 'Item');
        for await (const pack of itemPacks) {
            for (const item of await pack.getContent()) {
                promises.push(this.migrateWorldItem(migrations, item, pack));
            }
        }

        return packsToRelock;
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

        game.settings.set('pf2e', 'worldSchemaVersion', this.latestVersion);
        ui.notifications.info(`PF2E System Migration to version ${systemVersion} completed!`, { permanent: true });
    }
}
