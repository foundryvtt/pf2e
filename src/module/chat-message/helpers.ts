import type { ActorPF2e } from "@actor";
import { AbilityItemPF2e, FeatPF2e } from "@item";
import { extractEphemeralEffects } from "@module/rules/helpers.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { ErrorPF2e, getActionGlyph, htmlQuery, htmlQueryAll, traitSlugToObject, tupleHasValue } from "@util";
import type { ChatMessageFlags } from "types/foundry/common/documents/chat-message.d.ts";
import { ChatContextFlag, CheckContextChatFlag } from "./data.ts";
import { ChatMessagePF2e } from "./document.ts";

function isCheckContextFlag(flag?: ChatContextFlag): flag is CheckContextChatFlag {
    return !!flag && !tupleHasValue(["damage-roll", "spell-cast"], flag.type);
}

/** Create a message with collapsed action description and button to apply an effect */
async function createSelfEffectMessage(
    item: AbilityItemPF2e<ActorPF2e> | FeatPF2e<ActorPF2e>,
    rollMode: RollMode | "roll" = "roll",
): Promise<ChatMessagePF2e | null> {
    if (!item.system.selfEffect) {
        throw ErrorPF2e(
            [
                "Only actions with self-applied effects can be passed to `ActorPF2e#useAction`.",
                "Support will be expanded at a later time.",
            ].join(" "),
        );
    }

    const { actor, actionCost } = item;
    const token = actor.getActiveTokens(true, true).shift() ?? null;

    const speaker = ChatMessagePF2e.getSpeaker({ actor, token });
    const flavor = await renderTemplate("systems/pf2e/templates/chat/action/flavor.hbs", {
        action: { title: item.name, glyph: getActionGlyph(actionCost) },
        item,
        traits: item.system.traits.value.map((t) => traitSlugToObject(t, CONFIG.PF2E.actionTraits)),
    });

    // Get a preview slice of the message
    const previewLength = 100;
    const descriptionPreview = ((): string | null => {
        if (item.actor.pack) return null;
        const tempDiv = document.createElement("div");
        const documentTypes = [...CONST.DOCUMENT_LINK_TYPES, "Compendium", "UUID"];
        const linkPattern = new RegExp(`@(${documentTypes.join("|")})\\[([^#\\]]+)(?:#([^\\]]+))?](?:{([^}]+)})?`, "g");
        tempDiv.innerHTML = item.description.replace(linkPattern, (_match, ...args) => args[3]);

        return tempDiv.innerText.slice(0, previewLength);
    })();
    const description = {
        full: descriptionPreview && descriptionPreview.length < previewLength ? item.description : null,
        preview: descriptionPreview,
    };
    const content = await renderTemplate("systems/pf2e/templates/chat/action/self-effect.hbs", {
        actor: item.actor,
        description,
    });
    const flags: ChatMessageFlags = { pf2e: { context: { type: "self-effect", item: item.id } } };
    const messageData = ChatMessagePF2e.applyRollMode({ speaker, flavor, content, flags }, rollMode);

    return (await ChatMessagePF2e.create(messageData)) ?? null;
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
    const tokens = html?.dataset.actorIsTarget && message.token ? [message.token] : game.user.getActiveTokens();
    if (tokens.length === 0) {
        ui.notifications.error("PF2E.ErrorMessage.NoTokenSelected", { localize: true });
        return;
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
    const messageItem = message.item;
    const effectRollOptions = messageItem?.isOfType("affliction", "condition", "effect")
        ? messageItem.getRollOptions("item")
        : [];

    for (const token of tokens) {
        if (!token.actor) continue;
        // Add roll option for ally/enemy status
        if (token.actor.alliance && message.actor) {
            const allyOrEnemy = token.actor.alliance === message.actor.alliance ? "ally" : "enemy";
            messageRollOptions.push(`origin:${allyOrEnemy}`);
        }

        // If no target was acquired during a roll, set roll options for it during damage application
        if (!messageRollOptions.some((o) => o.startsWith("target"))) {
            messageRollOptions.push(...token.actor.getSelfRollOptions("target"));
        }
        const domain = multiplier > 0 ? "damage-received" : "healing-received";
        const ephemeralEffects =
            multiplier > 0
                ? await extractEphemeralEffects({
                      affects: "target",
                      origin: message.actor,
                      target: token.actor,
                      item: message.item,
                      domains: [domain],
                      options: messageRollOptions,
                  })
                : [];
        const contextClone = token.actor.getContextualClone(originRollOptions, ephemeralEffects);
        const rollOptions = new Set([
            ...messageRollOptions.filter((o) => !/^(?:self|target)(?::|$)/.test(o)),
            ...effectRollOptions,
            ...originRollOptions,
            ...contextClone.getSelfRollOptions(),
        ]);

        await contextClone.applyDamage({
            damage,
            token,
            item: message.item,
            skipIWR: multiplier <= 0,
            rollOptions,
            shieldBlockRequest,
            outcome: message.flags.pf2e.context?.outcome,
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

async function shiftAdjustDamage(message: ChatMessagePF2e, multiplier: number, rollIndex: number): Promise<void> {
    const content = await renderTemplate("systems/pf2e/templates/chat/damage/adjustment-dialog.hbs");
    const AdjustmentDialog = class extends Dialog {
        override activateListeners($html: JQuery): void {
            super.activateListeners($html);
            $html[0].querySelector("input")?.focus();
        }
    };
    const isHealing = multiplier < 0;
    new AdjustmentDialog({
        title: game.i18n.localize(isHealing ? "PF2E.UI.shiftModifyHealingTitle" : "PF2E.UI.shiftModifyDamageTitle"),
        content,
        buttons: {
            ok: {
                label: game.i18n.localize("PF2E.OK"),
                callback: async ($dialog: JQuery) => {
                    // In case of healing, multipler will have negative sign. The user will expect that positive
                    // modifier would increase healing value, while negative would decrease.
                    const adjustment = (Number($dialog[0].querySelector("input")?.value) || 0) * Math.sign(multiplier);
                    applyDamageFromMessage({
                        message,
                        multiplier,
                        addend: adjustment,
                        promptModifier: false,
                        rollIndex,
                    });
                },
            },
            cancel: {
                label: "Cancel",
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
    for (const app of ["#chat-log", "#chat-popout"]) {
        const selector = `${app} > li.chat-message[data-message-id="${messageId}"] button[data-action=shield-block]`;
        const button = htmlQuery(document.body, selector);
        button?.classList.remove("shield-activated");
    }
    CONFIG.PF2E.chatDamageButtonShieldToggle = false;
}

/**
 * Show or hide a clear-measured-template button on a message (applicable to spell cards with template-placed buttons).
 * The button will be shown if templates are placed and the user has ownership; otherwise it will be hidden.
 */
function toggleClearTemplatesButton(message: ChatMessagePF2e | null): void {
    if (!message || !canvas.ready) return;

    const selector = `li[data-message-id="${message.id}"] button[data-action=spell-template-clear]`;
    for (const chatLogDOM of htmlQueryAll(document.body, "#chat-log, #chat-popout")) {
        const clearTemplatesButton = htmlQuery(chatLogDOM, selector);
        if (!clearTemplatesButton) continue;
        const hasMeasuredTemplates = !!canvas.scene?.templates.some((t) => t.message === message && t.isOwner);
        clearTemplatesButton.classList.toggle("hidden", !hasMeasuredTemplates);
    }
}

export { applyDamageFromMessage, createSelfEffectMessage, isCheckContextFlag, toggleClearTemplatesButton };
