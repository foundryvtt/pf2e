import { TextEditorPF2e } from "@system/text-editor";

const superParseUuid = _parseUuid;

/** In foundry v10.291 _parseUuid does not return any cached compendium documents */
function parseUuidCached(uuid: string, relative?: ClientDocument): ResolvedUUID {
    const resolved = superParseUuid(uuid, relative);
    if (resolved.collection) {
        resolved.doc = resolved.collection.get(resolved.documentId) ?? null;
    }
    return resolved;
}

/** In foundry v10.291 fromUuid does not return any cached compendium documents */
async function fromUuidCached(uuid: string, relative?: ClientDocument): Promise<ClientDocument | null> {
    const { collection, documentId, embedded, doc } = parseUuidCached(uuid, relative);
    const document = await (async (): Promise<ClientDocument | null> => {
        if (doc) return doc;
        return collection instanceof CompendiumCollection
            ? ((await collection.getDocument(documentId)) as ClientDocument)
            : collection?.get(documentId) ?? null;
    })();
    if (embedded.length && document) {
        return _resolveEmbedded(document, embedded) ?? null;
    }
    return document;
}

export function monkeyPatchFoundry(): void {
    TextEditor.enrichHTML = TextEditorPF2e.enrichHTML;
    TextEditor._createInlineRoll = TextEditorPF2e._createInlineRoll;
    TextEditor._onClickInlineRoll = TextEditorPF2e._onClickInlineRoll;
    globalThis._parseUuid = parseUuidCached;
    globalThis.fromUuid = fromUuidCached;
}
