import { DamageRoll } from "@system/damage/roll";
import { LocalizePF2e } from "@system/localize";
import { ErrorPF2e, htmlQuery, tupleHasValue } from "@util";
import { ChatContextFlag, CheckRollContextFlag } from "./data";
import { ChatMessagePF2e } from "./document";

function isCheckContextFlag(flag?: ChatContextFlag): flag is CheckRollContextFlag {
    return !!flag && !tupleHasValue(["damage-roll", "spell-cast"], flag.type);
}

async function applyDamageFromMessage({
    message,
    multiplier = 1,
    addend = 0,
    promptModifier = false,
    rollIndex = 0,
}: ApplyDamageFromMessageParams): Promise<void> {
    if (promptModifier) return shiftAdjustDamage(message, multiplier, rollIndex);

    const html = htmlQuery(ui.chat.element[0], `li.chat-message[data-message-id="${message.id}"]`);
    const tokens =
        html?.dataset.actorIsTarget && message.token
            ? [message.token]
            : canvas.tokens.controlled.filter((t) => !!t.actor).map((t) => t.document);
    if (tokens.length === 0) {
        const errorMsg = LocalizePF2e.translations.PF2E.UI.errorTargetToken;
        return ui.notifications.error(errorMsg);
    }

    const shieldBlockRequest = CONFIG.PF2E.chatDamageButtonShieldToggle;
    const roll = message.rolls.at(rollIndex);
    if (!(roll instanceof DamageRoll)) throw ErrorPF2e("Unexpected error retrieving damage roll");

    const damage = multiplier < 0 ? multiplier * roll.total + addend : roll.alter(multiplier, addend);

    for (const token of tokens) {
        await token.actor?.applyDamage({
            damage,
            token,
            skipIWR: multiplier <= 0,
            rollOptions: new Set(message.flags.pf2e.context?.options ?? []),
            shieldBlockRequest,
        });
    }
    toggleOffShieldBlock(message.id);
}

interface ApplyDamageFromMessageParams {
    message: ChatMessagePF2e;
    multiplier?: number;
    addend?: number;
    promptModifier?: boolean;
    rollIndex?: number;
}

function shiftAdjustDamage(message: ChatMessagePF2e, multiplier: number, rollIndex: number): void {
    new Dialog({
        title: game.i18n.localize("PF2E.UI.shiftModifyDamageTitle"),
        content: `<form>
                <div class="form-group">
                    <label>${game.i18n.localize("PF2E.UI.shiftModifyDamageLabel")}</label>
                    <input type="number" name="modifier" value="" placeholder="0">
                </div>
                </form>
                <script type="text/javascript">
                $(function () {
                    $(".form-group input").focus();
                });
                </script>`,
        buttons: {
            ok: {
                label: "Ok",
                callback: async ($dialog: JQuery) => {
                    // In case of healing, multipler will have negative sign. The user will expect that positive
                    // modifier would increase healing value, while negative would decrease.
                    const adjustment = (Number($dialog.find("[name=modifier]").val()) || 0) * Math.sign(multiplier);
                    applyDamageFromMessage({
                        message,
                        multiplier,
                        addend: adjustment,
                        promptModifier: false,
                        rollIndex,
                    });
                },
            },
        },
        default: "ok",
        close: () => {
            toggleOffShieldBlock(message.id);
        },
    }).render(true);
}

/** Toggle off the Shield Block button on a damage chat message */
function toggleOffShieldBlock(messageId: string): void {
    const $message = $(`#chat-log > li.chat-message[data-message-id="${messageId}"]`);
    const $button = $message.find("button.shield-block");
    $button.removeClass("shield-activated");
    CONFIG.PF2E.chatDamageButtonShieldToggle = false;
}

export { isCheckContextFlag, applyDamageFromMessage };
