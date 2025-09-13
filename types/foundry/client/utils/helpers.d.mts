import {
    Actor,
    ActorUUID,
    CompendiumDocument,
    Item,
    ItemUUID,
    TokenDocument,
    TokenDocumentUUID,
    User,
    UserUUID,
    WorldDocumentUUID,
} from "@client/documents/_module.mjs";
import { ClientDocument } from "@client/documents/abstract/client-document.mjs";
import { CompendiumIndexData } from "@client/documents/collections/compendium-collection.mjs";
import Document from "@common/abstract/document.mjs";
import { COMPENDIUM_DOCUMENT_TYPES } from "@common/constants.mjs";

/**
 * Clean a provided HTML fragment, closing unbalanced tags and stripping some undesirable properties
 * @param raw A raw HTML string
 * @returns The cleaned HTML content
 */
export function cleanHTML(raw: string): string;

/**
 * Export data content to be saved to a local file
 * @param data Data content converted to a string
 * @param type The type of file
 * @param filename The filename of the resulting download
 */

export function saveDataToFile(data: string, type: string, filename: string): void;

/**
 * Read text data from a user provided File object
 * @param file A File object
 * @returns A Promise which resolves to the loaded text data
 */
export function readTextFromFile(file: File): Promise<string>;

/**
 * Retrieve a Document by its Universally Unique Identifier (uuid).
 * @param uuid The uuid of the Document to retrieve.
 * @param options Options to configure how a UUID is resolved.
 * @param options.relative A Document to resolve relative UUIDs against.
 * @param options.invalid Allow retrieving an invalid Document.
 * @returns Returns the Document if it could be found, otherwise null.
 */
export function fromUuid(uuid: CompendiumUUID, relative?: Maybe<ClientDocument>): Promise<CompendiumDocument | null>;
export function fromUuid(uuid: ActorUUID, relative?: Maybe<ClientDocument>): Promise<Actor | null>;
export function fromUuid(uuid: ItemUUID, relative?: Maybe<ClientDocument>): Promise<Item | null>;
export function fromUuid(uuid: TokenDocumentUUID, relative?: Maybe<ClientDocument>): Promise<TokenDocument | null>;
export function fromUuid<TDocument extends ClientDocument>(
    uuid: string,
    relative?: Maybe<ClientDocument>,
): Promise<TDocument | null>;

export type CompendiumDocumentType = (typeof COMPENDIUM_DOCUMENT_TYPES)[number];
export type CompendiumUUID = `Compendium.${string}.${CompendiumDocumentType}.${string}`;
export type DocumentUUID = WorldDocumentUUID | CompendiumUUID | TokenDocumentUUID;

/**
 * Retrieve a Document by its Universally Unique Identifier (uuid) synchronously. If the uuid resolves to a compendium
 * document, that document's index entry will be returned instead.
 * @param uuid The uuid of the Document to retrieve.
 * @param options Options to configure how a UUID is resolved.
 * @param options.relative A Document to resolve relative UUIDs against.
 * @param options.invalid Allow retrieving an invalid Document.
 * @param options.strict Throw an error if the UUID cannot be resolved synchronously.
 * @returns The Document or its index entry if it resides in a Compendium, otherwise null.
 * @throws If the uuid resolves to a Document that cannot be retrieved synchronously, and the strict option is true.
 */
export function fromUuidSync<TResult extends User = User>(
    uuid: UserUUID,
    options?: {
        relative?: ClientDocument;
        invalid?: boolean;
        strict?: boolean;
    },
): TResult | null;
export function fromUuidSync<TResult extends Actor | CompendiumIndexData = Actor | CompendiumIndexData>(
    uuid: UserUUID,
    options?: {
        relative?: ClientDocument;
        invalid?: boolean;
        strict?: boolean;
    },
): TResult | null;
export function fromUuidSync<
    TResult extends (Document & { name?: string }) | CompendiumIndexData =
        | (ClientDocument & { name?: string })
        | CompendiumIndexData,
>(
    uuid: string,
    options?: {
        relative?: ClientDocument;
        invalid?: boolean;
        strict?: boolean;
    },
): TResult | null;

/**
 * Return a reference to the Document class implementation which is configured for use.
 * @param documentName The canonical Document name, for example "Actor"
 * @returns The configured Document class implementation
 */
export function getDocumentClass(documentName: string): typeof Document | undefined;

/**
 * Given a source object to sort, a target to sort relative to, and an Array of siblings in the container:
 * Determine the updated sort keys for the source object, or all siblings if a reindex is required.
 * Return an Array of updates to perform, it is up to the caller to dispatch these updates.
 * Each update is structured as:
 * {
 *   target: object,
 *   update: {sortKey: sortValue}
 * }
 *
 * @param source The source object being sorted
 * @param options Options which modify the sort behavior
 * @returns An Array of updates for the caller of the helper function to perform
 */
export function performIntegerSort<TObject extends object>(
    source: TObject,
    options?: SortOptions<TObject>,
): { target: TObject; update: Record<string, number> }[];

declare interface SortOptions<TObject extends object> {
    /** The target object relative which to sort */
    target?: TObject;
    /** The Array of siblings which the source should be sorted within */
    siblings?: TObject[];
    /** The property name within the source object which defines the sort key */
    sortKey?: string;
    /**
     * Explicitly sort before (true) or sort after( false).
     * If undefined the sort order will be automatically determined.
     */
    sortBefore?: boolean;
}

/**
 * Express a timestamp as a relative string.
 * This helper internally uses GameTime#format using the relative formatter and the Earth calendar.
 * @param timeStamp A timestamp string or Date object to be formatted as a relative time
 * @returns A string expression for the relative time
 */
export function timeSince(timeStamp: Date | string): string;

/**
 * Parse an HTML string, returning a processed HTMLElement or HTMLCollection.
 * A single HTMLElement is returned if the provided string contains only a single top-level element.
 * An HTMLCollection is returned if the provided string contains multiple top-level elements.
 */
export function parseHTML<THTML extends HTMLCollection | HTMLElement>(htmlString: string): THTML;
