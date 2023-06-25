import { ActorPF2e } from "@actor";
import { StrikeData } from "@actor/data/base.ts";
import { ItemPF2e, ItemProxyPF2e } from "@item";
import { TrickMagicItemEntry, traditionSkills } from "@item/spellcasting-entry/trick.ts";
import { UserPF2e } from "@module/user/index.ts";
import { ScenePF2e, TokenDocumentPF2e } from "@scene/index.ts";
import { InlineRollLinks } from "@scripts/ui/inline-roll-links.ts";
import { UserVisibilityPF2e } from "@scripts/ui/user-visibility.ts";
import { CheckRoll } from "@system/check/index.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { htmlQuery, htmlQueryAll, parseHTML } from "@util";
import { ChatRollDetails } from "./chat-roll-details.ts";
import { CriticalHitAndFumbleCards } from "./crit-fumble-cards.ts";
import { ChatMessageFlagsPF2e, ChatMessageSourcePF2e, StrikeLookupData } from "./data.ts";
import * as Listeners from "./listeners/index.ts";

class ChatMessagePF2e extends ChatMessage {
    /** The chat log doesn't wait for data preparation before rendering, so set some data in the constructor */
    constructor(data: DeepPartial<ChatMessageSourcePF2e> = {}, context: DocumentConstructionContext<null> = {}) {
        data.flags = mergeObject(expandObject(data.flags ?? {}), { core: {}, pf2e: {} });
        super(data, context);

        // Backward compatibility for roll messages prior to `rollerId` (user ID) being stored with the roll
        for (const roll of this.rolls) {
            if (roll instanceof CheckRoll) {
                roll.roller ??= this.user ?? null;
            }
        }
    }

    /** Is this a damage (or a manually-inputed non-D20) roll? */
    get isDamageRoll(): boolean {
        const firstRoll = this.rolls.at(0);
        if (!firstRoll || firstRoll.terms.some((t) => t instanceof FateDie || t instanceof Coin)) {
            return false;
        }

        if (this.flags.pf2e.context?.type === "damage-roll") {
            return true;
        }

        const isCheck = firstRoll instanceof CheckRoll || firstRoll.dice[0]?.faces === 20;
        const fromRollTable = !!this.flags.core.RollTable;
        return !(isCheck || fromRollTable);
    }

    /** Get the actor associated with this chat message */
    get actor(): ActorPF2e | null {
        return ChatMessagePF2e.getSpeakerActor(this.speaker);
    }

    /** If this is a check or damage roll, it will have target information */
    get target(): { actor: ActorPF2e; token: TokenDocumentPF2e<ScenePF2e> } | null {
        const context = this.flags.pf2e.context;
        if (!context) return null;
        const targetUUID = "target" in context ? context.target?.token : null;
        if (!targetUUID) return null;

        const match = /^Scene\.(\w+)\.Token\.(\w+)$/.exec(targetUUID ?? "") ?? [];
        const scene = game.scenes.get(match[1] ?? "");
        const token = scene?.tokens.get(match[2] ?? "");
        const actor = token?.actor;

        return actor ? { actor, token } : null;
    }

    /** If the message came from dynamic inline content in a journal entry, the entry's ID may be used to retrieve it */
    get journalEntry(): JournalEntry | null {
        const uuid = this.flags.pf2e.journalEntry;
        if (!uuid) return null;

        const entryId = /^JournalEntry.([A-Za-z0-9]{16})$/.exec(uuid)?.at(1);
        return game.journal.get(entryId ?? "") ?? null;
    }

    /** Does this message include a check (1d20 + c) roll? */
    get isCheckRoll(): boolean {
        return this.rolls[0] instanceof CheckRoll;
    }

    /** Does the message include a rerolled check? */
    get isReroll(): boolean {
        const context = this.flags.pf2e.context;
        return !!context && "isReroll" in context && !!context.isReroll;
    }

    /** Does the message include a check that hasn't been rerolled? */
    get isRerollable(): boolean {
        const roll = this.rolls[0];
        return !!(
            this.actor?.isOwner &&
            this.canUserModify(game.user, "update") &&
            roll instanceof CheckRoll &&
            roll.isRerollable
        );
    }

