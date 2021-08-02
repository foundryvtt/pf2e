import { LocalizePF2e } from "@module/system/localize";
import { ErrorPF2e } from "@module/utils";
import { PackFolderPF2e } from "./folder";

type FolderName = keyof typeof LocalizePF2e.translations.PF2E.CompendiumDirectory.Folders;

interface PackMetadataPF2e<T extends CompendiumDocument = CompendiumDocument> extends CompendiumMetadata<T> {
    folder?: FolderName;
}
interface PackSummaryDataPF2e extends PackSummaryData {
    metadata: PackMetadataPF2e;
}
export type EnfolderedSummaryData = Omit<PackSummaryDataPF2e, "metadata"> & { metadata: Required<PackMetadataPF2e> };

interface PackSummaryPF2e extends PackSummary {
    title?: string;
    folders?: PackFolderPF2e[];
    packs: PackSummaryDataPF2e[];
}
type PackSummaryByEntityPF2e = Record<CompendiumDocumentType, PackSummaryPF2e>;

interface PackDirectoryDataPF2e extends CompendiumDirectoryData {
    packs: PackSummaryByEntityPF2e;
}

/** Extend CompendiumDirectory to support a search bar */
export class CompendiumDirectoryPF2e extends CompendiumDirectory {
    /** Folders! */
    folders: Map<string, PackFolderPF2e> = new Map();

    private static readonly contentSelector = "ol.compendium-list";

    static override get defaultOptions(): CompendiumDirectoryOptions {
        return {
            ...super.defaultOptions,
            template: "systems/pf2e/templates/system/ui/compendium-directory.html",
            filters: [
                {
                    inputSelector: 'input[name="search"]',
                    contentSelector: CompendiumDirectoryPF2e.contentSelector,
                },
            ],
            renderUpdateKeys: ["name", "permission", "sort", "folder"],
        };
    }

    override getData(options?: object): PackDirectoryDataPF2e {
        const data: PackDirectoryDataPF2e = super.getData(options);

        // Get compendia in folders
        const packSummaries = Object.values(data.packs);
        for (const summary of packSummaries) {
            summary.title = LocalizePF2e.translations.PF2E[summary.label]?.Plural ?? summary.label;
            this.setupFolders(summary);
        }
        return data;
    }

    private setupFolders(summary: PackSummaryPF2e): void {
        const summaryFolders: PackFolderPF2e[] = [];
        summary.folders = summaryFolders;
        const inFolders = summary.packs.filter(
            (summaryData): summaryData is EnfolderedSummaryData => !!summaryData.metadata.folder
        );

        for (const summaryData of inFolders) {
            const metadata = summaryData.metadata;
            const folderParts = metadata.folder.split("/");
            const folder = folderParts.reduce((folder: PackFolderPF2e | null, folderPart) => {
                const newFolder = this.findOrCreateFolder(folder, summaryData, folderPart);
                this.folders.set(newFolder.id, newFolder);
                if (!summaryFolders.includes(newFolder) && !newFolder.parent) {
                    summaryFolders.push(newFolder);
                }
                return newFolder;
            }, null);
            if (folder && !folder.some((pack) => pack === summaryData)) {
                folder.push(summaryData);
            }
        }
    }

    private findOrCreateFolder(
        parent: PackFolderPF2e | null,
        summaryData: EnfolderedSummaryData,
        folderPart: string
    ): PackFolderPF2e {
        const metadata = summaryData.metadata;
        const folderID = parent ? `${parent.id}/${folderPart}` : `${metadata.package}.${folderPart}`;
        const existingFolder = this.folders.get(folderID);
        if (existingFolder) return existingFolder;

        const folderNames: Record<string, string> = LocalizePF2e.translations.PF2E.CompendiumDirectory.Folders;
        const folderName = folderNames[folderID.replace(/^[^.]+\./, "")] ?? folderPart;
        const flagKey = `compendiumFolders.${folderID}.expanded` as const; // `;
        const newFolder = new PackFolderPF2e([], {
            id: folderID,
            name: folderName,
            type: metadata.entity,
            parent,
            expanded: game.user.getFlag("pf2e", flagKey),
        });
        parent?.subfolders?.push(newFolder);

        return newFolder;
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);

        // Hook in the compendium browser
        $("#compendium > footer > button").on("click", () => {
            game.pf2e.compendiumBrowser.render(true);
        });
        for (const filter of this._searchFilters) {
            for (const compendiumList of $html) {
                filter.bind(compendiumList);
            }
        }

        $html.find("header.folder-header").on("click", (event) => {
            this.toggleFolder(event);
        });

        $html.find("li.compendium-pack").on("click", (event) => {
            const $li = $(event.currentTarget);
            const $icon = $li.find("i.folder");
            // Remove icon added by parent class
            $icon.removeClass(["fa-folder", "fa-folder-open"]);
            if ($li.attr("data-open") === "1") {
                $icon.removeClass("fa-atlas").addClass("fa-book-open");
            }
        });
    }

    protected override _canDragDrop(): boolean {
        return game.user.hasPermission("ACTOR_CREATE");
    }

    protected override _onSearchFilter(_event: KeyboardEvent, query: string): void {
        const $lists = $(CompendiumDirectoryPF2e.contentSelector);
        const $compendia = $lists.find("li.compendium-pack");

        const isSearch = !!query;
        const regexp = new RegExp(this.escape(query), "i");

        const matchesQuery = (_i: number, row: HTMLElement) => regexp.test(($(row).find("h4 a").text() ?? "").trim());

        const $filteredRows = isSearch ? $compendia.filter(matchesQuery) : $compendia;
        $filteredRows.css({ display: "list-item" });

        const $rowsToHide = $compendia.not($filteredRows);
        $rowsToHide.css({ display: "none" });

        // Open the folder(s) of the filtered rows
        const $filteredFolders = $filteredRows.parents("li.folder");
        const $closedFolders = $filteredFolders.filter("li.folder.collapsed");
        $closedFolders.children("header.folder-header").trigger("click");

        // Close the other folders
        const $openFolders = $compendia.parents("li.folder:not(.collapsed)").not($filteredFolders);
        $openFolders.children("header.folder-header").trigger("click");
    }

    /**
     * Handle toggling the collapsed or expanded state of a folder within the directory tab
     * @param event The originating click event
     */
    private toggleFolder(event: JQuery.ClickEvent) {
        const $folder = $(event.currentTarget.parentElement);
        const folderID = $folder.data("folder-id");
        const folder = this.folders.get(folderID);
        if (!folder) throw ErrorPF2e("Unexpected failure to find folder");

        if (folder.expanded) {
            folder.expanded = false;
            $folder.addClass("collapsed");
        } else {
            folder.expanded = true;
            $folder.removeClass("collapsed");
        }
        const flagKey = `compendiumFolders.${folder.id}.expanded`;
        game.user.setFlag("pf2e", flagKey, folder.expanded);

        if (this.popOut) this.setPosition();
    }

    /** Atro's very special monkey-patched RegExp class method */
    private escape(text: string): string {
        return text.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    }
}
