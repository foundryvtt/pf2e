import { ErrorPF2e, fontAwesomeIcon, htmlQueryAll } from "@util";
import MiniSearch from "minisearch";

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
            storeFields: ["img", "metadata", "name", "type"],
        });
        this.#compileSearchIndex();
    }

    /** Include ability to search and drag document search results */
    static override get defaultOptions(): ApplicationOptions {
        const options = super.defaultOptions;
        options.dragDrop.push({ dragSelector: "ol.document-matches > li.match" });

        return {
            ...options,
            filters: [{ inputSelector: "input[type=search]", contentSelector: "ol.directory-list" }],
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

        // Hook in the compendium browser
        $html[0]!.querySelector("footer > button")?.addEventListener("click", () => {
            game.pf2e.compendiumBrowser.render(true);
        });
    }

    /** Add a context menu for content search results */
    protected override _contextMenu($html: JQuery): void {
        super._contextMenu($html);

        ContextMenu.create(this, $html, "ol.document-matches > li", [
            {
                name: "COMPENDIUM.ImportEntry",
                icon: fontAwesomeIcon("download").outerHTML,
                condition: ($li) => {
                    const { uuid } = $li.get(0)?.dataset ?? {};
                    if (!uuid) throw ErrorPF2e("Unexpected missing uuid");
                    const collection = game.packs.get(fromUuidSync(uuid)?.pack ?? "", { strict: true });
                    const documentClass = collection.documentClass as unknown as typeof foundry.abstract.Document;

                    return documentClass.canUserCreate(game.user);
                },
                callback: ($li) => {
                    const { uuid } = $li.get(0)?.dataset ?? {};
                    if (!uuid) throw ErrorPF2e("Unexpected missing uuid");
                    const packCollection = game.packs.get(fromUuidSync(uuid)?.pack ?? "", { strict: true });
                    const worldCollection = game.collections.get(packCollection.documentName, { strict: true });
                    const indexData = fromUuidSync(uuid) ?? { _id: "" };
                    if (!("_id" in indexData)) throw ErrorPF2e("Unexpected missing document _id");

                    return worldCollection.importFromCompendium(
                        packCollection,
                        indexData._id,
                        {},
                        { renderSheet: true }
                    );
                },
            },
        ]);
    }

    /** System compendium search */
    protected override _onSearchFilter(_event: KeyboardEvent, query: string): void {
        // Match compendiums by title
        const matchesQuery = (pack: CompendiumCollection): boolean => {
            return pack.title.toLocaleLowerCase(game.i18n.lang).includes(query.toLocaleLowerCase(game.i18n.lang));
        };
        const filteredPacks = query.length > 0 ? game.packs.filter(matchesQuery) : game.packs.contents;
        const packRows = Array.from(
            this.element.get(0)?.querySelectorAll<HTMLOListElement>("li.compendium-pack") ?? []
        );

        // Display matching compendium rows along with any document matches within each compendium
        for (const pack of filteredPacks) {
            const packRow = packRows.find((r) => r.dataset.collection === pack.collection);
            if (!packRow || (pack.private && !game.user.isGM)) {
                continue;
            }
            packRow.style.display = "list-item";
        }

        // Hide the rest
        const rowsToHide =
            query.length > 0
                ? packRows.filter((r) => !filteredPacks.includes(game.packs.get(r.dataset.collection ?? "")!))
                : [];
        for (const row of rowsToHide) {
            row.style.display = "none";
        }

        // Match documents within each compendium by name
        const docMatches = query.length > 0 ? this.searchEngine.search(query) : [];

        // Create a list of document matches
        const matchTemplate = document.querySelector<HTMLTemplateElement>("#compendium-search-match");
        if (!matchTemplate) throw ErrorPF2e("Match template not found");

        for (const compendiumTypeList of htmlQueryAll(this.element[0]!, "li.compendium-type")) {
            const typedMatches = docMatches.filter((m) => m.metadata.type === compendiumTypeList.dataset.type);
            const listElements = typedMatches.map((match): HTMLLIElement => {
                const li = matchTemplate.content.firstElementChild!.cloneNode(true) as HTMLLIElement;
                const matchUUID = `Compendium.${match.metadata.id}.${match.id}` as const;
                li.dataset.uuid = matchUUID;
                li.dataset.score = match.score.toString();

                // Show a thumbnail if available
                const thumbnail = li.querySelector<HTMLImageElement>("img")!;
                if (typeof match.img === "string") {
                    thumbnail.src = game.pf2e.system.moduleArt.map.get(matchUUID)?.actor ?? match.img;
                } else if (compendiumTypeList.dataset.type === "JournalEntry") {
                    thumbnail.src = "icons/svg/book.svg";
                }

                // Open compendium on result click
                li.addEventListener("click", async (event) => {
                    event.stopPropagation();
                    const doc = await fromUuid(matchUUID);
                    await doc?.sheet?.render(true);
                });

                const anchor = li.querySelector("a")!;
                anchor.innerText = match.name;
                const details = li.querySelector("span")!;
                const systemType =
                    match.metadata.type === "Actor"
                        ? game.i18n.localize(`ACTOR.Type${match.type.titleCase()}`)
                        : match.metadata.type === "Item"
                        ? game.i18n.localize(`ITEM.Type${match.type.titleCase()}`)
                        : null;
                details.innerText = systemType
                    ? `${systemType} (${match.metadata.label})`
                    : `(${match.metadata.label})`;

                return li;
            });

            const matchesList = compendiumTypeList.querySelector<HTMLElement>("ol.document-matches")!;
            matchesList.replaceChildren(...listElements);
            for (const dragDrop of this._dragDrop) {
                dragDrop.bind(matchesList);
            }
        }
    }

    /** Anyone can drag from search results */
    protected override _canDragStart(): boolean {
        return true;
    }

    /** Replicate the functionality of dragging a compendium document from an open `Compendium` */
    protected override _onDragStart(event: ElementDragEvent): void {
        const dragElement = event.currentTarget;
        const { uuid } = dragElement.dataset;
        if (!uuid) return;

        const indexEntry = fromUuidSync(uuid);
        if (!indexEntry) throw ErrorPF2e("Unexpected error retrieving index data");

        // Clean up old drag preview
        document.querySelector("#pack-search-drag-preview")?.remove();

        // Create a new drag preview
        const dragPreview = this.#dragPreview.cloneNode(true) as HTMLElement;
        const [img, title] = Array.from(dragPreview.childNodes) as [HTMLImageElement, HTMLHeadingElement];
        title.innerText = indexEntry.name;
        img.src = "img" in indexEntry && indexEntry.img ? indexEntry.img : "icons/svg/book.svg";

        document.body.appendChild(dragPreview);
        const documentType = ((): string | null => {
            if (indexEntry instanceof foundry.abstract.Document) return indexEntry.documentName;
            const pack = game.packs.get(indexEntry.pack ?? "");
            return pack?.documentName ?? null;
        })();
        if (!documentType) return;

        event.dataTransfer.setDragImage(dragPreview, 75, 25);
        event.dataTransfer.setData("text/plain", JSON.stringify({ type: documentType, uuid }));
    }

    #compileSearchIndex(): void {
        console.debug("PF2e System | compiling search index");
        const packs = game.packs.filter((p) => p.index.size > 0 && (game.user.isGM || !p.private));

        for (const pack of packs) {
            const contents = pack.index.map((i) => ({
                ...i,
                metadata: pack.metadata,
            }));
            this.searchEngine.addAll(contents);
        }
        console.debug("PF2e System | Finished compiling search index");
    }
}

interface CompendiumDirectoryDataPF2e extends CompendiumDirectoryData {
    searchContents: boolean;
}
