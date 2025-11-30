import type { ActorPF2e } from "@actor";
import type { ApplicationConfiguration, ApplicationRenderContext } from "@client/applications/_types.d.mts";
import type { HandlebarsRenderOptions } from "@client/applications/api/handlebars-application.d.mts";
import type { ContextMenuEntry } from "@client/applications/ux/context-menu.d.mts";
import type CompendiumCollection from "@client/documents/collections/compendium-collection.d.mts";
import type { CompendiumIndexData } from "@client/documents/collections/compendium-collection.d.mts";
import type { ItemPF2e } from "@item";
import { ErrorPF2e, createHTMLElement, fontAwesomeIcon, htmlQuery } from "@util";
import MiniSearch from "minisearch";
import { CompendiumMigrationStatus } from "../compendium-migration-status.ts";

/** Extend CompendiumDirectory to support a search bar */
class CompendiumDirectoryPF2e extends fa.sidebar.tabs.CompendiumDirectory {
    static readonly STOP_WORDS = new Set(["of", "th", "the"]);

    static #searchEngine: MiniSearch<CompendiumIndexData> | null = null;

    /** Include ability to search and drag document search results */
    static override DEFAULT_OPTIONS: DeepPartial<ApplicationConfiguration> = {
        actions: {
            openBrowser: CompendiumDirectoryPF2e.#onClickOpenBrowser,
            openSheet: CompendiumDirectoryPF2e.#onClickOpenSheet,
        },
    };

