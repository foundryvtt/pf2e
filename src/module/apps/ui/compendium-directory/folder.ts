import { EnfolderedSummaryData } from "./index";

interface DataParameters {
    id: string;
    name: string;
    type: CompendiumDocumentType;
    parent?: PackFolderPF2e | null;
    expanded?: boolean;
}

export class PackFolderPF2e extends Array<EnfolderedSummaryData> {
    id: string;
    /** The localized name of this folder */
    name: string;
    /** The compendium entity type */
    type: CompendiumDocumentType;
    /** Whether the sidebar view of the folder is expanded or collapsed */
    expanded: boolean;
    /** The parent of this folder, if any */
    parent: PackFolderPF2e | null;
    /** Subfolders of this folder */
    subfolders: PackFolderPF2e[] = [];

    constructor(
        items: EnfolderedSummaryData[] = [],
        { id, name, type, parent = null, expanded = false }: DataParameters
    ) {
        super(...items);
        this.id = id;
        this.type = type;
        this.name = name;
        this.parent = parent;
        this.expanded = expanded;
    }

    /** Is the folder visible to non-GMs? */
    get private(): boolean {
        return this.every((pack) => pack.private) && this.subfolders.every((folder) => folder.private);
    }

    /** Is the folder visible to the current user? */
    get visible(): boolean {
        return game.user.isGM || this.some((pack) => !pack.private) || this.subfolders.some((folder) => folder.visible);
    }

    override push(summaryData: EnfolderedSummaryData) {
        const packID = `pf2e.${summaryData.metadata.name}`;
        const compendium = game.packs.get(packID);
        if (compendium?.documentName === this.type) {
            return super.push(summaryData);
        }
        return this.length;
    }
}
