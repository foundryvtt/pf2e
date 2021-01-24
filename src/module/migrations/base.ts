import { ActorDataPF2e } from '../actor/actorDataDefinitions';
import { ItemData } from '../item/dataDefinitions';

/**
 * This is the base class for a migration.
 * If you make a change to the database schema (i.e. anything in template.json or dataDefinitions.ts),
 * you should create a migration. To do so, there are several steps:
 * - Bump the schema number in system.json
 * - Make a class that inherits this base class and implements `updateActor` or `updateItem` using the
 *   new value of the schema number as the version
 * - Add this class to getAllMigrations() in src/module/migrations/index.ts
 * - Test that your changes work. We have unit tests in tests/module/migration.test.ts as well as you
 *   should add your migration to packs/run-migration
 */
export class MigrationBase {
    /**
     * This is the schema version. Make sure it matches the new version in system.json
     */
    static readonly version: number;

    readonly version = this.constructor['version'];

    /**
     * Setting requiresFlush to true will indicate that the migration runner should not call any more
     * migrations after this in a batch. Use this if you are adding items to actors for instance.
     */
    requiresFlush: boolean = false;

    /**
     * Update the actor to the latest schema version.
     * @param {actor} actor This should be effectively a `ActorDataPF2e` from the previous version.
     */
    async updateActor(actor: any) {}

    /**
     * Update the item to the latest schema version.
     * @param {item} item Item to update. This should be an `ItemData` from the previous version
     * @param {actor} actor If the item is part of an actor, this is set to the actor. For instance
     * if you only want to update items that are on a npc you can do that here.
     */
    async updateItem(item: ItemData, actor?: ActorDataPF2e) {}

    /**
     * Run migrations for this schema version.
     * Sometimes there needs to be custom steps run during a migration. For instance, if the change
     * isn't actor or item related. This function will be called during the migration.
     */
    async migrate() {}
}
