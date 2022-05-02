import { CheckRoll, CheckRollJSON } from "../roll";

export class StrikeAttackRoll extends CheckRoll {
    static override CHAT_TEMPLATE = "systems/pf2e/templates/chat/check/strike/attack-roll.html";

    override async render(this: Rolled<StrikeAttackRoll>, options: RollRenderOptions = {}): Promise<string> {
        if (!this._evaluated) await this.evaluate({ async: true });
        const { isPrivate, flavor, template } = options;
        const chatData: Record<string, unknown> = {
            formula: isPrivate ? "???" : this._formula,
            flavor: isPrivate ? null : flavor,
            user: game.user.id,
            tooltip: isPrivate ? "" : await this.getTooltip(),
            total: isPrivate ? "?" : Math.round(this.total * 100) / 100,
            strike: this.data.strike,
            degree: this.data.degreeOfSuccess,
            canRollDamage: this.roller === game.user || game.user.isGM,
        };

        return renderTemplate(template ?? StrikeAttackRoll.CHAT_TEMPLATE, chatData);
    }

    override toJSON(): CheckRollJSON {
        const data = super.toJSON();
        if (this.data.strike) {
            data.data = mergeObject(data.data ?? {}, {
                strike: this.data.strike,
                degreeOfSuccess: this.data.degreeOfSuccess,
            });
        }

        return data;
    }
}
