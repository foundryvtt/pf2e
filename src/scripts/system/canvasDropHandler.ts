import { ItemData } from "../../module/item/dataDefinitions";
import { addKit } from "../../module/item/kits";
import { PF2eConditionManager } from "../../module/conditions";

Hooks.on('dropCanvasData', async (c: any, data: any) => {
    const target: any = c.tokens.placeables.find((token: Token) => {
        const maximumX = token.x + (token as any).hitArea.right;
        const maximumY = token.y + (token as any).hitArea.bottom;

        if (data.x >= token.x && data.y >= token.y && data.x <= maximumX && data.y <= maximumY) {
            return token;
        }

        return null;
    });

    if (target?.actor) {
        if (!['character', 'npc'].includes(target.actor.data.type)) return true;
        
        if (data.type === 'Item') {
            let itemData: ItemData;
            
            if (data.pack) {
                const pack: Compendium = await game.packs.get(data.pack);
                if (pack) {
                    itemData = await pack.getEntry(data.id);
                }
            } else if (data.data) {
                itemData = data.data;
            } else {
                const item = game.items.get(data.id);
                itemData = item.data;
            }

            if (itemData) {
                if (['weapon',
                     'armor',
                     'equipment',
                     'consumable',
                     'treasure',
                     'lore',
                     'martial',
                     'feat',
                     'action',
                     'backpack',
                     'kit',
                     'condition',
                     'effect'
                    ].includes(itemData.type)
                ) {
                    switch(itemData.type) {
                        case 'condition':
                            await PF2eConditionManager.addConditionToToken(itemData, target);
                            return false;
                        case 'kit':
                            await addKit(itemData, async (newItems) => {
                                const items = await target.actor.createEmbeddedEntity('OwnedItem', newItems);
                                if (Array.isArray(items)) {
                                    return items.map(item => item._id);
                                }
                                return [items._id];
                            });
                            return false;
                        default:
                            await target.actor.createEmbeddedEntity('OwnedItem', itemData);
                            return false;
                    }
                }
            }
        }
    }
    return true;
});