    /** Get the owned item associated with this chat message */
    get item(): ItemPF2e<ActorPF2e> | null {
        // If this is a strike, we usually want the strike's item
        const strike = this._strike;
        if (strike?.item) return strike.item;

        const item = (() => {
            const domItem = this.getItemFromDOM();
            if (domItem) return domItem;

            const origin = this.flags.pf2e?.origin ?? null;
            const match = /Item\.(\w+)/.exec(origin?.uuid ?? "") ?? [];
            return this.actor?.items.get(match?.[1] ?? "") ?? null;
        })();
        if (!item) return null;

        // Assign spellcasting entry, currently only used for trick magic item
        const { tradition } = this.flags.pf2e?.casting ?? {};
        const isCharacter = item.actor.isOfType("character");
        if (tradition && item.isOfType("spell") && !item.spellcasting && isCharacter) {
            const trick = new TrickMagicItemEntry(item.actor, traditionSkills[tradition]);
            item.trickMagicEntry = trick;
        }

        if (item?.isOfType("spell")) {
            const overlayIds = this.flags.pf2e.origin?.variant?.overlays;
            const castLevel = this.flags.pf2e.origin?.castLevel ?? item.level;
            const modifiedSpell = item.loadVariant({ overlayIds, castLevel });
            return modifiedSpell ?? item;
        }

        return item;
    }

    /** If this message was for a strike, return the strike. Strikes will change in a future release */
    get _strike(): StrikeData | null {
        const { actor } = this;
        if (!actor?.system.actions) return null;

        // Get the strike index from either the flags or the DOM. In the case of roll macros, it's in the DOM
        const strikeData = ((): Pick<StrikeLookupData, "index" | "altUsage"> | null => {
            if (this.flags.pf2e.strike) return this.flags.pf2e.strike;
            const messageHTML = htmlQuery(ui.chat.element[0], `li[data-message-id="${this.id}"]`);
            const chatCard = htmlQuery(messageHTML, ".chat-card");
            const index = chatCard?.dataset.strikeIndex === undefined ? null : Number(chatCard?.dataset.strikeIndex);
            return typeof index === "number" ? { index } : null;
        })();

        if (strikeData) {
            const { index, altUsage } = strikeData;
            const action = actor.system.actions.at(index) ?? null;
            return altUsage
                ? action?.altUsages?.find((w) => (altUsage === "thrown" ? w.item.isThrown : w.item.isMelee)) ?? null
                : action;
        }

        return null;
    }

    /** Get stringified item source from the DOM-rendering of this chat message */
    getItemFromDOM(): ItemPF2e<ActorPF2e> | null {
        const html = ui.chat.element[0];
        const messageElem = htmlQuery(html, `#chat-log > li[data-message-id="${this.id}"]`);
        const sourceString = htmlQuery(messageElem, ".pf2e.item-card")?.dataset.embeddedItem ?? "null";
        try {
            const itemSource = JSON.parse(sourceString);
            const item = itemSource
                ? new ItemProxyPF2e(itemSource, {
                      parent: this.actor,
                      fromConsumable: this.flags?.pf2e?.isFromConsumable,
                  })
                : null;
            return item as ItemPF2e<ActorPF2e> | null;
        } catch (_error) {
            return null;
        }
    }

    async showDetails(): Promise<void> {
        if (!this.flags.pf2e.context) return;
        new ChatRollDetails(this).render(true);
    }

    /** Get the token of the speaker if possible */
    get token(): TokenDocumentPF2e<ScenePF2e> | null {
        if (!game.scenes) return null;
        const sceneId = this.speaker.scene ?? "";
        const tokenId = this.speaker.token ?? "";
        return game.scenes.get(sceneId)?.tokens.get(tokenId) ?? null;
    }

    override getRollData(): Record<string, unknown> {
        const { actor, item } = this;
        return { ...actor?.getRollData(), ...item?.getRollData() };
    }

