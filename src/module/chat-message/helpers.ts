import { DamageRoll } from "@system/damage/roll.ts";
import { ErrorPF2e, htmlQuery, tupleHasValue } from "@util";
import { ChatContextFlag, CheckRollContextFlag } from "./data.ts";
import { ChatMessagePF2e } from "./document.ts";
import { extractEphemeralEffects } from "@module/rules/helpers.ts";

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
        return ui.notifications.error("PF2E.UI.errorTargetToken", { localize: true });
    }

    const shieldBlockRequest = CONFIG.PF2E.chatDamageButtonShieldToggle;
    const roll = message.rolls.at(rollIndex);
    if (!(roll instanceof DamageRoll)) throw ErrorPF2e("Unexpected error retrieving damage roll");

    const damage = multiplier < 0 ? multiplier * roll.total + addend : roll.alter(multiplier, addend);

    // Get origin roll options and apply damage to a contextual clone: this may influence condition IWR, for example
    const messageRollOptions = [...(message.flags.pf2e.context?.options ?? [])];
    const originRollOptions = messageRollOptions
        .filter((o) => o.startsWith("self:"))
        .map((o) => o.replace(/^self/, "origin"));

    for (const token of tokens) {
        if (!token.actor) continue;

        // If no target was acquired during a roll, set roll options for it during damage application
        if (!messageRollOptions.some((o) => o.startsWith("target"))) {
            messageRollOptions.push(...token.actor.getSelfRollOptions("target"));
        }
        const ephemeralEffects =
            multiplier > 0
                ? await extractEphemeralEffects({
                      affects: "target",
                      origin: message.actor,
                      target: token.actor,
                      item: message.item,
                      domains: ["damage-received"],
                      options: messageRollOptions,
                  })
                : [];
        const contextClone = token.actor.getContextualClone(originRollOptions, ephemeralEffects);
        const applicationRollOptions = new Set([
            ...messageRollOptions.filter((o) => !/^(?:self|target):/.test(o)),
            ...originRollOptions,
            ...contextClone.getSelfRollOptions(),
        ]);

        await contextClone.applyDamage({
            damage,
            token,
            item: message.item,
            skipIWR: multiplier <= 0,
            rollOptions: applicationRollOptions,
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
