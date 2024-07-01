import * as R from "remeda";

/** Show DsN! rolls as "ghost rolls" when the breakdown is hidden. */
export const DiceSoNiceRollStart = {
    listen: (): void => {
        Hooks.on("diceSoNiceRollStart", (...[messageId, context]: unknown[]) => {
            if (!game.user.isGM && typeof messageId === "string" && R.isObjectType(context)) {
                const messageRolls = game.messages.get(messageId)?.rolls;
                if (
                    "roll" in context &&
                    R.isObjectType(context.roll) &&
                    messageRolls?.every((r) => r.options.showBreakdown === false)
                ) {
                    (context.roll as { ghost?: boolean }).ghost = true; // DsN!'s bolted-on property to `Roll`
                }
            }
        });
    },
};
