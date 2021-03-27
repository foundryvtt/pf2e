declare class Folders extends EntityCollection<Folder> {
    /** @override */
    get entity(): 'Folder';
}

declare interface FolderData extends BaseEntityData {
    color: string;
    parent: string | null;
    sort: null;
    sorting: 'a' | 'm';
    type: 'Actor' | 'Item' | 'Macro' | 'JournalEntry' | 'RollTable' | 'Scene';
}

declare interface FolderClassConfig extends EntityClassConfig<Folder> {
    collection: Folders;
}

declare class Folder extends Entity {
    data: FolderData;
    _data: FolderData;

    /** @override */
    static create<F extends Folder>(
        this: new (data: F['data'], options?: EntityConstructorOptions) => F,
        data: Partial<F['data']>,
        options?: EntityCreateOptions,
    ): Promise<F>;
    static create<F extends Folder>(
        this: new (data: F['data'], options?: EntityConstructorOptions) => F,
        data: Partial<F['data']>[] | Partial<F['data']>,
        options?: EntityCreateOptions,
    ): Promise<F[] | F>;
}
