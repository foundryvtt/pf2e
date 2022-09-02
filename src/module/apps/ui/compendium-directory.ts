import { fontAwesomeIcon } from "@util";
import MiniSearch, { SearchResult } from "minisearch";

/** Extend CompendiumDirectory to support a search bar */
export class CompendiumDirectoryPF2e extends CompendiumDirectory {
    readonly searchEngine: MiniSearch<CompendiumIndexData>;

    constructor(options?: ApplicationOptions) {
        super(options);

        this.searchEngine = new MiniSearch<CompendiumIndexData>({
            fields: ["name"],
            idField: "_id",
            processTerm: (t) => (t.length > 1 ? t.toLocaleLowerCase(game.i18n.lang) : null),
            searchOptions: { combineWith: "AND", prefix: true },
            storeFields: ["img", "name", "collection", "type"],
        });
        this.#compileSearchIndex();
    }

    /** Whether this application is in search mode */
    private get searchMode(): boolean {
        return game.user.settings.searchPackContents;
    }

    /** Include ability to search and drag document search results */
    static override get defaultOptions(): ApplicationOptions {
        const options = super.defaultOptions;
        options.dragDrop.push({ dragSelector: "li[data-match-uuid]" });

        return {
            ...options,
            filters: [{ inputSelector: "input[name=search]", contentSelector: "ol.directory-list" }],
            template: "systems/pf2e/templates/sidebar/compendium-directory.html",
        };
    }

    /** Create a drag preview that looks like the one generated from an open compendium */
    get #dragPreview(): HTMLElement {
        const preview = document.createElement("div");
        preview.id = "pack-search-drag-preview";

        const thumbnail = document.createElement("img");
        const title = document.createElement("h4");
        preview.append(thumbnail, title);

