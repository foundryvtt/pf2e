import { ActorSheetPF2e } from '@actor/sheet/base';
import { ScenePF2e } from '@module/scene';

Hooks.on('dropCanvasData', async (canvas: Canvas<ScenePF2e>, data) => {
    const target = canvas.tokens.placeables.find((token) => {
        const maximumX = token.x + token.hitArea.right;
        const maximumY = token.y + token.hitArea.bottom;

        if (data.x >= token.x && data.y >= token.y && data.x <= maximumX && data.y <= maximumY) {
            return true;
        }

        return false;
    });

    const actor = target?.actor;
    if (actor) {
        if (['character', 'npc', 'loot'].includes(actor.type) && actor.sheet instanceof ActorSheetPF2e) {
            await actor.sheet.onDropItem(data);
            return true;
        }
    }
    return false;
});
