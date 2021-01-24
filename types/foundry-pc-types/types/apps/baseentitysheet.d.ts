declare interface BaseEntitySheetData<D extends BaseEntityData> extends Omit<FormApplicationData<D>, 'object'> {
    cssClass: 'editable' | 'locked';
    editable: boolean;
    entity: D;
    limited: boolean;
    owner: boolean;
}

/**
 * A simple implementation of the FormApplication pattern which is specialized in editing Entity instances
 */
declare abstract class BaseEntitySheet<EntityType extends Entity> extends FormApplication<EntityType> {
    /**
     * A convenience accessor for the object property of the inherited FormApplication instance
     */
    get entity(): EntityType;

    /**
     * Default data preparation logic for the entity sheet
     * @override
     */
    getData(options?: FormApplicationOptions): BaseEntitySheetData<EntityType['data']>;
}