        return preview;
    }

    override async getData(options?: Partial<ApplicationOptions>): Promise<CompendiumDirectoryDataPF2e> {
        return {
            ...(await super.getData(options)),
            searchContents: game.user.settings.searchPackContents,
        };
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const html = $html.get(0)!;

        // Hook in the compendium browser
        html.querySelector("footer > button")?.addEventListener("click", () => {
            game.pf2e.compendiumBrowser.render(true);
        });

        html.querySelector("input[name=search]")?.setAttribute(
            "placeholder",
            game.i18n.localize(
                game.user.settings.searchPackContents ? "COMPENDIUM.SearchContents.Placeholder" : "COMPENDIUM.Filter"
            )
        );

        // Manage toggle for switching between compendium and compendium-content searching
        const searchContent = html.querySelector<HTMLButtonElement>("button[data-action=toggle-search-contents]");
        searchContent?.addEventListener("click", async () => {
            const newValue = !game.user.settings.searchPackContents;
            await game.user.update({ "flags.pf2e.settings.searchPackContents": newValue });

            const input = html.querySelector("input[name=search]");

            // Show the button as compressed or not
            if (newValue) {
                searchContent.classList.add("active");
                input?.setAttribute("placeholder", game.i18n.localize("COMPENDIUM.SearchContents.Placeholder"));
            } else {
                searchContent.classList.remove("active");
                input?.setAttribute("placeholder", game.i18n.localize("COMPENDIUM.Filter"));
            }

            // Trigger a new search
            html.querySelector("input[name=search]")?.dispatchEvent(new KeyboardEvent("keyup"));
        });
    }

    /** Add a context menu for content search results */
    protected override _contextMenu($html: JQuery): void {
        super._contextMenu($html);

        ContextMenu.create(this, $html, "ul.doc-matches > li", [
            {
                name: "COMPENDIUM.ImportEntry",
                icon: fontAwesomeIcon("download").outerHTML,
                condition: ($li) => {
                    const { dataset } = $li.get(0) ?? {};
                    const collection = game.packs.get(dataset?.collection ?? "", { strict: true });
                    const documentClass = collection.documentClass as unknown as typeof foundry.abstract.Document;

                    return documentClass.canUserCreate(game.user);
                },
                callback: ($li) => {
                    const { dataset } = $li.get(0) ?? {};
                    if (!(dataset?.collection && dataset.documentId)) return;
                    const packCollection = game.packs.get(dataset.collection, { strict: true });
                    const worldCollection = game.collections.get(packCollection.documentName, { strict: true });

                    return worldCollection.importFromCompendium(
                        packCollection,
                        dataset.documentId,
                        {},
                        { renderSheet: true }
                    );
                },
            },
        ]);
    }

    /** System compendium search */
    protected override _onSearchFilter(_event: KeyboardEvent, query: string): void {
        const { searchMode } = this;
        // Match documents within each compendium by name
        const docMatches = searchMode && query.length > 0 ? this.searchEngine.search(query) : [];
        const packsFromDocMatches = new Set<string>(docMatches.map((m: SearchResult) => m.collection));

        // Match compendiums by name
        const regexp = new RegExp(RegExp.escape(query), "i");

        const matchesQuery = (pack: CompendiumCollection): boolean => {
            return regexp.test(pack.title) || (searchMode && packsFromDocMatches.has(pack.collection));
        };
        const filteredPacks = query.length > 0 ? game.packs.filter(matchesQuery) : game.packs.contents;
        const packRows = Array.from(
            this.element.get(0)?.querySelectorAll<HTMLOListElement>("li.compendium-pack") ?? []
        );

        // Display matching compendium rows along with any document matches within each compendium
        for (const pack of filteredPacks) {
            const packRow = packRows.find((r) => r.dataset.collection === pack.collection);
            packRow?.querySelector("ul.doc-matches")?.remove();
            if (!packRow || (pack.private && !game.user.isGM)) {
                continue;
            }
            packRow.style.display = "list-item";

            const packDocMatches = docMatches.filter((m) => m.collection === packRow.dataset.collection);
            if (packDocMatches.length === 0) continue;

            // Create a list of matches
            const matchList = document.createElement("ul");
            matchList.className = "doc-matches";
            for (const match of packDocMatches) {
                const matchRow = ((): HTMLLIElement => {
                    const li = document.createElement("li");
                    li.dataset.collection = match.collection;
                    li.dataset.documentId = match.id;
                    const matchUUID = `Compendium.${match.collection}.${match.id}` as const;
                    li.dataset.matchUuid = matchUUID;

                    const anchor = document.createElement("a");
                    anchor.innerText = match.name;

                    // Show a thumbnail if available
                    if (typeof match.img === "string") {
                        const thumbnail = document.createElement("img");
                        thumbnail.className = "thumbnail";
                        thumbnail.src = match.img;
                        li.append(thumbnail);
                    }
                    li.append(anchor);

                    // Open compendium on result click
                    li.addEventListener("click", async (event) => {
                        event.stopPropagation();
                        const doc = await fromUuid(matchUUID);
                        await doc?.sheet?.render(true);
                    });

                    return li;
                })();

                matchList.append(matchRow);
            }
            packRow.append(matchList);

            for (const dragDrop of this._dragDrop) {
                dragDrop.bind(packRow);
            }
        }

        // Hide the rest
        const rowsToHide =
            query.length > 0
                ? packRows.filter((r) => !filteredPacks.includes(game.packs.get(r.dataset.collection ?? "")!))
                : [];
        for (const row of rowsToHide) {
            row.style.display = "none";
            row.querySelector("ul.doc-matches")?.remove();
        }
    }

    /** Anyone can drag from search results */
    protected override _canDragStart(): boolean {
        return true;
    }

    /** Replicate the functionality of dragging a compendium document from an open `Compendium` */
    protected override _onDragStart(event: ElementDragEvent): void {
        const dragElement = event.currentTarget;
        const { collection, documentId } = dragElement.dataset;
        if (!(collection && documentId)) return;

        const pack = game.packs.get(collection, { strict: true });
        const indexEntry = pack?.index.get(documentId, { strict: true });

        // Clean up old drag preview
        document.querySelector("#pack-search-drag-preview")?.remove();

        // Create a new drag preview
        const dragPreview = this.#dragPreview.cloneNode(true) as HTMLElement;
        const [img, title] = Array.from(dragPreview.childNodes) as [HTMLImageElement, HTMLHeadingElement];
        title.innerText = indexEntry.name;
        if (indexEntry.img) img.src = indexEntry.img;

        document.body.appendChild(dragPreview);

        event.dataTransfer.setDragImage(dragPreview, 75, 25);
        event.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
                type: pack.documentName,
                uuid: `Compendium.${pack.collection}.${documentId}`,
            })
        );
    }

    #compileSearchIndex(): void {
        console.debug("PF2e System | compiling search index");
        const packs = game.packs.filter(
            (p) => p.index.size > 0 && p.documentName !== "JournalEntry" && (game.user.isGM || !p.private)
        );

        for (const pack of packs) {
            const contents = pack.index.map((i) => ({
                ...i,
                collection: pack.collection,
            }));
            this.searchEngine.addAll(contents);
        }
        console.debug("PF2e System | Finished compiling search index");
    }
}

interface CompendiumDirectoryDataPF2e extends CompendiumDirectoryData {
    searchContents: boolean;
}
