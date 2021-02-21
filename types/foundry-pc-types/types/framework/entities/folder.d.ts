declare class Folders extends Collection<Folder> {}

declare interface FolderData extends BaseEntityData {
    color: string;
    parent: string | null;
    sort: null;
    sorting: 'a' | 'm';
    type: 'Actor' | 'Item' | 'Scene' | 'JournalEntry' | 'RollTable';
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