    #matchDragDrop = new fa.ux.DragDrop({
        dragSelector: "li.match",
        permissions: {
            dragstart: this._canDragStart.bind(this),
            drop: this._canDragDrop.bind(this),
        },
        callbacks: {
            dragover: this._onDragOver.bind(this),
            dragstart: this._onDragStart.bind(this),
            drop: this._onDrop.bind(this),
        },
    });

    static override PARTS = {
        ...super.PARTS,
        match: { template: `${SYSTEM_ROOT}/templates/sidebar/compendium-directory/search-result.hbs` },
    };

    get searchEngine(): MiniSearch<CompendiumIndexData> {
        if (!CompendiumDirectoryPF2e.#searchEngine) {
            const wordSegmenter =
                "Segmenter" in Intl
                    ? new Intl.Segmenter(game.i18n.lang, { granularity: "word" })
                    : {
                          // Firefox >:(
                          segment(term: string): { segment: string }[] {
                              return [{ segment: term }];
                          },
                      };
            CompendiumDirectoryPF2e.#searchEngine = new MiniSearch({
                fields: ["name", "originalName"],
                idField: "uuid",
                processTerm: (term): string[] | null => {
                    if (term.length <= 1 || CompendiumDirectoryPF2e.STOP_WORDS.has(term)) {
                        return null;
                    }
                    return Array.from(wordSegmenter.segment(term))
                        .map((t) =>
                            fa.ux.SearchFilter.cleanQuery(t.segment.toLocaleLowerCase(game.i18n.lang)).replace(
                                /['"]/g,
                                "",
                            ),
                        )
                        .filter((t) => t.length > 1);
                },
                searchOptions: { combineWith: "AND", prefix: true },
                storeFields: ["uuid", "img", "name", "type", "documentType", "packLabel"],
            });
        }

        return CompendiumDirectoryPF2e.#searchEngine;
    }

    override async _prepareContext(options: HandlebarsRenderOptions): Promise<CompendiumDirectoryRenderContext> {
        return {
            ...(await super._prepareContext(options)),
            searchContents: game.user.settings.searchPackContents,
        };
    }

    protected override async _preparePartContext(
        partId: string,
        context: CompendiumDirectoryRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<CompendiumDirectoryRenderContext> {
        if (partId === "footer") {
            const buttons = (context.buttons ??= []);
            buttons.push({
                type: "button",
                action: "openBrowser",
                icon: "fa-solid fa-magnifying-glass",
                label: "PF2E.CompendiumBrowser.Title",
            });
        }
        return super._preparePartContext(partId, context, options);
    }

    protected override async _onFirstRender(
        context: ApplicationRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void> {
        this._createContextMenu(this.#getDocumentMatchContextEntries, "ol.document-matches > li");
        return super._onFirstRender(context, options);
    }

    #getDocumentMatchContextEntries(): ContextMenuEntry[] {
        return [
            {
                name: "COMPENDIUM.ImportEntry",
                icon: fontAwesomeIcon("download").outerHTML,
                condition: (li) => {
                    const uuid = li.dataset.uuid;
                    if (!uuid) throw ErrorPF2e("Unexpected missing uuid");
                    const collection = game.packs.get(fromUuidSync(uuid)?.pack ?? "", { strict: true });
                    const documentClass = collection.documentClass as unknown as typeof foundry.abstract.Document;
                    return documentClass.canUserCreate(game.user);
                },
                callback: (li) => {
                    const uuid = li.dataset.uuid;
                    if (!uuid) throw ErrorPF2e("Unexpected missing uuid");
                    const packCollection = game.packs.get(fromUuidSync(uuid)?.pack ?? "", { strict: true });
                    const worldCollection = game.collections.get(packCollection.documentName, { strict: true });
                    const indexData = fromUuidSync(uuid) ?? { _id: "" };
                    if (!("_id" in indexData && typeof indexData._id === "string")) {
                        throw ErrorPF2e("Unexpected missing document _id");
                    }
                    return worldCollection.importFromCompendium(
                        packCollection,
                        indexData._id,
                        {},
                        { renderSheet: true },
                    );
                },
            },
        ];
    }

    protected override _onRender(
        context: CompendiumDirectoryRenderContext,
        options: HandlebarsRenderOptions,
    ): Promise<void> {
        if (options.parts.includes("directory")) {
            const matchesList = createHTMLElement("ol", { classes: ["document-matches"] });
            const html = this.element;
            html.querySelector("ol.directory-list")?.append(matchesList);
            this.#matchDragDrop.bind(html);
        }
        return super._onRender(context, options);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    protected override _getEntryContextOptions(): ContextMenuEntry[] {
        const options = super._getEntryContextOptions();

        options.push({
            name: "COMPENDIUM.MigrationStatus",
            icon: fontAwesomeIcon("info").outerHTML,
            condition: (li) => {
                const compendium = game.packs.get(li.dataset.pack, { strict: true });
                const actorOrItem =
                    compendium.documentClass === CONFIG.Actor.documentClass ||
                    compendium.documentClass === CONFIG.Item.documentClass;
                const isSystemCompendium = compendium.metadata.packageType === "system";
                return game.user.isGM && actorOrItem && !isSystemCompendium;
            },
            callback: async (li) => {
                const compendium = game.packs.get(li.dataset.pack, { strict: true }) as CompendiumCollection<
                    ActorPF2e<null> | ItemPF2e<null>
                >;
                new CompendiumMigrationStatus(compendium).render(true);
            },
        });

        return options;
    }

    /** System compendium search */
    protected override _onSearchFilter(event: KeyboardEvent, query: string, rgx: RegExp, listElem: HTMLElement): void {
        super._onSearchFilter(event, query, rgx, listElem);
        const html = this.element;

        // Match documents within each compendium by name
        const docMatches = query.length > 0 ? this.searchEngine.search(query) : [];
        const filters = this.activeFilters;
        const filteredMatches = filters.size > 0 ? docMatches.filter((m) => filters.has(m.documentType)) : docMatches;

        // Create a list of document matches
        const matchTemplate = htmlQuery<HTMLTemplateElement>(html, ".compendium-search-match");
        if (!matchTemplate) throw ErrorPF2e("Match template not found");

        const listElements = filteredMatches.map((match): HTMLLIElement => {
            const li = matchTemplate.content.firstElementChild?.cloneNode(true) as HTMLLIElement;
            li.dataset.score = match.score.toString();
            li.dataset.uuid = match.uuid;

            // Show a thumbnail if available
            const thumbnail = li.querySelector<HTMLImageElement>("img");
            if (thumbnail) {
                if (typeof match.img === "string") {
                    thumbnail.src = game.pf2e.system.moduleArt.map.get(match.uuid)?.img ?? match.img;
                } else if (match.documentType === "JournalEntry") {
                    thumbnail.src = "icons/svg/book.svg";
                }
            }

            const docAnchor = li.querySelector<HTMLAnchorElement>("a[data-action=openSheet]");
            const packAnchor = li.querySelector<HTMLAnchorElement>("a[data-action=activateEntry]");
            const systemType = ["Actor", "Item"].includes(match.documentType)
                ? game.i18n.localize(`TYPES.${match.documentType}.${match.type}`)
                : null;
            if (docAnchor && packAnchor) {
                docAnchor.innerText = match.name;
                packAnchor.append(systemType ? `${systemType} (${match.packLabel})` : `(${match.packLabel})`);
                const collection = fu.parseUuid(match.uuid)?.collection as CompendiumCollection | undefined;
                packAnchor.dataset.pack = collection?.metadata.id;
            }

            return li;
        });
        const matchesList = htmlQuery(html, "ol.document-matches");
        if (!matchesList) return;
        matchesList.replaceChildren(...listElements);
        this.#matchDragDrop.bind(matchesList);
    }

    /** Anyone can drag from search results */
    protected override _canDragStart(selector: string): boolean {
        return selector === "li.match" || super._canDragStart(selector);
    }

    /** Replicate the functionality of dragging a compendium document from an open `Compendium` */
    protected override _onDragStart(event: DragEvent): void {
        if (!(event.currentTarget instanceof HTMLElement)) return super._onDragStart(event);
        const uuid = event.currentTarget.dataset.uuid;
        if (!uuid) return super._onDragStart(event);
        const indexEntry = fromUuidSync(uuid);
        if (!indexEntry) throw ErrorPF2e("Unexpected error retrieving index data");
        const dragData =
            indexEntry instanceof foundry.abstract.Document
                ? indexEntry.toDragData()
                : { uuid, type: fu.parseUuid(uuid)?.type };
        event.dataTransfer?.setData("text/plain", JSON.stringify(dragData));
    }

    /** Called by a "ready" hook */
    compileSearchIndex(): void {
        console.debug("PF2e System | compiling search index");
        const packs = game.packs.filter((p) => p.index.size > 0 && p.testUserPermission(game.user, "OBSERVER"));
        this.searchEngine.removeAll();
        for (const pack of packs) {
            const contents = pack.index.map((i) => ({
                ...i,
                documentType: pack.metadata.type,
                packLabel: pack.metadata.label,
            }));
            this.searchEngine.addAll(contents);
        }
        console.debug("PF2e System | Finished compiling search index");
    }

    static async #onClickOpenBrowser(this: CompendiumDirectoryPF2e): Promise<void> {
        game.pf2e.compendiumBrowser.render({ force: true });
    }

    // Open compendium on result click
    static async #onClickOpenSheet(
        this: CompendiumDirectoryPF2e,
        _event: PointerEvent,
        target: HTMLElement,
    ): Promise<void> {
        const doc = await fromUuid(target.closest("li")?.dataset.uuid ?? "");
        doc?.sheet?.render(true);
    }
}

interface CompendiumDirectoryPF2e extends fa.sidebar.tabs.CompendiumDirectory {
    constructor: typeof CompendiumDirectoryPF2e;
}

interface CompendiumDirectoryRenderContext extends ApplicationRenderContext {
    searchContents?: boolean;
    buttons?: {
        type: "button" | "submit";
        name?: string;
        action?: string;
        disabled?: boolean;
        icon?: string;
        label?: string;
    }[];
}

export { CompendiumDirectoryPF2e };
