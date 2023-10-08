import { ActorPF2e } from "@actor";
import type { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemPF2e } from "@item";
import type { ItemReferenceSource } from "@item/data/base.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationList, MigrationRunner } from "@module/migration/index.ts";
import { UserPF2e } from "@module/user/document.ts";
import { UUIDUtils } from "@util/uuid.ts";

import * as R from "remeda";

class ClientDatabaseBackendPF2e extends ClientDatabaseBackend {
    protected override async _getDocuments(
        documentClass: typeof foundry.abstract.Document,
        context: DatabaseBackendGetContext,
        user: UserPF2e
    ): Promise<(DeepPartial<ClientDocument["_source"]> & CompendiumIndexData)[] | foundry.abstract.Document[]> {
        const type = documentClass.documentName;
        if (!["Actor", "Item"].includes(type) || context.options?.index) {
            return super._getDocuments(documentClass, context, user);
        }

        // Dispatch the request
        const request = { action: "get", type, ...R.pick(context, ["query", "options", "pack"]) };
        const response = await SocketInterface.dispatch("modifyDocument", request);

        // Create Document objects
        return Promise.all(
            response.result.map(async (data) => {
                // System sources can contain item references
                if (context.pack?.startsWith("pf2e.") && R.isObject<ActorSourcePF2e>(data) && "items" in data) {
                    const references = data.flags.pf2e?.itemReferences;
                    if (references?.length) {
                        data.items = await this.#itemsfromReferences(data.items, references);
                        delete data.flags.pf2e?.itemReferences;
                    }
                    return documentClass.fromSource(data, { pack: context.pack }) as ActorPF2e | ItemPF2e;
                }

                const document = documentClass.fromSource(data, { pack: context.pack }) as ActorPF2e | ItemPF2e;
                // Run migrations on documents from non-system sources
                if (!context.pack?.startsWith("pf2e.")) {
                    const migrations = MigrationList.constructFromVersion(document.schemaVersion);
                    if (migrations.length > 0) {
                        try {
                            await MigrationRunner.ensureSchemaVersion(document, migrations);
                        } catch (error) {
                            if (error instanceof Error) console.error(error.message);
                        }
                    }
                }

                return document;
            })
        );
    }

    /** Restore item references to full items */
    async #itemsfromReferences(items: ItemSourcePF2e[], references: ItemReferenceSource[]): Promise<ItemSourcePF2e[]> {
        const packSources = (await UUIDUtils.fromUUIDs(references.map((r) => r.sourceId))).map((i) =>
            i.toObject()
        ) as ItemSourcePF2e[];

        const merged = packSources.flatMap((source) => {
            const reference = references.find((r) => r.sourceId === source.flags.core?.sourceId);
            if (!reference) return [];
            delete (reference as { sourceId: unknown }).sourceId;
            return mergeObject(source, reference);
        });
        console.log(`PF2e System | Resolved ${merged.length} item ${merged.length === 1 ? "reference" : "references"}`);

        return [...items, ...merged].sort((a, b) => a.sort - b.sort);
    }
}

export { ClientDatabaseBackendPF2e };
