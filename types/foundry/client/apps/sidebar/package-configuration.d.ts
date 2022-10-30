export {};

declare global {
    /** An application for configuring data across all installed and active packages. */
    abstract class PackageConfiguration extends FormApplication {
        static get categoryOrder(): string[];

        /** The name of the currently active tab. */
        get activeCategory(): string;

        static override get defaultOptions(): FormApplicationOptions;

        override getData(options?: FormApplicationOptions): FormApplicationData;

        /** Prepare the structure of category data which is rendered in this configuration form. */
        protected abstract _prepareCategoryData(): { categories: object[]; total: number };

        /**
         * Classify what Category an Action belongs to
         * @param namespace The entry to classify
         * @returns The category the entry belongs to
         */
        protected _categorizeEntry(namespace: string): { id: string; title: string };

        /** Reusable logic for how categories are sorted in relation to each other. */
        protected _sortCategories(a: object, b: object): number;

        protected override _render(force?: boolean, options?: RenderOptions): Promise<void>;

        override activateListeners(html: JQuery): void;

        protected override _onChangeTab(event: MouseEvent | null, tabs: Tabs, active: string): void;

        protected override _onSearchFilter(event: KeyboardEvent, query: string, rgx: RegExp, html: HTMLElement): void;

        /**
         * Handle button click to reset default settings
         * @param event The initial button click event
         */
        protected abstract _onResetDefaults(event: Event): void;
    }
}
