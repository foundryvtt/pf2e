export default class extends ItemDirectory {
    constructor(options) {
        super(options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: './systems/pf2e/templates/system/item-directory.html',
            baseApplication: 'SidebarTab'
        });
    }

    initialize() {

    // Assign Folders
    this.folders = game.folders.filter(f => f.type === this.constructor.entity);

    // Assign Entities
    this.entities = this.constructor.collection.reduce((result, item) => {
        const showItem = this._showItem(item);
        if (showItem.show) {
            if (showItem.item) {
                result.push(showItem.item);
            } else {
                result.push(item);
            }
        }
        return result;
    },[]);

    // Build Tree
    const sortMode = 'n';
    this.tree = this.constructor.setupFolders(this.folders, this.entities, sortMode);
    }

    _showItem(item) {
        if (!item.visible) return {show: false};

        if (['consumable', 'equipment', 'weapon', 'armor', 'backpack', 'treasure'].includes(item.type)) {
            const identificationData = item.data.data.identification ?? {};
            // Hide unidentified items by default
            if (identificationData.isUnidentified) return {show: false};

            if (!game.user.isGM) {
                // If a player can see the identified version in the item directory
                // show the unidentified version instead
                const unidentifiedItem = this._getUnidentifiedVersion(item);
                if (unidentifiedItem) {
                    return {
                        show: true,
                        item: unidentifiedItem
                    }
                }
            }
        }

        return {show: true};
    }

    _getUnidentifiedVersion(item) {
        const unidentifiedItemId = item.data.data.identification?.unidentifiedItemId;
        if (unidentifiedItemId) {
            const unidentifiedItem = game.items.get(unidentifiedItemId);
            if (unidentifiedItem) {
                unidentifiedItem.data.permission = item.data.permission;
                return unidentifiedItem;
            }
        }
        return;
    }
}
