import Collection from "@common/utils/collection.mjs";
import { WorldDocument } from "../_module.mjs";
import DirectoryCollectionMixin from "../abstract/directory-collection-mixin.mjs";
import DocumentCollection from "../abstract/document-collection.mjs";
import Folder from "../folder.mjs";
import CompendiumCollection from "./compendium-collection.mjs";

declare const MixedCompendiumPacks: ReturnType<
    typeof DirectoryCollectionMixin<typeof DocumentCollection<WorldDocument>>
>;

/**
 * A mapping of CompendiumCollection instances, one per Compendium pack
 */
export default class CompendiumPacks extends DirectoryCollectionMixin(Collection) {
    /**
     * Get a Collection of Folders which contain Compendium Packs
     */
    get folders(): Collection<string, Folder>;

    protected override _getVisibleTreeContents(): CompendiumCollection[];

    protected static override _sortAlphabetical(a: CompendiumCollection, b: CompendiumCollection): number;
    protected static override _sortAlphabetical<T extends { name: string }>(a: T, b: T): number;
}
