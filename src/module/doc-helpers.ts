import { ActorPF2e, ActorProxyPF2e } from "@actor";
import { ItemPF2e, ItemProxyPF2e } from "@item";
import type { TokenDocumentPF2e } from "@scene";
import * as R from "remeda";
import { CombatantPF2e } from "./encounter/index.ts";
import { MigrationList, MigrationRunner } from "./migration/index.ts";
import { MigrationRunnerBase } from "./migration/runner/base.ts";

/** Ensure that the import JSON is actually importable and that the data is fully migrated */
async function preImportJSON(json: string): Promise<string | null> {
    const source: unknown = JSON.parse(json);
    if (!R.isPlainObject(source)) return null;
    if ("data" in source) {
        if ("items" in source) {
            ActorPF2e.migrateData(source);
        } else {
            ItemPF2e.migrateData(source);
        }
    }
    if (!R.isPlainObject(source.system)) return null;

    if (R.isPlainObject(source.system.schema) && !R.isPlainObject(source.system._migration)) {
        source.system._migration = { version: Number(source.system.schema.version) || null };
        delete source.system.schema;
    }

    if (!R.isPlainObject(source.system._migration)) {
        return null;
    }

    const sourceSchemaVersion = Number(source.system?._migration?.version) || 0;
    const worldSchemaVersion = MigrationRunnerBase.LATEST_SCHEMA_VERSION;
    if (fu.isNewerVersion(sourceSchemaVersion, worldSchemaVersion)) {
        // Refuse to import if the schema version on the document is higher than the system schema verson;
        ui.notifications.error(
            game.i18n.format("PF2E.ErrorMessage.CantImportTooHighVersion", {
                sourceName: game.i18n.localize("DOCUMENT.Actor"),
                sourceSchemaVersion,
                worldSchemaVersion,
            }),
        );
        return null;
    }

    const Cls: ConstructorOf<ActorPF2e | ItemPF2e> =
        "items" in source && Array.isArray(source.items) ? ActorProxyPF2e : ItemProxyPF2e;
    const newDoc: ItemPF2e | ActorPF2e = new Cls(source);
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
