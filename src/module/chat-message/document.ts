import type { ActorPF2e } from "@actor";
import { StrikeData } from "@actor/data/base.ts";
import { ItemProxyPF2e, type ItemPF2e } from "@item";
import type { UserPF2e } from "@module/user/index.ts";
import type { ScenePF2e, TokenDocumentPF2e } from "@scene/index.ts";
import { InlineRollLinks } from "@scripts/ui/inline-roll-links.ts";
import { UserVisibilityPF2e } from "@scripts/ui/user-visibility.ts";
import { CheckRoll } from "@system/check/roll.ts";
import { DamageRoll } from "@system/damage/roll.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import { htmlQuery, htmlQueryAll, parseHTML } from "@util";
import { CriticalHitAndFumbleCards } from "./crit-fumble-cards.ts";
import type { AppliedDamageData, ChatMessageFlagsPF2e, ChatMessageSourcePF2e, ChatMessageSystemData } from "./data.ts";
import * as Listeners from "./listeners/index.ts";
import { RollInspector } from "./roll-inspector.ts";

class ChatMessagePF2e extends ChatMessage {
    /** The chat log doesn't wait for data preparation before rendering, so set some data in the constructor */
    constructor(data: DeepPartial<ChatMessageSourcePF2e> = {}, context: MessageConstructionContext = {}) {
        const expandedFlags = fu.expandObject<DeepPartial<ChatMessageFlagsPF2e>>(data.flags ?? {});
        data.flags = fu.mergeObject(expandedFlags, {
            core: { canPopout: expandedFlags.core?.canPopout ?? true },
            pf2e: {},
        });
        super(data, context);
    }

