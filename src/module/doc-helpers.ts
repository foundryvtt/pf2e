import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { isObject } from "@util";
import { MigrationList, MigrationRunner } from "./migration/index.ts";
import { MigrationRunnerBase } from "./migration/runner/base.ts";
import { CombatantPF2e } from "./encounter/index.ts";
import { TokenDocumentPF2e } from "@scene/index.ts";

/** Ensure that the import JSON is actually importable and that the data is fully migrated */
async function preImportJSON<TDocument extends ActorPF2e | ItemPF2e>(
    document: TDocument,
    json: string
): Promise<string | null> {
    const source: unknown = JSON.parse(json);
    if (!isObject<TDocument["_source"] & { data?: unknown }>(source)) return null;
    if ("data" in source) {
        if ("items" in source) {
            ActorPF2e.migrateData(source);
        } else {
            ItemPF2e.migrateData(source);
        }
    }
    if (!isObject(source.system)) return null;

    const sourceSchemaVersion = Number(source.system?.schema?.version) || 0;
    const worldSchemaVersion = MigrationRunnerBase.LATEST_SCHEMA_VERSION;
    if (foundry.utils.isNewerVersion(sourceSchemaVersion, worldSchemaVersion)) {
        // Refuse to import if the schema version on the document is higher than the system schema verson;
        ui.notifications.error(
            game.i18n.format("PF2E.ErrorMessage.CantImportTooHighVersion", {
                sourceName: game.i18n.localize("DOCUMENT.Actor"),
                sourceSchemaVersion,
                worldSchemaVersion,
            })
        );
        return null;
    }

    const newDoc = new (document.constructor as ConstructorOf<TDocument>)(source, { parent: document.parent });
    const migrations = MigrationList.constructFromVersion(newDoc.schemaVersion);
    await MigrationRunner.ensureSchemaVersion(newDoc, migrations);

    return JSON.stringify(newDoc.toObject());
}

function combatantAndTokenDoc(document: CombatantPF2e | TokenDocumentPF2e): {
    combatant: CombatantPF2e | null;
    tokenDoc: TokenDocumentPF2e | null;
} {
    return document instanceof CombatantPF2e
        ? { combatant: document, tokenDoc: document.token }
        : { combatant: document.combatant, tokenDoc: document };
}

export { combatantAndTokenDoc, preImportJSON };
