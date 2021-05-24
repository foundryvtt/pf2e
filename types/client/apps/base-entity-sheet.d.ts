declare interface BaseEntitySheetOptions extends FormApplicationOptions {
    classes: string[];
    template: string;
    viewPermission: number;
}

declare interface BaseEntitySheetData<TDocument extends Entity | foundry.abstract.Document> {
    cssClass: string;
    editable: boolean;
    document: TDocument;
    limited: boolean;
    options: FormApplicationOptions;
    owner: boolean;
    title: string;
}

/**
 * A simple implementation of the FormApplication pattern which is specialized in editing Entity instances
 */
declare class BaseEntitySheet<TDocument extends Entity | ClientDocument> extends FormApplication<
    TDocument,
    BaseEntitySheetOptions
> {
    /** @override */
    constructor(object: TDocument, options: Partial<BaseEntitySheetOptions>);

    /** @override */
    static get defaultOptions(): BaseEntitySheetOptions;

    /**
     * A convenience accessor for the object property of the inherited FormApplication instance
     */
    get entity(): TDocument;

    /**
     * Default data preparation logic for the entity sheet
     * @override
     */
    getData(options?: FormApplicationOptions): BaseEntitySheetData<TDocument>;

    /** @override */
    protected _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}
