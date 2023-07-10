import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { DocumentSchemaRecord } from "@module/data.ts";
import { MigrationBase } from "@module/migration/base.ts";
import { ScenePF2e } from "@scene/document.ts";
import { TokenDocumentPF2e } from "@scene/token-document/document.ts";

interface CollectionDiff<T extends foundry.documents.ActiveEffectSource | ItemSourcePF2e> {
    inserted: T[];
    deleted: string[];
    updated: T[];
}

export class MigrationRunnerBase {
    migrations: MigrationBase[];

    static LATEST_SCHEMA_VERSION = 0.847;

    static MINIMUM_SAFE_VERSION = 0.618;

    static RECOMMENDED_SAFE_VERSION = 0.634;

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
            diffs.deleted.push(source._id);
        }

        return diffs;
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
            this.#updateSchemaRecord(currentActor.system.schema, latestMigration);
            for (const itemSource of currentActor.items) {
                itemSource.system.schema ??= { version: null, lastMigration: null };
                this.#updateSchemaRecord(itemSource.system.schema, latestMigration);
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

        if (migrations.length > 0) this.#updateSchemaRecord(current.system.schema, migrations.slice(-1)[0]);

        return current;
    }

    async getUpdatedTable(
        tableSource: foundry.documents.RollTableSource,
        migrations: MigrationBase[]
    ): Promise<foundry.documents.RollTableSource> {
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

    async getUpdatedMacro(
        macroSource: foundry.documents.MacroSource,
        migrations: MigrationBase[]
    ): Promise<foundry.documents.MacroSource> {
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

    async getUpdatedJournalEntry(
        source: foundry.documents.JournalEntrySource,
        migrations: MigrationBase[]
    ): Promise<foundry.documents.JournalEntrySource> {
        const clone = deepClone(source);

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
        migrations: MigrationBase[]
    ): Promise<foundry.documents.TokenSource> {
        const current = token.toObject();
        for (const migration of migrations) {
            await migration.updateToken?.(current, token.actor, token.scene);
        }

        return current;
    }

    async getUpdatedUser(
        userData: foundry.documents.UserSource,
        migrations: MigrationBase[]
    ): Promise<foundry.documents.UserSource> {
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

    #updateSchemaRecord(schema: DocumentSchemaRecord, latestMigration: MigrationBase): void {
        if (!("game" in globalThis && latestMigration)) return;

        const fromVersion = typeof schema.version === "number" ? schema.version : null;
        schema.version = latestMigration.version;
        schema.lastMigration = {
            version: {
                schema: fromVersion,
                foundry: "game" in globalThis ? game.version : undefined,
                system: "game" in globalThis ? game.system.version : undefined,
            },
        };
    }
}
