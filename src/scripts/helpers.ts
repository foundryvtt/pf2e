import { ActorPF2e } from "@actor";
import type { ClientDocument } from "@client/documents/abstract/client-document.d.mts";
import { ItemPF2e } from "@item";
import { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { htmlClosest } from "@util";
import { UUIDUtils } from "@util/uuid.ts";

/** Given an HTML element, resolves the sheet and its document */
function resolveSheetDocument(html: HTMLElement): ClientDocument | null {
    const sheet: { id?: string; document?: unknown } | null =
        ui.windows[Number(html.closest<HTMLElement>(".app.sheet")?.dataset.appid)] ?? null;
    const doc = sheet?.document;
    return doc && (doc instanceof ActorPF2e || doc instanceof ItemPF2e || doc instanceof JournalEntry) ? doc : null;
}

/** Given an html element, attempt to retrieve the origin item and the relevant actor */
function resolveActorAndItemFromHTML(html: HTMLElement): {
    /**
     * The containing sheet's primary document, if an actor.
     * Generally used to test if something was dragged from an actor sheet specifically.
     */
    sheetActor: ActorPF2e | null;
    actor: ActorPF2e | null;
    item: ItemPF2e | null;
    /** The message the actor and item are from */
    message: ChatMessagePF2e | null;
    /** The message, sheet document, or journal for this element. */
    appDocument: ClientDocument | null;
} {
    const messageId = htmlClosest(html, "[data-message-id]")?.dataset.messageId;
    const message = messageId ? (game.messages.get(messageId) ?? null) : null;
    const sheetDocument = resolveSheetDocument(html);
    const sheetActor = sheetDocument instanceof ActorPF2e ? sheetDocument : null;
    const sheetItem = sheetDocument instanceof ItemPF2e ? sheetDocument : null;

    const item = (() => {
        if (UUIDUtils.isItemUUID(html.dataset.itemUuid)) {
            const document = fromUuidSync(html.dataset.itemUuid);
            if (document instanceof ItemPF2e) return document;
        }

        if (sheetItem) {
            return sheetItem;
        }

        if (sheetActor) {
            const itemId = htmlClosest(html, "[data-item-id]")?.dataset.itemId;
            const document = itemId ? sheetActor.items.get(itemId) : null;
            if (document) return document;
        }

        return message?.item ?? null;
    })();

    return {
        sheetActor,
        actor: item?.actor ?? message?.actor ?? null,
        item,
        message,
        appDocument: message ?? sheetDocument,
    };
}

export { resolveActorAndItemFromHTML, resolveSheetDocument };
