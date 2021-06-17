import { ActorSourcePF2e } from '@actor/data';
import { ItemSourcePF2e } from '@item/data';
import { MigrationBase } from '@module/migration/base';

interface ItemsDiff {
    inserted: ItemSourcePF2e[];
    deleted: string[];
    updated: ItemSourcePF2e[];
}

export class MigrationRunnerBase {
    migrations: MigrationBase[];

    static LATEST_SCHEMA_VERSION = 0.638;

    static MINIMUM_SAFE_VERSION = 0.6;

    static RECOMMENDED_SAFE_VERSION = 0.61;

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
        const current = duplicate(item);

        for (const migration of migrations) {
            try {
                await migration.updateItem(current);
            } catch (err) {
                console.error(err);
            }
        }

        return current;
    }

    async getUpdatedActor(actor: ActorSourcePF2e, migrations: MigrationBase[]): Promise<ActorSourcePF2e> {
        const current = duplicate(actor);

        for (const migration of migrations) {
            try {
                await migration.updateActor(current);
                for (const item of current.items) {
                    await migration.updateItem(item, current);
                }
            } catch (err) {
                console.error(err);
            }
        }

        return current;
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

    async getUpdatedToken(token: TokenDocument, migrations: MigrationBase[]): Promise<foundry.data.TokenSource> {
        const current = token.toObject();
        for (const migration of migrations) {
            try {
                await migration.updateToken(current);
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
