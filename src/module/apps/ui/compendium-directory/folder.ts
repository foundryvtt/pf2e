import { PackSummaryDataPF2e } from './index';

interface DataParameters {
    id: string;
    name: string;
    type: CompendiumEntityString;
    expanded?: boolean;
}

export class CompendiumFolderPF2e extends Array<PackSummaryDataPF2e> {
    id: string;
    /** The localized name of this folder */
    name: string;
    /** The compendium entity type */
    type: CompendiumEntityString;
    /** Whether the sidebar view of the folder is expanded or collapsed */
    expanded: boolean;

    constructor(items: PackSummaryDataPF2e[] = [], { id, name, type, expanded = false }: DataParameters) {
        super(...items);
        this.id = id;
        this.type = type;
        this.name = name;
        this.expanded = expanded;
    }

    /** Is the folder visible to non-GMs? */
    get private() {
        return this.every((pack) => pack.private);
    }

    /** Is the folder visible to the current user? */
    get visible() {
        return game.user.isGM || this.some((pack) => !pack.private);
    }

    push(pack: PackSummaryDataPF2e) {
        const packID = `pf2e.${pack.metadata.name}`;
        const compendium = game.packs.get(packID);
        if (compendium?.entity === this.type) {
            return super.push(pack);
        }
        return this.length;
    }

    get displayed() {
        return game.user.isGM || !!this.length;
    }
}
