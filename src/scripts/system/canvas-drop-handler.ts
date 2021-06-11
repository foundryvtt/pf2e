import { ActorSheetPF2e } from '@actor/sheet/base';
import { CanvasPF2e } from '@module/canvas';

Hooks.on('dropCanvasData', async (canvas: CanvasPF2e, data) => {
    const target = canvas.tokens.placeables.find((token) => {
        const maximumX = token.x + token.hitArea?.right ?? 0;
        const maximumY = token.y + token.hitArea?.bottom ?? 0;

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