    override async getHTML(): Promise<JQuery> {
        const { actor } = this;

        // Enrich flavor, which is skipped by upstream
        if (this.isContentVisible) {
            const rollData = this.getRollData();
            this.flavor = await TextEditor.enrichHTML(this.flavor, { async: true, rollData });
        }

        const $html = await super.getHTML();
        const html = $html[0]!;
        if (!this.flags.pf2e.suppressDamageButtons && this.isDamageRoll) {
            // Mark each button group with the index in the message's `rolls` array
            htmlQueryAll(html, ".damage-application").forEach((buttons, index) => {
                buttons.dataset.rollIndex = index.toString();
            });
        }

        await Listeners.DamageTaken.listen(this, html);
        CriticalHitAndFumbleCards.appendButtons(this, $html);
        Listeners.ChatCards.listen($html);
        InlineRollLinks.listen(html, this);
        Listeners.DegreeOfSuccessHighlights.listen(this, html);
        Listeners.MessageTooltips.listen($html);
        if (canvas.ready) Listeners.SetAsInitiative.listen($html);

        // Add persistent damage recovery button and listener (if evaluating persistent)
        const roll = this.rolls[0];
        if (actor?.isOwner && roll instanceof DamageRoll && roll.options.evaluatePersistent) {
            const damageType = roll.instances.find((i) => i.persistent)?.type;
            const condition = damageType ? this.actor?.getCondition(`persistent-damage-${damageType}`) : null;
            if (condition) {
                const template = "systems/pf2e/templates/chat/persistent-damage-recovery.hbs";
                const section = parseHTML(await renderTemplate(template));
                html.querySelector(".message-content")?.append(section);
                html.dataset.actorIsTarget = "true";
            }

            htmlQuery(html, "[data-action=recover-persistent-damage]")?.addEventListener("click", () => {
                const { actor } = this;
                if (!actor) return;

                const damageType = roll.instances.find((i) => i.persistent)?.type;
                if (!damageType) return;

                const condition = actor.getCondition(`persistent-damage-${damageType}`);
                if (!condition?.system.persistent) {
                    const damageTypeLocalized = game.i18n.localize(CONFIG.PF2E.damageTypes[damageType] ?? damageType);
                    const message = game.i18n.format("PF2E.Item.Condition.PersistentDamage.Error.DoesNotExist", {
                        damageType: damageTypeLocalized,
                    });
                    return ui.notifications.warn(message);
                }

                condition.rollRecovery();
            });
        }

        // Remove revert damage button based on user permissions
        const appliedDamageFlag = this.flags.pf2e.appliedDamage;
        if (!appliedDamageFlag?.isReverted) {
            if (!this.actor?.isOwner) {
                htmlQuery(html, "button[data-action=revert-damage]")?.remove();
            }
        }

        html.addEventListener("mouseenter", (event) => this.#onHoverIn(event));
        html.addEventListener("mouseleave", (event) => this.#onHoverOut(event));

        UserVisibilityPF2e.processMessageSender(this, html);
        if (!actor && this.content) UserVisibilityPF2e.process(html, { document: this });

        return $html;
    }

    /** Highlight the message's corresponding token on the canvas */
    #onHoverIn(nativeEvent: MouseEvent | PointerEvent): void {
        if (!canvas.ready) return;
        const token = this.token?.object;
        if (token?.isVisible && !token.controlled) {
            token.emitHoverIn(nativeEvent);
        }
    }

    /** Remove the token highlight */
    #onHoverOut(nativeEvent: MouseEvent | PointerEvent): void {
        if (canvas.ready) this.token?.object?.emitHoverOut(nativeEvent);
    }

    protected override _onCreate(
        data: this["_source"],
        options: DocumentModificationContext<null>,
        userId: string
    ): void {
        super._onCreate(data, options, userId);

        // Handle critical hit and fumble card drawing
        if (this.isRoll && game.settings.get("pf2e", "drawCritFumble")) {
            CriticalHitAndFumbleCards.handleDraw(this);
        }
    }
}

interface ChatMessagePF2e extends ChatMessage {
    readonly _source: ChatMessageSourcePF2e;
    flags: ChatMessageFlagsPF2e;

    get user(): UserPF2e;
}

declare namespace ChatMessagePF2e {
    function getSpeakerActor(speaker: foundry.documents.ChatSpeakerData): ActorPF2e | null;
}

export { ChatMessagePF2e };
