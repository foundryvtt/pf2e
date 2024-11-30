declare interface DirectoryMixinEntry {
    /** The unique id of the entry */
    id: string;
    /** The folder id or folder object to which this entry belongs */
    folder: Folder | string;
    /** An image path to display for the entry */
    img?: string;
    /** A numeric sort value which orders this entry relative to others */
    sort?: string;
}
