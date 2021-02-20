export function apply() {
    if (game.data.version === '0.7.9') {
        // Monkey-patch EntityCollection class to fix Foundry bug causing new compendium entities to be created
        // from derived data
        EntityCollection.prototype.importFromCollection = async function <EntityType extends Entity = Entity>(
            collection: string,
            entryId: string,
            updateData = {},
            options = {},
        ): Promise<EntityType> {
            const entName = this.object.entity;
            const pack = game.packs.get(collection);
            if (!pack || pack.metadata.entity !== entName) return Promise.reject();

            // Prepare the source data from which to create the Entity
            const source = (await pack.getEntity(entryId))!;
            const createData: Partial<EntityType['data']> = mergeObject(this.fromCompendium(source._data), updateData);
            delete createData._id;

            // Create the Entity
            console.log(`${vtt} | Importing ${entName} ${source.name} from ${collection}`);
            this.directory?.activate();
            return await this.object.create(createData, options);
        };

        type FolderableEntity = typeof CONST.FOLDER_ENTITY_TYPES[number];

        // Same for Compendium#importAll
        Compendium.prototype.importAll = async function ({
            folderId,
            folderName,
        }: { folderId?: string | null; folderName?: string } = {}): Promise<Entity[]> {
            // Step 1 - optionally, create a folder
            if (CONST.FOLDER_ENTITY_TYPES.includes(this.entity as FolderableEntity)) {
                const f = folderId
                    ? game.folders.get(folderId, { strict: true })!
                    : await Folder.create({
                          name: folderName || this.metadata.label,
                          type: this.entity as FolderableEntity,
                          parent: null,
                      });
                folderId = f.id;
                folderName = f.name;
            }

            // Step 2 - load all content
            const entities = await this.getContent<CompendiumEntity>();
            ui.notifications.info(
                game.i18n.format('COMPENDIUM.ImportAllStart', {
                    number: entities.length,
                    type: this.entity,
                    folder: folderName as string,
                }),
            );

            // Step 3 - import all content
            const created = await (this.cls as typeof Entity).create(
                entities.map((e) => {
                    e._data.folder = folderId;
                    return e._data;
                }),
            );
            ui.notifications.info(
                game.i18n.format('COMPENDIUM.ImportAllFinish', {
                    number: (Array.isArray(created) ? created : [created]).length,
                    type: this.entity,
                    folder: folderName as string,
                }),
            );
            return created as Entity[];
        };

        // Monkey-patch Token class to fix Foundry bug causing incorrect border colors based on token disposition
        if (Token.prototype._getBorderColor !== undefined) {
            Token.prototype._getBorderColor = function (this: Token) {
                const colors = CONFIG.Canvas.dispositionColors;
                if (this._controlled) return colors.CONTROLLED;
                else if (this._hover) {
                    const disposition =
                        typeof this.data.disposition === 'string'
                            ? parseInt(this.data.disposition, 10)
                            : this.data.disposition;
                    if (!game.user.isGM && this.owner) return colors.CONTROLLED;
                    else if (this.actor?.hasPlayerOwner) return colors.PARTY;
                    else if (disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) return colors.FRIENDLY;
                    else if (disposition === CONST.TOKEN_DISPOSITIONS.NEUTRAL) return colors.NEUTRAL;
                    else return colors.HOSTILE;
                } else return null;
            };
        }
    }
}
