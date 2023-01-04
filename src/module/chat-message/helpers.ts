import { DamageRoll } from "@system/damage/roll";
import { LocalizePF2e } from "@system/localize";
import { ErrorPF2e, tupleHasValue } from "@util";
import { ChatContextFlag, CheckRollContextFlag } from "./data";
import { ChatMessagePF2e } from "./document";

function isCheckContextFlag(flag?: ChatContextFlag): flag is CheckRollContextFlag {
    return !!flag && !tupleHasValue(["damage-roll", "spell-cast"], flag.type);
}

async function applyDamageFromMessage(
    message: ChatMessagePF2e,
    multiplier = 1,
    addend = 0,
    promptModifier = false
): Promise<void> {
    if (promptModifier) return shiftModifyDamage(message, multiplier);

    const tokens = canvas.tokens.controlled.filter((token) => !!token.actor);
    if (tokens.length === 0) {
        const errorMsg = LocalizePF2e.translations.PF2E.UI.errorTargetToken;
        ui.notifications.error(errorMsg);
        return;
    }

    const shieldBlockRequest = CONFIG.PF2E.chatDamageButtonShieldToggle;
    const roll = message.rolls.find((r): r is Rolled<DamageRoll> => r instanceof DamageRoll);
    if (!roll) throw ErrorPF2e("Unexpected error retrieving damage roll");

    for (const token of tokens) {
        await token.actor?.applyDamage({
            damage: roll.alter(multiplier, addend),
            token: token.document,
            skipIWR: multiplier <= 0,
            rollOptions: new Set(message.flags.pf2e.context?.options ?? []),
            shieldBlockRequest,
        });
    }
    toggleOffShieldBlock(message.id);
}

function shiftModifyDamage(message: ChatMessagePF2e, multiplier: number): void {
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
                    applyDamageFromMessage(message, multiplier, adjustment);
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
