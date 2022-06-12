/** Extend CompendiumDirectory to support a search bar */
export class CompendiumDirectoryPF2e extends CompendiumDirectory {
    private static readonly contentSelector = "ol.compendium-list";

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            template: "systems/pf2e/templates/sidebar/compendium-directory.html",
            filters: [
                {
                    inputSelector: "input[name=search]",
                    contentSelector: CompendiumDirectoryPF2e.contentSelector,
                },
            ],
        };
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
    }

    protected override _onSearchFilter(_event: KeyboardEvent, query: string): void {
        const $lists = $(CompendiumDirectoryPF2e.contentSelector);
        const $compendia = $lists.find("li.compendium-pack");

        const isSearch = !!query;
        const regexp = new RegExp(RegExp.escape(query), "i");

        const matchesQuery = (_i: number, row: HTMLElement) => regexp.test(($(row).find("h4 a").text() ?? "").trim());

        const $filteredRows = isSearch ? $compendia.filter(matchesQuery) : $compendia;
        $filteredRows.css({ display: "list-item" });

        const $rowsToHide = $compendia.not($filteredRows);
        $rowsToHide.css({ display: "none" });
    }
}
