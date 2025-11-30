import type { ActorSourcePF2e } from "@actor/data/index.ts";
import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import type { MigrationRecord } from "@module/data.ts";
import type { MigrationBase } from "@module/migration/base.ts";
import type { ScenePF2e, TokenDocumentPF2e } from "@scene";

interface CollectionDiff<T extends foundry.documents.ActiveEffectSource | ItemSourcePF2e> {
    inserted: T[];
    deleted: string[];
    updated: T[];
}

export class MigrationRunnerBase {
    migrations: MigrationBase[];

    static LATEST_SCHEMA_VERSION = 0.953;

    static MINIMUM_SAFE_VERSION = 0.7;

    static RECOMMENDED_SAFE_VERSION = 0.84;

    /** The starting schema version for the Foundry generation number */
    static FOUNDRY_SCHEMA_VERSIONS = {
        0.8: 0.634,
        9: 0.7,
        10: 0.781,
        11: 0.841,
        12: 0.927,
        13: 0.936,
    };

    constructor(migrations: MigrationBase[] = []) {
        this.migrations = migrations.sort((a, b) => a.version - b.version);
    }

    needsMigration(currentVersion: number): boolean {
        return currentVersion < (this.constructor as typeof MigrationRunnerBase).LATEST_SCHEMA_VERSION;
    }

    diffCollection(orig: ItemSourcePF2e[], updated: ItemSourcePF2e[]): CollectionDiff<ItemSourcePF2e> {
        const diffs: CollectionDiff<ItemSourcePF2e> = {
            inserted: [],
            deleted: [],
            updated: [],
        };

        const origSources: Map<string, ItemSourcePF2e> = new Map();
        for (const source of orig) {
            origSources.set(source._id!, source);
        }

        for (const source of updated) {
            const origSource = origSources.get(source._id!);
            if (origSource) {
                // check to see if anything changed
                if (JSON.stringify(origSource) !== JSON.stringify(source)) {
                    diffs.updated.push(source);
                }
                origSources.delete(source._id!);
            } else {
                // it's new
                diffs.inserted.push(source);
            }
        }

        // since we've been deleting them as we process, the ones remaining need to be deleted
        for (const source of origSources.values()) {
            diffs.deleted.push(source._id!);
        }

        return diffs;
    }

    async getUpdatedActor(actor: ActorSourcePF2e, migrations: MigrationBase[]): Promise<ActorSourcePF2e> {
        const currentActor = fu.deepClone(actor);

        for (const migration of migrations) {
            for (const currentItem of currentActor.items) {
                await migration.preUpdateItem?.(currentItem, currentActor);
                if (currentItem.type === "consumable" && currentItem.system.spell) {
                    await migration.preUpdateItem?.(currentItem.system.spell);
                }
                if (itemIsOfType(currentItem, "armor", "equipment", "shield", "weapon")) {
                    for (const subitem of currentItem.system.subitems) {
                        migration.preUpdateItem?.(subitem);
                    }
                }
            }
        }

        for (const migration of migrations) {
            await migration.updateActor?.(currentActor);

            for (const currentItem of currentActor.items) {
                await migration.updateItem?.(currentItem, currentActor);
                // Handle embedded items
                if (currentItem.type === "consumable" && currentItem.system.spell) {
                    await migration.updateItem?.(currentItem.system.spell, currentActor);
                }
                if (itemIsOfType(currentItem, "armor", "equipment", "shield", "weapon")) {
                    for (const subitem of currentItem.system.subitems) {
                        migration.updateItem?.(subitem);
                    }
                }
            }
        }

        // Don't set schema record on compendium JSON
        if ("game" in globalThis) {
            const latestMigration = migrations.slice(-1)[0];
            currentActor.system._migration ??= { version: null, previous: null };
            this.#updateMigrationRecord(currentActor.system._migration, latestMigration);
            for (const itemSource of currentActor.items) {
                itemSource.system._migration ??= { version: null, previous: null };
                this.#updateMigrationRecord(itemSource.system._migration, latestMigration);
            }
        }

        return currentActor;
    }

    async getUpdatedItem(item: ItemSourcePF2e, migrations: MigrationBase[]): Promise<ItemSourcePF2e> {
        const current = fu.deepClone(item);

        for (const migration of migrations) {
            await migration.preUpdateItem?.(current);
            if (current.type === "consumable" && current.system.spell) {
                await migration.preUpdateItem?.(current.system.spell);
            }
            if (itemIsOfType(current, "armor", "equipment", "shield", "weapon")) {
                for (const subitem of current.system.subitems) {
                    migration.preUpdateItem?.(subitem);
                }
            }
        }

        for (const migration of migrations) {
            await migration.updateItem?.(current);
            // Handle embedded spells
            if (current.type === "consumable" && current.system.spell) {
                await migration.updateItem?.(current.system.spell);
            }
            if (itemIsOfType(current, "armor", "equipment", "shield", "weapon")) {
                for (const subitem of current.system.subitems) {
                    migration.updateItem?.(subitem);
                }
            }
        }

        if (migrations.length > 0) this.#updateMigrationRecord(current.system._migration, migrations.slice(-1)[0]);

        return current;
    }

    async getUpdatedTable(
        tableSource: foundry.documents.RollTableSource,
        migrations: MigrationBase[],
    ): Promise<foundry.documents.RollTableSource> {
        const current = fu.deepClone(tableSource);

        for (const migration of migrations) {
            try {
                await migration.updateTable?.(current);
            } catch (err) {
                console.error(err);
            }
        }

        return current;
    }

    async getUpdatedMacro(
        macroSource: foundry.documents.MacroSource,
        migrations: MigrationBase[],
    ): Promise<foundry.documents.MacroSource> {
        const current = fu.deepClone(macroSource);

        for (const migration of migrations) {
            try {
                await migration.updateMacro?.(current);
            } catch (err) {
                console.error(err);
            }
        }

        return current;
    }

    async getUpdatedJournalEntry(
        source: foundry.documents.JournalEntrySource,
        migrations: MigrationBase[],
    ): Promise<foundry.documents.JournalEntrySource> {
        const clone = fu.deepClone(source);

        for (const migration of migrations) {
            try {
                await migration.updateJournalEntry?.(clone);
            } catch (err) {
                console.error(err);
            }
        }

        return clone;
    }

    async getUpdatedToken(
        token: TokenDocumentPF2e<ScenePF2e>,
        migrations: MigrationBase[],
    ): Promise<foundry.documents.TokenSource> {
        const current = token.toObject();
        for (const migration of migrations) {
            await migration.updateToken?.(current, token.actor, token.scene);
        }

        return current;
    }

    async getUpdatedUser(
        userData: foundry.documents.UserSource,
        migrations: MigrationBase[],
    ): Promise<foundry.documents.UserSource> {
        const current = fu.deepClone(userData);
        for (const migration of migrations) {
            try {
                await migration.updateUser?.(current);
            } catch (err) {
                console.error(err);
            }
        }

        return current;
    }

    #updateMigrationRecord(migrations: MigrationRecord, latestMigration: MigrationBase): void {
        if (!("game" in globalThis && latestMigration)) return;

        const fromVersion = typeof migrations.version === "number" ? migrations.version : null;
        migrations.version = latestMigration.version;
        migrations.previous = {
            schema: fromVersion,
            foundry: game.version,
            system: game.system.version,
        };
    }
}
