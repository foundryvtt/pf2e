import { ActorPF2e } from '@actor';
import { ActorSourcePF2e } from '@actor/data';
import { ItemPF2e } from '@item';
import { ItemSourcePF2e } from '@item/data';

type EnfolderableDocumentPF2e = ActorPF2e | ItemPF2e | Exclude<EnfolderableDocument, Actor | Item>;

export class FolderPF2e<
    TDocument extends EnfolderableDocumentPF2e = EnfolderableDocumentPF2e,
> extends Folder<TDocument> {
    /**
     * Work around foundry bug causing deleted array elements to be retained.
     * @override
     */
    async exportToCompendium(pack: CompendiumCollection<TDocument>, { updateByName = false } = {}) {
        if (!(updateByName && ['Actor', 'Item'].includes(pack.metadata.entity))) {
            return super.exportToCompendium(pack, { updateByName });
        }

        const index = await pack.getIndex();
        const documents = this.contents;
        for await (const folderDoc of documents) {
            const packIndex = index.find((compendiumDoc) => compendiumDoc.name === folderDoc.name);
            if (!packIndex) continue;
            const packDoc = await pack.getDocument(packIndex._id);
            if (
                !(packDoc instanceof ActorPF2e && folderDoc instanceof ActorPF2e) &&
                !(packDoc instanceof ItemPF2e && folderDoc instanceof ItemPF2e)
            ) {
                continue;
            }

            // Replace the contents of the actor or item without diffing between the two
            const updateData: DocumentUpdateData<ActorPF2e | ItemPF2e> = (folderDoc as ClientDocument).toObject() as
                | ActorSourcePF2e
                | ItemSourcePF2e;

            await packDoc.update(updateData, { noHook: true, diff: false });
        }
        return super.exportToCompendium(pack, { updateByName });
    }
}
