import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { MigrationList, MigrationRunner } from "@module/migration/index.ts";
import type { UserPF2e } from "@module/user/document.ts";
import * as R from "remeda";
import type { DatabaseGetOperation } from "types/foundry/common/abstract/_types.d.ts";

class ClientDatabaseBackendPF2e extends foundry.data.ClientDatabaseBackend {
    protected override async _getDocuments(
        documentClass: typeof foundry.abstract.Document,
        operation: DatabaseGetOperation<foundry.abstract.Document | null>,
        user?: UserPF2e,
    ): Promise<(DeepPartial<ClientDocument["_source"]> & CompendiumIndexData)[] | foundry.abstract.Document[]> {
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
        const request = { action: "get", type: documentClass.documentName, operation };
        const response = new foundry.abstract.DocumentSocketResponse(
            await SocketInterface.dispatch("modifyDocument", request),
        );

        // Create Document objects
        return Promise.all(
            response.result
                .filter((d): d is object => R.isPlainObject(d))
                .map(async (data) => {
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
