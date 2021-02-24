declare interface BaseEntitySheetOptions extends FormApplicationOptions {
    classes: string[];
    template: string;
    viewPermission: number;
}

declare interface BaseEntitySheetData<E extends Entity> extends FormApplicationData<E> {
    cssClass: string;
    editable: boolean;
    entity: E['data'];
    limited: boolean;
    options: FormApplicationOptions;
    owner: boolean;
    title: string;
}

/**
 * A simple implementation of the FormApplication pattern which is specialized in editing Entity instances
 */
declare class BaseEntitySheet<EntityType extends Entity> extends FormApplication<EntityType> {
    /** @override */
    static get defaultOptions(): BaseEntitySheetOptions;

    /**
     * A convenience accessor for the object property of the inherited FormApplication instance
     */
    get entity(): EntityType;

    /**
     * Default data preparation logic for the entity sheet
     * @override
     */
    getData(options?: FormApplicationOptions): BaseEntitySheetData<EntityType>;

    /** @override */
    protected _updateObject(event: Event, formData: {}): Promise<void>;
}
