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

    getData() {
        const itemData = super.getData();

        // Handle visibility of unidentified items
        itemData.tree.content = itemData.tree.content.reduce((result, item) => {
            const identificationData = item.data.data.identification;
            if (game.user.isGM) {
                // Filter unidentified items
                if (!identificationData?.isUnidentified) {
                    result.push(item);
                }
            } else {
                // Item has an unidentified version, show that instead
                if (identificationData?.unidentifiedItemId) {
                    const unidentifiedItem = game.items.get(identificationData.unidentifiedItemId);
                    if (unidentifiedItem) {
                        result.push(unidentifiedItem);
                    }
                // Filter unidentified items
                } else if (!identificationData?.isUnidentified) {
                    result.push(item);
                }
            }
            return result;
        }, []);

        return itemData;
    }
}
