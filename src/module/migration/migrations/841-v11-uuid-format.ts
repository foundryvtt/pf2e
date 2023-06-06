import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { recursiveReplaceString } from "@util";

/** Convert UUIDs to V11 format */
export class Migration841V11UUIDFormat extends MigrationBase {
    static override version = 0.841;

    #replaceUUID<T extends ActorUUID | ItemUUID>(uuid: T, documentType?: CompendiumDocumentType): T;
    #replaceUUID(uuid: string, documentType?: CompendiumDocumentType): string;
    #replaceUUID(uuid: string, explicitDocType?: CompendiumDocumentType): string {
        if (!uuid?.startsWith("Compendium.")) return uuid;
        const documentType = ((): CompendiumDocumentType | null => {
            if (explicitDocType) return explicitDocType;
            if ("game" in globalThis) {
                const { collection } = foundry.utils.parseUuid(uuid) ?? {};
                return collection instanceof CompendiumCollection ? collection.metadata.type ?? null : null;
            }
            return null;
        })();
        if (!documentType) return uuid;

        const parts = uuid.split(/\.(?! )/);
        if (parts.length !== 4) return uuid;
        const [head, scope, pack, id] = parts;
        return `${head}.${scope}.${pack}.${documentType}.${id}`;
    }

    #replaceUUIDsInLinks(text: string): string {
        return Array.from(text.matchAll(/(?<=@UUID\[)[^\]]+(?=\])/g)).reduce(
            (replaced, [link]) => replaced.replace(link, (s) => this.#replaceUUID(s)),
            text
        );
    }

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.flags.core?.sourceId) {
            source.flags.core.sourceId = this.#replaceUUID(source.flags.core.sourceId, "Actor");
        }

        const { details } = source.system;
        if (details && "publicNotes" in details && typeof details.publicNotes === "string") {
            details.publicNotes = this.#replaceUUIDsInLinks(details.publicNotes);
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.flags.core?.sourceId) {
            source.flags.core.sourceId = this.#replaceUUID(source.flags.core.sourceId, "Item");
        }

        source.system.rules = source.system.rules.map((r) =>
            recursiveReplaceString(r, (s) => this.#replaceUUID(s, "Item"))
        );

        if (source.type === "class" || source.type === "kit") {
            const items: Record<string, { uuid: string }> = source.system.items;
            for (const entry of Object.values(items)) {
                entry.uuid = this.#replaceUUID(entry.uuid, "Item");
            }
        } else if (source.type === "heritage") {
            if (source.system.ancestry?.uuid) {
                source.system.ancestry.uuid = this.#replaceUUID(source.system.ancestry.uuid, "Item");
            }
        }

        const { description } = source.system;
        description.value ??= "";
        description.value = this.#replaceUUIDsInLinks(source.system.description.value);
        description.value = description.value.replace(
            /Compendium\.pf2e\.journals\.(?!JournalEntry)/g,
            "Compendium.pf2e.journals.JournalEntry."
        );
    }
}
