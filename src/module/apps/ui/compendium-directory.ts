/** Extend CompendiumDirectory to support a search bar */
export class CompendiumDirectoryPF2e extends CompendiumDirectory {
    /** @override */
    constructor(...args: ConstructorParameters<typeof Application>) {
        super(...args);
    }

    private static readonly contentSelector = 'ol.compendium-list';

    /** @override */
    static get defaultOptions(): typeof CompendiumDirectory['defaultOptions'] {
        return {
            ...super.defaultOptions,
            template: 'systems/pf2e/templates/packs/compendium-directory.html',
            filters: [
                {
                    inputSelector: 'input[name="search"]',
                    contentSelector: CompendiumDirectoryPF2e.contentSelector,
                },
            ],
        };
    }

    /** @override */
    activateListeners($html: JQuery): void {
        super.activateListeners($html);
        for (const filter of this._searchFilters) {
            for (const compendiumList of $html) {
                filter.bind(compendiumList);
            }
        }
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

    /** Atro's very special monkey-patched RegExp class method */
    private escape(text: string): string {
        return text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }
}
