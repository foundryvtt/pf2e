type FolderableEntity = typeof CONST.FOLDER_ENTITY_TYPES[number];

/** Patch EntityCollection and Compendium classes to fix Foundry bug causing new compendium entities to be created from
 *  derived data
 */
export function patchCompendiumImports() {
    if (game.data.version === '0.7.9') {
        EntityCollection.prototype.importFromCollection = async function (
            this: EntityCollection<CompendiumEntity>,
            collection: string,
            entryId: string,
            updateData: EntityUpdateData<CompendiumEntity['data']> = {},
            options: EntityCreateOptions = {},
        ): Promise<CompendiumEntity> {
            const entName = this.object.entity;
            const pack = game.packs.get(collection);
            if (!pack || pack.metadata.entity !== entName) return Promise.reject();

            // Prepare the source data from which to create the Entity
            const source = (await pack.getEntity(entryId))!;
            const createData: Partial<CompendiumEntity['data']> = mergeObject(
                this.fromCompendium(source._data),
                updateData,
            );
            delete createData._id;

            // Create the Entity
            console.log(`${vtt} | Importing ${entName} ${source.name} from ${collection}`);
            this.directory?.activate();
            return await this.object.create(createData, options);
        };

        Compendium.prototype.importAll = async function (
            this: Compendium<CompendiumEntity>,
            { folderId, folderName }: { folderId?: string | null; folderName?: string } = {},
        ): Promise<CompendiumEntity | CompendiumEntity[]> {
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
            const entities = await this.getContent();
            ui.notifications.info(
                game.i18n.format('COMPENDIUM.ImportAllStart', {
                    number: entities.length,
                    type: this.entity,
                    folder: folderName!,
                }),
            );

            // Step 3 - import all content
            const created = await this.cls.create(
                entities.map((e) => {
                    e._data.folder = folderId;
                    return e._data;
                }),
            );
            ui.notifications.info(
                game.i18n.format('COMPENDIUM.ImportAllFinish', {
                    number: (Array.isArray(created) ? created : [created]).length,
                    type: this.entity,
                    folder: folderName!,
                }),
            );
            return created;
        };
    }
}

/** Monkey-patch Token class to fix Foundry bug causing incorrect border colors based on token disposition */
export function patchTokenClasses(): void {
    if (
        game.data.version === '0.7.9' &&
        Token.prototype._getBorderColor !== undefined &&
        CONFIG.Canvas.dispositionColors !== undefined
    ) {
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

    /**
     * Setting a hook on TokenHUD.clear(), which clears the HUD by fading out it's active HTML and recording the new display state.
     * The hook call passes the TokenHUD and Token objects.
     */
    TokenHUD.prototype.clear = function clear(this: TokenHUD) {
        BasePlaceableHUD.prototype.clear.call(this);
        Hooks.call('onTokenHUDClear', this, this.object);
    };
}
