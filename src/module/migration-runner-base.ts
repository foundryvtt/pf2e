import { ActorDataPF2e } from '@actor/data-definitions';
import { ItemDataPF2e } from '@item/data-definitions';
import { MigrationBase } from './migrations/base';

interface ItemsDiff {
    inserted: ItemDataPF2e[];
    deleted: string[];
    updated: ItemDataPF2e[];
}

export class MigrationRunnerBase {
    latestVersion: number;
    migrations: MigrationBase[];

    constructor(migrations: MigrationBase[]) {
        this.migrations = migrations.sort((a, b) => a.version - b.version);
        this.latestVersion = Math.max(...migrations.map((x) => x.version));
    }

    needsMigration(currentVersion: number): boolean {
        return currentVersion < this.latestVersion;
    }

    diffItems(orig: ItemDataPF2e[], updated: ItemDataPF2e[]): ItemsDiff {
        const ret: ItemsDiff = {
            inserted: [],
            deleted: [],
            updated: [],
        };

        const origItems: Map<string, ItemDataPF2e> = new Map();
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

    async getUpdatedItem(item: ItemDataPF2e, migrations: MigrationBase[]): Promise<ItemDataPF2e> {
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

    async getUpdatedActor(actor: ActorDataPF2e, migrations: MigrationBase[]): Promise<ActorDataPF2e> {
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

    async getUpdatedUser(userData: UserData, migrations: MigrationBase[]): Promise<UserData> {
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
