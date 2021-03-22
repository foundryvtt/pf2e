import { LocalizePF2e } from '@module/system/localize';
import { ErrorPF2e } from '@module/utils';
import { CompendiumFolderPF2e } from './folder';

type FolderName = keyof typeof LocalizePF2e.translations.PF2E.CompendiumDirectory.Folders;

interface CompendiumMetadataPF2e<T extends CompendiumEntity = CompendiumEntity> extends CompendiumMetadata<T> {
    folder?: FolderName;
}
export interface PackSummaryDataPF2e extends PackSummaryData {
    metadata: CompendiumMetadataPF2e;
}
interface PackSummaryPF2e extends PackSummary {
    folders?: CompendiumFolderPF2e[];
    packs: PackSummaryDataPF2e[];
}

interface CompendiumDirectoryDataPF2e extends CompendiumDirectoryData {
    packs: {
        Actor: PackSummaryPF2e;
        Item: PackSummaryPF2e;
        JournalEntry: PackSummaryPF2e;
        Macro: PackSummaryPF2e;
        RollTable: PackSummaryPF2e;
    };
}

/** Extend CompendiumDirectory to support a search bar */
export class CompendiumDirectoryPF2e extends CompendiumDirectory {
    /** Folders! */
    folders: Map<string, CompendiumFolderPF2e> = new Map();

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
    getData(options?: object): CompendiumDirectoryDataPF2e {
        const data: CompendiumDirectoryDataPF2e = super.getData(options);

        // Get compendia in folders
        const entityStrings = ['Actor', 'Item', 'JournalEntry', 'Macro', 'RollTable'] as const;
        const packs = data.packs;
        for (const entityString of entityStrings) {
            packs[entityString].folders = [];
        }
        const inFolders = entityStrings.flatMap((entityString) =>
            packs[entityString].packs.filter((pack) => !!pack.metadata.folder),
        );
        const folderNames = LocalizePF2e.translations.PF2E.CompendiumDirectory.Folders;
        for (const pack of inFolders) {
            // Remove the pack summary from the unfolder'd list
            const index = packs[pack.metadata.entity].packs.indexOf(pack);
            delete packs[pack.metadata.entity].packs[index];

            // Add the pack to a folder
            const metadata = pack.metadata as Required<CompendiumMetadataPF2e>;
            const existingFolder = packs[metadata.entity].folders?.find(
                (folder) => folder.id === `pf2e.${metadata.folder}`,
            );
            if (existingFolder) {
                existingFolder.push(pack);
            } else {
                const folderName = folderNames[metadata.folder];
                const folderID = `pf2e.${metadata.folder}`;
                const folder = new CompendiumFolderPF2e([pack], {
                    id: folderID,
                    name: folderName,
                    type: metadata.entity,
                    expanded: game.user.getFlag('pf2e', `compendiumFolders.${folderID}.expanded`),
                });
                this.folders.set(folderID, folder);
                packs[metadata.entity].folders!.push(folder);
            }
        }

        return data;
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
        const folder = this.folders.get($folder.data('folder-id'));
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
