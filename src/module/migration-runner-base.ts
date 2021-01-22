import { ActorDataPF2e } from './actor/actorDataDefinitions';
import { ItemData } from './item/dataDefinitions';
import { MigrationBase } from './migrations/base';

interface ItemsDiff {
    inserted: any[];
    deleted: string[];
    updated: any[];
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

    diffItems(orig: any[], updated: any[]): ItemsDiff {
        const ret = {
            inserted: [],
            deleted: [],
            updated: [],
        };

        const origItems = new Map();
        for (const item of orig) {
            origItems.set(item._id, item);
        }

        for (const item of updated) {
            if (origItems.has(item._id)) {
                // check to see if anything changed
                const origItem = origItems.get(item._id);
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

    async getUpdatedItem(item: ItemData, migrations: MigrationBase[]): Promise<ItemData> {
        const current = duplicate(item);

        for (const migration of migrations) {
            try {
                await migration.updateItem(current, undefined);
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
                    await migration.updateItem(item);
                }
            } catch (err) {
                console.error(err);
            }
        }

        return current;
    }
}