    /** Is this a damage (or a manually-inputed non-D20) roll? */
    get isDamageRoll(): boolean {
        const firstRoll = this.rolls.at(0);
        if (
            !firstRoll ||
            firstRoll.terms.some((t) => t instanceof foundry.dice.terms.FateDie || t instanceof foundry.dice.terms.Coin)
        ) {
            return false;
        }

        if (this.system.context?.type === "damage-roll") {
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
        const context = this.system.context;
        if (!context) return null;
        const targetUUID = "target" in context ? context.target?.token : null;
        if (!targetUUID) return null;

        const match = /^Scene\.(\w+)\.Token\.(\w+)$/.exec(targetUUID ?? "") ?? [];
        const scene = game.scenes.get(match[1] ?? "");
        const token = scene?.tokens.get(match[2] ?? "");
        const actor = token?.actor;

        return actor ? { actor, token } : null;
    }

    /** Get the `ChatMessageOriginData` for this chat message if available */
    get origin(): ChatMessageOriginData | null {
        return this.system.origin;
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
        const context = this.system.context;
        return !!context && "isReroll" in context && !!context.isReroll;
    }

    /** Does the message include a check that hasn't been rerolled? */
    get isRerollable(): boolean {
        const roll = this.rolls[0];
        return !!(
            this.actor?.isOwner &&
            (this.isAuthor || this.isOwner) &&
            roll instanceof CheckRoll &&
            roll.isRerollable
        );
    }

    /** Get the owned item associated with this chat message */
    get item(): ItemPF2e<ActorPF2e> | null {
        const actor = this.actor;
        if (this.system.context?.type === "self-effect") {
            const item = fromUuidSync(this.origin?.item ?? "") as ItemPF2e<ActorPF2e>;
            return item ?? null;
        }

        // If this is a strike, return the strike's weapon or unarmed attack
        const strike = this._strike;
        if (strike?.item) return strike.item;

        const context = this.system.context;
        const item = (() => {
            if (!context) return null;

            if (context.type === "spell-cast") {
                const embeddedSpell = context?.spellcasting?.embeddedSpell;
                if (actor && embeddedSpell) return new ItemProxyPF2e(embeddedSpell, { parent: actor });
            }
            return (fromUuidSync(this.origin?.item ?? "") as ItemPF2e<ActorPF2e>) ?? null;
        })();
        if (!item) return null;

        if (item?.isOfType("spell")) {
            if (context?.type !== "spell-cast") return item;
            const casting = context.spellcasting;
            if (!casting) return item;
            const entryId = casting.id;
            const overlayIds = casting.variant?.overlays;
            const castRank = casting.castRank ?? item.rank;
            const modifiedSpell = item.loadVariant({ overlayIds, castRank, entryId });
            return modifiedSpell ?? item;
        }

        return item;
    }

    /** If this message was for a strike, return the strike. Strikes will change in a future release */
    get _strike(): StrikeData | null {
        const actor = this.actor;

        // Get strike data from the roll identifier
        const roll = this.rolls.find((r): r is Rolled<CheckRoll> => r instanceof CheckRoll);
        const identifier =
            roll?.options.identifier ??
            htmlQuery(document.body, `li.message[data-message-id="${this.id}"] [data-identifier]`)?.dataset.identifier;
        const [itemId, slug, meleeOrRanged] = identifier?.split(".") ?? [null, null, null];
        if (!meleeOrRanged || !["melee", "ranged"].includes(meleeOrRanged)) {
            return null;
        }

        const strikeData = actor?.system.actions?.find((s) => s.slug === slug && s.item.id === itemId);
        const itemMeleeOrRanged = strikeData?.item.isMelee ? "melee" : "ranged";

        return meleeOrRanged === itemMeleeOrRanged
            ? strikeData ?? null
            : strikeData?.altUsages?.find((u) => {
                  const altUsageMeleeOrRanged = u.item.isMelee ? "melee" : "ranged";
                  return meleeOrRanged === altUsageMeleeOrRanged;
              }) ?? null;
    }

    async showDetails(): Promise<void> {
        if (!this.system.context) return;
        new RollInspector(this).render(true);
    }

    /** Get the token of the speaker if possible */
    get token(): TokenDocumentPF2e<ScenePF2e> | null {
        if (!game.scenes) return null; // In case we're in the middle of game setup
        const sceneId = this.speaker.scene ?? "";
        const tokenId = this.speaker.token ?? "";
        return game.scenes.get(sceneId)?.tokens.get(tokenId) ?? null;
    }

    static override migrateData(source: ChatMessageSourcePF2e): ChatMessageSourcePF2e {
        // Migrate old flags to system data (we need to either migrate this for real later, or drop support in a future release)
        const flags = source.flags.pf2e;
        if (flags?.appliedDamage) {
            source.system.appliedDamage = flags.appliedDamage as AppliedDamageData;
            flags.appliedDamage = undefined;
        }
        if (flags?.appliedDamage) {
            source.system.appliedDamage = flags.appliedDamage;
            flags.appliedDamage = undefined;
        }
        if (flags?.context) {
            source.system.context = flags.context;
            flags.context = undefined;
        }
        if (flags?.casting && flags?.origin && source.system.context?.type === "spell-cast") {
            source.system.context.spellcasting = {
                castRank: flags.origin.castRank ?? 1,
                id: flags.casting.id,
                tradition: flags.casting.tradition,
                variant: flags.origin.variant,
            };
            flags.casting = undefined;
        }
        if (flags.origin) {
            source.system.origin = {
                actor: flags.origin.actor ?? null,
                item: flags.origin.uuid,
                rollOptions: flags.origin.rollOptions,
            };
            flags.origin = undefined;
        }
        return super.migrateData(source) as ChatMessageSourcePF2e;
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        this.system.origin ??= null;

        // Handle deprecations
        Object.defineProperties(this.flags.pf2e, {
            appliedDamage: {
                get: () => {
                    const msg =
                        "You are accessing ChatMessagePF2e#flags#pf2e#appliedDamage which has been migrated to ChatMessagePF2e#system#appliedDamage";
                    foundry.utils.logCompatibilityWarning(msg, { since: "6.0.0", until: 7 });
                    return this.system.appliedDamage;
                },
                enumerable: false,
            },
            casting: {
                get: () => {
                    const msg =
                        "You are accessing ChatMessagePF2e#flags#pf2e#casting which has been migrated to ChatMessagePF2e#system#context#spellcasting";
                    foundry.utils.logCompatibilityWarning(msg, { since: "6.0.0", until: 7 });
                    return this.system.context?.type === "spell-cast" ? this.system.context.spellcasting : null;
                },
                enumerable: false,
            },
            context: {
                get: () => {
                    const msg =
                        "You are accessing ChatMessagePF2e#flags#pf2e#context which has been migrated to ChatMessagePF2e#system#context.";
                    foundry.utils.logCompatibilityWarning(msg, { since: "6.0.0", until: 7 });
                    return this.system.context;
                },
                enumerable: false,
            },
            origin: {
                get: () => {
                    const msg =
                        "You are accessing ChatMessagePF2e#flags#pf2e#origin which has been migrated to ChatMessagePF2e#system#origin.";
                    foundry.utils.logCompatibilityWarning(msg, { since: "6.0.0", until: 7 });
                    return this.system.origin;
                },
                enumerable: false,
            },
        });
    }

    override getRollData(): Record<string, unknown> {
        const { actor, item } = this;
        return { ...actor?.getRollData(), ...item?.getRollData() };
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    override async getHTML(): Promise<JQuery> {
        const { actor } = this;

        // Enrich flavor, which is skipped by upstream
        if (this.isContentVisible) {
            const rollData = this.getRollData();
            this.flavor = await TextEditorPF2e.enrichHTML(this.flavor, {
                async: true,
                rollData,
                processVisibility: false,
            });
        }

        const $html = await super.getHTML();
        const html = $html[0];
        if (!this.flags.pf2e.suppressDamageButtons && this.isDamageRoll) {
            // Mark each button group with the index in the message's `rolls` array
            htmlQueryAll(html, ".damage-application").forEach((buttons, index) => {
                buttons.dataset.rollIndex = index.toString();
            });
        }

        UserVisibilityPF2e.process(html, { message: this });
        await Listeners.DamageTaken.listen(this, html);
        CriticalHitAndFumbleCards.appendButtons(this, $html);
        Listeners.ChatCards.listen(this, html);
        InlineRollLinks.listen(html, this);
        Listeners.DegreeOfSuccessHighlights.listen(this, html);
        if (canvas.ready || !game.settings.get("core", "noCanvas")) {
            Listeners.SetAsInitiative.listen(this, html);
        }

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
                    ui.notifications.warn(message);
                    return;
                }

                condition.rollRecovery();
            });
        }

        // Remove revert damage button based on user permissions
        if (!this.system.appliedDamage?.isReverted) {
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

    protected override _onCreate(data: this["_source"], options: MessageModificationContextPF2e, userId: string): void {
        super._onCreate(data, options, userId);

        // Handle critical hit and fumble card drawing
        if (this.isRoll && game.pf2e.settings.critFumble.cards) {
            CriticalHitAndFumbleCards.handleDraw(this);
        }

        // If this is a rest notification, re-render sheet for anyone currently viewing it
        if (options.restForTheNight) this.actor?.render();
    }
}

interface ChatMessagePF2e extends ChatMessage {
    readonly _source: ChatMessageSourcePF2e;
    flags: ChatMessageFlagsPF2e;
    system: ChatMessageSystemData;

    get user(): UserPF2e;
}

declare namespace ChatMessagePF2e {
    function createDocuments<TDocument extends foundry.abstract.Document>(
        this: ConstructorOf<TDocument>,
        data?: (TDocument | PreCreate<TDocument["_source"]>)[],
        context?: MessageModificationContextPF2e,
    ): Promise<TDocument[]>;

    function getSpeakerActor(speaker: foundry.documents.ChatSpeakerData): ActorPF2e | null;
}

interface MessageModificationContextPF2e extends ChatMessageModificationContext {
    /** Whether this is a Rest for the Night message */
    restForTheNight?: boolean;
}

export { ChatMessagePF2e };
