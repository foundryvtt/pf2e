export namespace MonkeyPatch {
    export function apply() {
        if (game.data.version === '0.7.9') {
            // Monkey-patch EntityCollection class to fix Foundry bug causing new compendium entities to be created
            // from derived data
            EntityCollection.prototype.importFromCollection = async function <EntityType extends Entity = Entity>(
                this: EntityCollection<EntityType>,
                collection: string,
                entryId: string,
                updateData = {},
                options = {},
            ): Promise<EntityType> {
                const entName = this.object.entity;
                const pack = game.packs.get(collection);
                if (!pack || pack.metadata.entity !== entName) return Promise.reject();

                // Prepare the source data from which to create the Entity
                const source = await pack.getEntity(entryId);
                const createData: Partial<Entity['data']> = mergeObject(this.fromCompendium(source._data), updateData);
                delete createData._id;

                // Create the Entity
                console.log(`${vtt} | Importing ${entName} ${source.name} from ${collection}`);
                this.directory?.activate();
                return await this.object.create(createData, options);
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
}
