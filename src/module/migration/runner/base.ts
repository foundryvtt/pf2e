import { ActorSourcePF2e } from '@actor/data';
import { ItemSourcePF2e } from '@item/data';
import { DocumentSchemaRecord } from '@module/data';
import { MigrationBase } from '@module/migration/base';
import { TokenDocumentPF2e } from '@module/scene/token-document';
import { ErrorPF2e } from '@module/utils';
import { DateTime } from 'luxon';

interface ItemsDiff {
    inserted: ItemSourcePF2e[];
    deleted: string[];
    updated: ItemSourcePF2e[];
}

export class MigrationRunnerBase {
    migrations: MigrationBase[];

    static LATEST_SCHEMA_VERSION = 0.648;

    static MINIMUM_SAFE_VERSION = 0.6;

    static RECOMMENDED_SAFE_VERSION = 0.619;

    constructor(migrations: MigrationBase[] = []) {
        this.migrations = migrations.sort((a, b) => a.version - b.version);
    }

    needsMigration(currentVersion: number): boolean {
        return currentVersion < (this.constructor as typeof MigrationRunnerBase).LATEST_SCHEMA_VERSION;
    }

    diffItems(orig: ItemSourcePF2e[], updated: ItemSourcePF2e[]): ItemsDiff {
        const ret: ItemsDiff = {
            inserted: [],
            deleted: [],
            updated: [],
        };

        const origItems: Map<string, ItemSourcePF2e> = new Map();
        for (const item of orig) {
            origItems.set(item._id, item);
        }

        for (const item of updated) {
            const origItem = origItems.get(item._id);
            if (origItem) {
                // check to see if anything changed
                if (JSON.stringify(origItem) !== JSON.stringify(item)) {
                    ret.updated.push(item);
                }
                origItems.delete(item._id);
            } else {
                // it's new
                ret.inserted.push(item);
            }
        }

        // since we've been deleting them as we process, the ones remaining need to be deleted
        for (const item of origItems.values()) {
            ret.deleted.push(item._id);
        }

        return ret;
    }

    async getUpdatedItem(item: ItemSourcePF2e, migrations: MigrationBase[]): Promise<ItemSourcePF2e> {
        const current = deepClone(item);

        for await (const migration of migrations) {
            try {
                await migration.updateItem(current);
                // Handle embedded spells
                if (current.type === 'consumable' && current.data.spell.data) {
                    await migration.updateItem(current.data.spell.data);
                }
            } catch (err) {
                console.error(err);
            }
        }
        this.updateSchemaRecord(current.data.schema, migrations.slice(-1)[0]);

        return current;
    }

    async getUpdatedActor(actor: ActorSourcePF2e, migrations: MigrationBase[]): Promise<ActorSourcePF2e> {
        const currentActor = deepClone(actor);

        for await (const migration of migrations) {
            try {
                await migration.updateActor(currentActor);
                for await (const currentItem of currentActor.items) {
                    await migration.updateItem(currentItem, currentActor);
                    // Handle embedded spells
                    if (currentItem.type === 'consumable' && currentItem.data.spell.data) {
                        await migration.updateItem(currentItem.data.spell.data, currentActor);
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }

        const latestMigration = migrations.slice(-1)[0];
        this.updateSchemaRecord(currentActor.data.schema, latestMigration);
        for (const itemSource of currentActor.items) {
            this.updateSchemaRecord(itemSource.data.schema, latestMigration);
        }

        return currentActor;
    }

    private updateSchemaRecord(schema: DocumentSchemaRecord, latestMigration: MigrationBase | undefined): void {
        if (!latestMigration) throw ErrorPF2e('No migrations in this run!');

        const fromVersion = typeof schema.version === 'number' ? schema.version : null;
        schema.version = latestMigration.version;
        schema.lastMigration = {
            datetime: DateTime.now().toISO(),
            version: {
                schema: fromVersion,
                foundry: 'game' in globalThis ? game.data.version : undefined,
                system: 'game' in globalThis ? game.system.data.version : undefined,
            },
        };
    }

    async getUpdatedMessage(
        messageData: foundry.data.ChatMessageSource,
        migrations: MigrationBase[],
    ): Promise<foundry.data.ChatMessageSource> {
        const current = duplicate(messageData);

        for (const migration of migrations) {
            try {
                await migration.updateMessage(current);
            } catch (err) {
                console.error(err);
            }
        }

        return current;
    }

    async getUpdatedMacro(
        macroSource: foundry.data.MacroSource,
        migrations: MigrationBase[],
    ): Promise<foundry.data.MacroSource> {
        const current = deepClone(macroSource);

        for (const migration of migrations) {
            try {
                await migration.updateMacro(current);
            } catch (err) {
                console.error(err);
            }
        }

        return current;
    }

    async getUpdatedTable(
        tableSource: foundry.data.RollTableSource,
        migrations: MigrationBase[],
    ): Promise<foundry.data.RollTableSource> {
        const current = deepClone(tableSource);

        for (const migration of migrations) {
            try {
                await migration.updateTable(current);
            } catch (err) {
                console.error(err);
            }
        }

        return current;
    }

    async getUpdatedToken(token: TokenDocumentPF2e, migrations: MigrationBase[]): Promise<foundry.data.TokenSource> {
        const current = token.toObject();
        for (const migration of migrations) {
            try {
                await migration.updateToken(current, token.actor, token.scene);
            } catch (err) {
                console.error(err);
            }
        }

        return current;
    }

    async getUpdatedUser(
        userData: foundry.data.UserSource,
        migrations: MigrationBase[],
    ): Promise<foundry.data.UserSource> {
        const current = duplicate(userData);
        for (const migration of migrations) {
            try {
                await migration.updateUser(current);
            } catch (err) {
                console.error(err);
            }
        }

        return current;
    }
}
