import { LocalizePF2e } from '@module/system/localize';
import { ErrorPF2e } from '@module/utils';
import { PackFolderPF2e } from './folder';

type FolderName = keyof typeof LocalizePF2e.translations.PF2E.CompendiumDirectory.Folders;

interface PackMetadataPF2e<T extends CompendiumEntity = CompendiumEntity> extends CompendiumMetadata<T> {
    folder?: FolderName;
    private?: boolean;
}
interface PackSummaryDataPF2e extends PackSummaryData {
    metadata: PackMetadataPF2e;
}
export type EnfolderedSummaryData = Omit<PackSummaryDataPF2e, 'metadata'> & { metadata: Required<PackMetadataPF2e> };

interface PackSummaryPF2e extends PackSummary {
    title?: string;
    folders?: PackFolderPF2e[];
    packs: PackSummaryDataPF2e[];
}
interface PackSummaryByEntityPF2e {
    Actor: PackSummaryPF2e;
    Item: PackSummaryPF2e;
    JournalEntry: PackSummaryPF2e;
    Macro: PackSummaryPF2e;
    RollTable: PackSummaryPF2e;
}

interface PackDirectoryDataPF2e extends CompendiumDirectoryData {
    packs: PackSummaryByEntityPF2e;
}

/** Extend CompendiumDirectory to support a search bar */
export class CompendiumDirectoryPF2e extends CompendiumDirectory {
    /** Folders! */
    folders: Map<string, PackFolderPF2e> = new Map();

    private static readonly contentSelector = 'ol.compendium-list';

    /** @override */
    static get defaultOptions(): CompendiumDirectoryDefaultOptions {
        return {
            ...super.defaultOptions,
            template: 'systems/pf2e/templates/system/ui/compendium-directory.html',
            filters: [
                {
                    inputSelector: 'input[name="search"]',
                    contentSelector: CompendiumDirectoryPF2e.contentSelector,
                },
            ],
            renderUpdateKeys: ['name', 'permission', 'sort', 'folder'],
        };
    }

    /** @override */
    getData(options?: object): PackDirectoryDataPF2e {
        const packSettings = game.settings.get('core', 'compendiumConfiguration');
        for (const pack of game.packs) {
            const metadata: PackMetadataPF2e = pack.metadata;
            const packKey = `${metadata.package}.${metadata.name}`;
            pack.private = packSettings[packKey]?.private ?? metadata.private ?? false;
        }
        const data: PackDirectoryDataPF2e = super.getData(options);

        // Get compendia in folders
        const entityStrings = ['Actor', 'Item', 'JournalEntry', 'Macro', 'RollTable'] as const;
        for (const entityString of entityStrings) {
            data.packs[entityString].title = LocalizePF2e.translations.PF2E[entityString].Plural;
            this.setupFolders(data.packs[entityString]);
        }
        return data;
    }

    private setupFolders(summary: PackSummaryPF2e): void {
        const summaryFolders: PackFolderPF2e[] = [];
        summary.folders = summaryFolders;
        const inFolders = summary.packs.filter(
            (summaryData): summaryData is EnfolderedSummaryData => !!summaryData.metadata.folder,
        );

        for (const summaryData of inFolders) {
            const metadata = summaryData.metadata;
            const folderParts = metadata.folder.split('/');
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
        folderPart: string,
    ): PackFolderPF2e {
        const metadata = summaryData.metadata;
        const folderID = parent ? `${parent.id}/${folderPart}` : `${metadata.package}.${folderPart}`;
        const existingFolder = this.folders.get(folderID);
        if (existingFolder) return existingFolder;

        const folderNames: Record<string, string> = LocalizePF2e.translations.PF2E.CompendiumDirectory.Folders;
        const folderName = folderNames[folderID.replace(/^[^.]+\./, '')] ?? folderPart;
        const newFolder = new PackFolderPF2e([], {
            id: folderID,
            name: folderName,
            type: metadata.entity,
            parent,
            expanded: game.user.getFlag('pf2e', `compendiumFolders.${folderID}.expanded` as const),
        });
        parent?.subfolders?.push(newFolder);

        return newFolder;
    }

    /** @override */
    activateListeners($html: JQuery): void {
        super.activateListeners($html);
        for (const filter of this._searchFilters) {
            for (const compendiumList of $html) {
                filter.bind(compendiumList);
            }
        }

        $html.find('header.folder-header').on('click', (event) => {
            this.toggleFolder(event);
        });
    }

    /** @override */
    protected _canDragDrop(): boolean {
        return game.user.hasPermission('ACTOR_CREATE');
    }

    /** @override */
    protected _onSearchFilter(_event: Event, query: string, _html: HTMLElement): void {
        const $lists = $(CompendiumDirectoryPF2e.contentSelector);
        const $compendiums = $lists.find('li.compendium-pack');

        const isSearch = !!query;
        const regexp = new RegExp(this.escape(query), 'i');

        const matchesQuery = (_i: number, row: HTMLElement) => regexp.test(($(row).find('h4 a').text() ?? '').trim());

        const $filteredRows = isSearch ? $compendiums.filter(matchesQuery) : $compendiums;
        $filteredRows.css({ display: 'list-item' });

        const $rowsToHide = $compendiums.not($filteredRows);
        $rowsToHide.css({ display: 'none' });
    }

    /**
     * Handle toggling the collapsed or expanded state of a folder within the directory tab
     * @param event The originating click event
     */
    private toggleFolder(event: JQuery.ClickEvent) {
        const $folder = $(event.currentTarget.parentElement);
        const folderID = $folder.data('folder-id');
        const folder = this.folders.get(folderID);
        if (!folder) throw ErrorPF2e('Unexpected failure to find folder');

        if (folder.expanded) {
            folder.expanded = false;
            $folder.addClass('collapsed');
        } else {
            folder.expanded = true;
            $folder.removeClass('collapsed');
        }
        const flagKey = `compendiumFolders.${folder.id}.expanded`;
        game.user.setFlag('pf2e', flagKey, folder.expanded);

        if (this.popOut) this.setPosition();
    }

    /** Atro's very special monkey-patched RegExp class method */
    private escape(text: string): string {
        return text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    }
}
