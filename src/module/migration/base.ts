import { ActorSourcePF2e } from '@actor/data';
import { ItemSourcePF2e } from '@item/data';

/**
 * This is the base class for a migration.
 * If you make a change to the database schema (i.e. anything in template.json or data-definitions.ts),
 * you should create a migration. To do so, there are several steps:
 * - Bump the schema number in system.json
 * - Make a class that inherits this base class and implements `updateActor` or `updateItem` using the
 *   new value of the schema number as the version
 * - Add this class to getAllMigrations() in src/module/migrations/index.ts
 * - Test that your changes work. We have unit tests in tests/module/migration.test.ts as well as you
 *   should add your migration to packs/run-migration
 */
export abstract class MigrationBase {
    /**
     * This is the schema version. Make sure it matches the new version in system.json
     */
    static readonly version: number;

    readonly version = (this.constructor as typeof MigrationBase).version;

    /**
     * Setting requiresFlush to true will indicate that the migration runner should not call any more
     * migrations after this in a batch. Use this if you are adding items to actors for instance.
     */
    requiresFlush = false;

    /**
     * Update the actor to the latest schema version.
     * @param actor This should be effectively a `ActorSourcePF2e` from the previous version.
     */
    async updateActor(_actor: ActorSourcePF2e): Promise<void> {}

    /**
     * Update the item to the latest schema version.
     * @param item Item to update. This should be an `ItemData` from the previous version.
     * @param actor If the item is part of an actor, this is set to the actor. For instance
     * if you only want to update items that are on a npc you can do that here.
     */
    async updateItem(_item: ItemSourcePF2e, _actor?: ActorSourcePF2e): Promise<void> {}

    /**
     * Update the macro to the latest schema version.
     * @param macroData Macro data to update. This should be a `MacroData` from the previous version.
     */
    async updateMacro(_macroData: foundry.data.MacroSource): Promise<void> {}

    /**
     * Update the chat message to the latest schema version.
     * @param messageData Message data to update. This should be a `ChatMessageData` from the previous version.
     */
    async updateMessage(_messageData: foundry.data.ChatMessageSource): Promise<void> {}

    /**
     * Update the rollable table to the latest schema version.
     * @param tableData Rolltable data to update. This should be a `RollTableData` from the previous version.
     */
    async updateTable(_tableData: foundry.data.RollTableSource): Promise<void> {}

    /**
     * Update the token to the latest schema version.
     * @param tokenData Token data to update. This should be a `TokenData` from the previous version.
     */
    async updateToken(_tokenData: foundry.data.TokenSource): Promise<void> {}

    /**
     * Update the user to the latest schema version.
     * @param userData User's data to update. This should be a `UserData` from the previous version.
     */
    async updateUser(_userData: foundry.data.UserSource): Promise<void> {}

    /**
     * Run migrations for this schema version.
     * Sometimes there needs to be custom steps run during a migration. For instance, if the change
     * isn't actor or item related. This function will be called during the migration.
     */
    async migrate() {}
}
