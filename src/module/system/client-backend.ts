import { ActorPF2e } from "@actor";
import type { CompendiumIndexData } from "@client/documents/collections/compendium-collection.d.mts";
import type { DocumentConstructionContext } from "@common/_types.d.mts";
import type { DatabaseGetOperation, Document } from "@common/abstract/_module.d.mts";
import { ItemPF2e } from "@item";
import { MigrationList, MigrationRunner } from "@module/migration/index.ts";
import * as R from "remeda";

class ClientDatabaseBackendPF2e extends foundry.data.ClientDatabaseBackend {
    protected override async _getDocuments<TDocument extends Document>(
        documentClass: AbstractConstructorOf<TDocument> & {
            documentName: string;
            fromSource(data: object, options: DocumentConstructionContext<Document | null>): Document;
        },
        operation: DatabaseGetOperation<TDocument["parent"]>,
        user?: User,
    ): Promise<(DeepPartial<Document["_source"]> & CompendiumIndexData)[] | Document[]> {
        const type = documentClass.documentName;
        if (
            !["Actor", "Item"].includes(type) ||
            operation.index ||
            operation.parent ||
            operation.pack?.startsWith("pf2e.")
        ) {
            return super._getDocuments(documentClass, operation, user);
        }

        // Dispatch the request
        const request = { action: "get", type, operation };
        const response = new foundry.abstract.DocumentSocketResponse(
            await fh.SocketInterface.dispatch("modifyDocument", request),
        );

        // Create Document objects
        return Promise.all(
            response.result
                .filter((d): d is Record<string, unknown> => R.isPlainObject(d))
                .map(async (data) => {
                    // Ensure compendium source is populated if appropriate
                    if (R.isPlainObject((data._stats ??= {})) && operation.pack) {
                        data._stats.compendiumSource = `Compendium.${operation.pack}.${type}.${data._id}`;
                    }
                    const document = documentClass.fromSource(data, { pack: operation.pack }) as ActorPF2e | ItemPF2e;
                    const migrations = MigrationList.constructFromVersion(document.schemaVersion);
                    if (migrations.length > 0) {
                        try {
                            await MigrationRunner.ensureSchemaVersion(document, migrations);
                        } catch (error) {
                            if (error instanceof Error) console.error(error.message);
                        }
                    }

                    return document;
                }),
        );
    }
}

export { ClientDatabaseBackendPF2e };
