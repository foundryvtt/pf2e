import { ActorSourcePF2e } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { DocumentSchemaRecord } from "@module/data";
import { MigrationBase } from "@module/migration/base";
import { TokenDocumentPF2e } from "@module/scene/token-document";
import { DateTime } from "luxon";

interface CollectionDiff<T extends foundry.data.ActiveEffectSource | ItemSourcePF2e> {
    inserted: T[];
    deleted: string[];
    updated: T[];
}

export class MigrationRunnerBase {
    migrations: MigrationBase[];

    static LATEST_SCHEMA_VERSION = 0.802;

    static MINIMUM_SAFE_VERSION = 0.618;

    static RECOMMENDED_SAFE_VERSION = 0.634;

    constructor(migrations: MigrationBase[] = []) {
        this.migrations = migrations.sort((a, b) => a.version - b.version);
    }

    needsMigration(currentVersion: number): boolean {
        return currentVersion < (this.constructor as typeof MigrationRunnerBase).LATEST_SCHEMA_VERSION;
    }

    diffCollection<T extends foundry.data.ActiveEffectSource>(orig: T[], updated: T[]): CollectionDiff<T>;
    diffCollection<T extends ItemSourcePF2e>(orig: T[], updated: T[]): CollectionDiff<T>;
    diffCollection<T extends foundry.data.ActiveEffectSource | ItemSourcePF2e>(
        orig: T[],
        updated: T[]
    ): CollectionDiff<T>;
    diffCollection<TSource extends foundry.data.ActiveEffectSource | ItemSourcePF2e>(
        orig: TSource[],
        updated: TSource[]
    ): CollectionDiff<TSource> {
        const ret: CollectionDiff<TSource> = {
            inserted: [],
            deleted: [],
            updated: [],
        };

        const origSources: Map<string, TSource> = new Map();
        for (const source of orig) {
            origSources.set(source._id, source);
        }

        for (const source of updated) {
            const origSource = origSources.get(source._id);
            if (origSource) {
                // check to see if anything changed
                if (JSON.stringify(origSource) !== JSON.stringify(source)) {
                    ret.updated.push(source);
                }
                origSources.delete(source._id);
            } else {
                // it's new
                ret.inserted.push(source);
            }
        }

        // since we've been deleting them as we process, the ones remaining need to be deleted
        for (const source of origSources.values()) {
            ret.deleted.push(source._id);
        }

        return ret;
    }

    async getUpdatedActor(actor: ActorSourcePF2e, migrations: MigrationBase[]): Promise<ActorSourcePF2e> {
        const currentActor = deepClone(actor);

        for (const migration of migrations) {
            for (const currentItem of currentActor.items) {
                await migration.preUpdateItem?.(currentItem, currentActor);
                if (currentItem.type === "consumable" && currentItem.system.spell) {
                    await migration.preUpdateItem?.(currentItem.system.spell);
                }
            }
        }

        for (const migration of migrations) {
            await migration.updateActor?.(currentActor);

            for (const currentItem of currentActor.items) {
                await migration.updateItem?.(currentItem, currentActor);
                // Handle embedded spells
                if (currentItem.type === "consumable" && currentItem.system.spell) {
                    await migration.updateItem?.(currentItem.system.spell, currentActor);
                }
            }
        }

        // Don't set schema record on compendium JSON
        if ("game" in globalThis) {
            const latestMigration = migrations.slice(-1)[0];
            currentActor.system.schema ??= { version: null, lastMigration: null };
            this.updateSchemaRecord(currentActor.system.schema, latestMigration);
            for (const itemSource of currentActor.items) {
                itemSource.system.schema ??= { version: null, lastMigration: null };
                this.updateSchemaRecord(itemSource.system.schema, latestMigration);
            }
        }

        return currentActor;
    }

    async getUpdatedItem(item: ItemSourcePF2e, migrations: MigrationBase[]): Promise<ItemSourcePF2e> {
        const current = deepClone(item);

        for (const migration of migrations) {
            await migration.preUpdateItem?.(current);
            if (current.type === "consumable" && current.system.spell) {
                await migration.preUpdateItem?.(current.system.spell);
            }
        }

        for (const migration of migrations) {
            await migration.updateItem?.(current);
            // Handle embedded spells
            if (current.type === "consumable" && current.system.spell) {
                await migration.updateItem?.(current.system.spell);
            }
        }

        if (migrations.length > 0) this.updateSchemaRecord(current.system.schema, migrations.slice(-1)[0]);

        return current;
    }

    private updateSchemaRecord(schema: DocumentSchemaRecord, latestMigration: MigrationBase): void {
        if (!("game" in globalThis && latestMigration)) return;

        const fromVersion = typeof schema.version === "number" ? schema.version : null;
        schema.version = latestMigration.version;
        schema.lastMigration = {
            datetime: DateTime.now().toISO(),
            version: {
                schema: fromVersion,
                foundry: "game" in globalThis ? game.version : undefined,
                system: "game" in globalThis ? game.system.version : undefined,
            },
        };
    }

    async getUpdatedMacro(
        macroSource: foundry.data.MacroSource,
        migrations: MigrationBase[]
    ): Promise<foundry.data.MacroSource> {
        const current = deepClone(macroSource);

        for (const migration of migrations) {
            try {
                await migration.updateMacro?.(current);
            } catch (err) {
                console.error(err);
            }
        }

        return current;
    }

    async getUpdatedTable(
        tableSource: foundry.data.RollTableSource,
        migrations: MigrationBase[]
    ): Promise<foundry.data.RollTableSource> {
        const current = deepClone(tableSource);

        for (const migration of migrations) {
            try {
                await migration.updateTable?.(current);
            } catch (err) {
                console.error(err);
            }
        }

        return current;
    }

    async getUpdatedToken(token: TokenDocumentPF2e, migrations: MigrationBase[]): Promise<foundry.data.TokenSource> {
        const current = token.toObject();
        for (const migration of migrations) {
            await migration.updateToken?.(current, token.actor, token.scene);
        }

        return current;
    }

    async getUpdatedUser(
        userData: foundry.data.UserSource,
        migrations: MigrationBase[]
    ): Promise<foundry.data.UserSource> {
        const current = deepClone(userData);
        for (const migration of migrations) {
            try {
                await migration.updateUser?.(current);
            } catch (err) {
                console.error(err);
            }
        }

        return current;
    }
}
