import { CheckRoll } from "../roll.ts";

export class StrikeAttackRoll extends CheckRoll {
    static override CHAT_TEMPLATE = "systems/pf2e/templates/chat/check/strike/attack-roll.hbs";

    override async render(this: Rolled<StrikeAttackRoll>, options: RollRenderOptions = {}): Promise<string> {
        if (!this._evaluated) await this.evaluate({ async: true });
        const { isPrivate, flavor, template } = options;

        const chatData: Record<string, unknown> = {
            formula: isPrivate ? "???" : this._formula,
            flavor: isPrivate ? null : flavor,
            user: game.user.id,
            tooltip: isPrivate ? "" : await this.getTooltip(),
            total: isPrivate ? "?" : Math.round(this.total * 100) / 100,
            strike: this.options.strike,
            degree: this.options.degreeOfSuccess,
            canRollDamage: this.roller === game.user || game.user.isGM,
        };

        return renderTemplate(template ?? StrikeAttackRoll.CHAT_TEMPLATE, chatData);
    }
}
