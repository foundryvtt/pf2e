import MiniSearch, { SearchResult } from "minisearch";

/** Extend CompendiumDirectory to support a search bar */
export class CompendiumDirectoryPF2e extends CompendiumDirectory {
    private static readonly contentSelector = "ol.directory-list";

    readonly searchEngine: MiniSearch<CompendiumIndexData>;

    constructor(options?: ApplicationOptions) {
        super(options);

        this.searchEngine = new MiniSearch<CompendiumIndexData>({
            fields: ["name"],
            idField: "_id",
            processTerm: (t) => (t.length > 1 ? t.toLocaleLowerCase(game.i18n.lang) : null),
            searchOptions: { combineWith: "AND", prefix: true },
            storeFields: ["img", "name", "pack", "type"],
        });
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
            template: "systems/pf2e/templates/sidebar/compendium-directory.html",
            filters: [
                {
                    inputSelector: "input[name=search]",
                    contentSelector: CompendiumDirectoryPF2e.contentSelector,
                },
            ],
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

    override getData(options?: Partial<ApplicationOptions>): CompendiumDirectoryDataPF2e {
        return {
            ...super.getData(options),
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

    /** System compendium search */
    protected override _onSearchFilter(_event: KeyboardEvent, query: string): void {
        const { searchMode } = this;
        // Match documents within each compendium by name
        const docMatches = searchMode && query.length > 0 ? this.searchEngine.search(query) : [];
        const packsFromDocMatches = new Set<string>(docMatches.map((m: SearchResult) => m.pack));

        // Match compendiums by name
        const regexp = new RegExp(RegExp.escape(query), "i");

        const matchesQuery = (pack: CompendiumCollection): boolean => {
            const packId = `${pack.metadata.package}.${pack.metadata.name}`;
            return searchMode ? packsFromDocMatches.has(packId) : regexp.test(pack.title);
        };
        const filteredPacks = query.length > 0 ? game.packs.filter(matchesQuery) : game.packs.contents;
        const packRows = Array.from(
            document.querySelectorAll<HTMLOListElement>(`${CompendiumDirectoryPF2e.contentSelector} li.compendium-pack`)
        );

        // Display matching compendium rows along with any document matches within each compendium
        for (const pack of filteredPacks) {
            const packId = `${pack.metadata.package}.${pack.metadata.name}`;
            const packRow = packRows.find((r) => r.dataset.pack === packId);
            packRow?.querySelector("ul.doc-matches")?.remove();
            if (!packRow || (pack.private && !game.user.isGM)) {
                continue;
            }
            packRow.style.display = "list-item";

            const packDocMatches = docMatches.filter((m) => m.pack === packRow.dataset.pack);
            if (packDocMatches.length === 0) continue;

            // Create a list of matches
            const matchList = document.createElement("ul");
            matchList.className = "doc-matches";
            for (const match of docMatches.filter((m) => m.pack === packRow.dataset.pack)) {
                const matchRow = ((): HTMLLIElement => {
                    const li = document.createElement("li");
                    li.dataset.documentId = match.id;
                    const matchUUID = `Compendium.${match.pack}.${match.id}` as const;
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
                ? packRows.filter((r) => !filteredPacks.includes(game.packs.get(r.dataset.pack ?? "")!))
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
        if (!dragElement.dataset.matchUuid) return;
        const [packId, docId] = /^Compendium\.(.+)\.([A-Za-z0-9]{16})$/
            .exec(dragElement.dataset.matchUuid)
            ?.slice(1, 3) ?? [null, null];
        if (!(packId && docId)) return;

        const pack = game.packs.get(packId);
        const indexEntry = pack?.index.get(docId);
        if (!(pack && indexEntry)) return;

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
                pack: pack.collection,
                id: docId,
            })
        );
    }

    /** Reindex compendiums to include image path (workaround of V9 bug) and compile search index */
    async onReady(): Promise<void> {
        console.debug("PF2e System | Reindexing compendiums and compiling search index");
        const packs = game.packs.filter(
            (p) => p.index.size > 0 && p.documentName !== "JournalEntry" && (game.user.isGM || !p.private)
        );

        for (const pack of packs) {
            // Due to *another* indexing bug, this is prone to butting heads with the BB/AV modules, which are also
            // working around the aforementioned bug
            try {
                if (!pack.indexed) {
                    await pack.getIndex();
                }
            } catch {
                console.debug(
                    "File-system permission error encountered while attempting to reindex",
                    `${pack.metadata.package}.${pack.metadata.name}`
                );
            }

            const contents = pack.index.map((i) => ({
                ...i,
                pack: `${pack.metadata.package}.${pack.metadata.name}`,
            }));
            this.searchEngine.addAll(contents);
        }
        console.debug("PF2e System | Finished reindexing compendiums and compiling search index");
    }
}

interface CompendiumDirectoryDataPF2e extends CompendiumDirectoryData {
    searchContents: boolean;
}
