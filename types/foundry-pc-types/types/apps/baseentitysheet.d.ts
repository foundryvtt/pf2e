declare interface BaseEntitySheetData<E extends Entity> extends FormApplicationData<E> {
    entity?: E;
    owner?: boolean;
    limited?: boolean;
    editable?: boolean;
    cssClass?: string;
}

/**
 * A simple implementation of the FormApplication pattern which is specialized in editing Entity instances
 */
declare class BaseEntitySheet<EntityType extends Entity> extends FormApplication<EntityType> {
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