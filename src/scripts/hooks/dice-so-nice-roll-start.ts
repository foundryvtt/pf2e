import * as R from "remeda";

/** Show DsN! rolls as "ghost rolls" when the breakdown is hidden. */
export const DiceSoNiceRollStart = {
    listen: (): void => {
        Hooks.on("diceSoNiceRollStart", (...[messageId, context]: unknown[]) => {
            if (!game.user.isGM && typeof messageId === "string" && R.isObject(context)) {
                const messageRolls = game.messages.get(messageId)?.rolls;
                if (R.isObject(context.roll) && messageRolls?.every((r) => r.options.showBreakdown === false)) {
                    context.roll.ghost = true;
                }
            }
        });
    },
};
