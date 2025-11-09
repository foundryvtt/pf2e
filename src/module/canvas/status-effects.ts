import type { ActorPF2e } from "@actor";
import { resetActors } from "@actor/helpers.ts";
import type { PlaceableHUDContext } from "@client/applications/hud/placeable-hud.d.mts";
import { PersistentDamageEditor } from "@item/condition/persistent-damage-editor.ts";
import { ConditionSlug } from "@item/condition/types.ts";
import { CONDITION_SLUGS } from "@item/condition/values.ts";
import type { TokenPF2e } from "@module/canvas/token/index.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import type { EncounterPF2e } from "@module/encounter/index.ts";
import type { TokenDocumentPF2e } from "@scene";
import { StatusEffectIconTheme } from "@scripts/config/index.ts";
import { TextEditorPF2e } from "@system/text-editor.ts";
import { createHTMLElement, fontAwesomeIcon, htmlQueryAll, objectHasKey, setHasElement } from "@util";
import * as R from "remeda";

const debouncedRender = fu.debounce(() => {
    canvas.tokens.hud.render();
}, 20);

/** Handle interaction with the TokenHUD's status effects menu */
export class StatusEffects {
    /** The ID of the last token processed following an encounter update */
    static #lastCombatantToken: string | null = null;

    static readonly #ICON_THEME_DIRS: Record<StatusEffectIconTheme, string> = {
        default: "systems/pf2e/icons/conditions/",
        blackWhite: "systems/pf2e/icons/conditions-2/",
    };

    static #conditionSummaries: Record<ConditionSlug, { name: string; rules: string; summary: string }> | null = null;

    /** Set the theme for condition icons on tokens */
    static initialize(): void {
        const iconTheme = game.settings.get("pf2e", "statusEffectType");
        CONFIG.controlIcons.defeated = game.settings.get("pf2e", "deathIcon");
        CONFIG.PF2E.statusEffects.lastIconTheme = iconTheme;
        CONFIG.PF2E.statusEffects.iconDir = this.#ICON_THEME_DIRS[iconTheme];
        this.#updateStatusIcons();
    }

    /** Update status icons and tokens due to certain potential changes */
    static reset(): void {
        CONFIG.controlIcons.defeated = game.settings.get("pf2e", "deathIcon");
        this.#updateStatusIcons();
        this.refresh();
    }

    static get conditions(): Record<ConditionSlug, { name: string; rules: string; summary: string }> {
        return (this.#conditionSummaries ??= R.mapToObj(Array.from(CONDITION_SLUGS), (s) => [
            s,
            {
                name: game.i18n.localize(`PF2E.condition.${s}.name`),
                rules: game.i18n.localize(`PF2E.condition.${s}.rules`),
                summary: game.i18n.localize(`PF2E.condition.${s}.summary`),
            },
        ]));
    }

    /**
     * If the system setting statusEffectType is changed, we need to upgrade CONFIG
     * And migrate all statusEffect URLs of all Tokens
     */
    static async migrateStatusEffectUrls(chosenSetting: StatusEffectIconTheme): Promise<void> {
        console.debug("PF2e System | Changing status effect icon types");
        const iconDir = this.#ICON_THEME_DIRS[chosenSetting];
        CONFIG.PF2E.statusEffects.iconDir = iconDir;
        CONFIG.PF2E.statusEffects.lastIconTheme = chosenSetting;
        this.#updateStatusIcons();
        await resetActors();
        if (canvas.ready) {
            for (const token of canvas.tokens.placeables) {
                token.drawEffects();
            }
        }
    }

    static #activateListeners(html: HTMLElement): void {
        // Mouse actions
        for (const control of htmlQueryAll(html, ".effect-control")) {
            control.addEventListener("click", (event) => {
                this.#setStatusValue(control, event);
            });
            control.addEventListener("contextmenu", (event) => {
                this.#setStatusValue(control, event);
            });

            control.addEventListener("mouseover", () => {
                this.#showStatusLabel(control);
            });
            control.addEventListener("mouseout", () => {
                this.#showStatusLabel(control);
            });
        }
    }

    /** Updates the core CONFIG.statusEffects with the new icons */
    static #updateStatusIcons(): void {
        const iconTheme = game.settings.get("pf2e", "statusEffectType");
        const directory = iconTheme === "default" ? "conditions" : "conditions-2";
        CONFIG.statusEffects = Object.entries(CONFIG.PF2E.statusEffects.conditions).map(([id, name]) => ({
            id,
            name,
            img: `systems/pf2e/icons/${directory}/${id}.webp` as const,
        }));
        CONFIG.statusEffects.push({
            id: "dead",
            name: "PF2E.Actor.Dead",
            img: CONFIG.controlIcons.defeated,
        });
    }

    static async onRenderTokenHUD(html: HTMLElement, tokenData: PlaceableHUDContext): Promise<void> {
        const token = canvas.tokens.get(tokenData._id ?? "");
        if (!token) return;

        const iconGrid = html.querySelector<HTMLElement>(".status-effects");
        if (!iconGrid) return; // throw ErrorPF2e("Unexpected error retrieving status effects grid");

        const affectingConditions = token.actor?.conditions.active.filter((c) => c.isInHUD) ?? [];

        const titleBar = document.createElement("div");
        titleBar.className = "title-bar";
        iconGrid.append(titleBar);

        const statusIcons = iconGrid.querySelectorAll<HTMLImageElement>(".effect-control");
        const deathIcon = game.settings.get("pf2e", "deathIcon");

        for (const icon of statusIcons) {
            // Replace the img element with anchor element, which can display ::after content
            const newImg = document.createElement("img");
            newImg.src = icon.src;
            const anchor = createHTMLElement("a", {
                classes: ["effect-control"],
                dataset: { ...icon.dataset },
                children: [newImg],
            });
            delete anchor.dataset.action;
            icon.replaceWith(anchor);

            const slug = anchor.dataset.statusId ?? "";

            // Show hidden for broken for loot/vehicles and hidden for all others
            const actorType = token.actor?.type ?? "";
            const hideIcon =
                (slug === "hidden" && ["loot", "vehicle"].includes(actorType)) ||
                (slug === "broken" && !["loot", "vehicle"].includes(actorType));
            if (hideIcon) anchor.style.display = "none";

            const affecting = affectingConditions.filter((c) => c.slug === slug);
            if (affecting.length > 0 || (icon.src === deathIcon && token.actor?.statuses.has("dead"))) {
                anchor.classList.add("active");
            }

            if (affecting.length > 0) {
                // Show a badge icon if the condition has a value or is locked
                const isOverridden = affecting.every((c) => c.system.references.overriddenBy.length > 0);
                const isLocked = affecting.every((c) => c.isLocked);
                const hasValue = affecting.some((c) => c.value);

                if (isOverridden) {
                    anchor.classList.add("overridden");
                    const badge = fontAwesomeIcon("angle-double-down");
                    badge.classList.add("badge");
                    anchor.append(badge);
                } else if (isLocked) {
                    anchor.classList.add("locked");
                    const badge = fontAwesomeIcon("lock");
                    badge.classList.add("badge");
                    anchor.append(badge);
                } else if (hasValue) {
                    anchor.classList.add("valued");
                    const value = Math.max(...affecting.map((c) => c.value ?? 1)).toString();
                    const badge = createHTMLElement("i", { classes: ["badge"], children: [value] });
                    anchor.append(badge);
                }
            }
        }

        this.#activateListeners(iconGrid);
    }

    /** Called by `EncounterPF2e#_onUpdate` */
    static onUpdateEncounter(encounter: EncounterPF2e): void {
        if (!(game.user.isGM && game.settings.get("pf2e", "statusEffectShowCombatMessage"))) return;

        if (!encounter.started) {
            this.#lastCombatantToken = null;
            return;
        }

        const { combatant } = encounter;
        const token = combatant?.token;
        if (!(combatant && token)) return;

        if (token.id !== this.#lastCombatantToken && typeof combatant.initiative === "number" && !combatant.defeated) {
            this.#lastCombatantToken = token.id;
            this.#createChatMessage(token, combatant.hidden);
        }
    }

    /** Show the Status Effect name and summary on mouseover of the token HUD */
    static #showStatusLabel(control: HTMLElement): void {
        const titleBar = control.closest(".status-effects")?.querySelector<HTMLElement>(".title-bar");
        if (titleBar && control.title) {
            titleBar.innerText = control.title;
            titleBar.classList.toggle("active");
        }
    }

    /**
     * A click event handler to increment or decrement valued conditions.
     * @param event The window click event
     */
    static async #setStatusValue(control: HTMLElement, event: PointerEvent): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        const slug = control.dataset.statusId;
        if (!setHasElement(CONDITION_SLUGS, slug) && slug !== "dead") {
            return;
        }

        const tokensAndActors = R.uniqueBy(
            canvas.tokens.controlled
                .map((t): [TokenPF2e, ActorPF2e] | null => (t.actor ? [t, t.actor] : null))
                .filter(R.isTruthy),
            ([, a]) => a,
        );
        for (const [token, actor] of tokensAndActors) {
            // Persistent damage goes through a dialog instead
            if (slug === "persistent-damage") {
                new PersistentDamageEditor({ actor }).render({ force: true });
                continue;
            }

            const condition = actor.conditions
                .bySlug(slug, { temporary: false })
                .sort((a, b) => Number(b.active) - Number(a.active))
                .find((c) => c.isInHUD && !c.system.references.parent);

            if (event.type === "click") {
                if (typeof condition?.value === "number") {
                    game.pf2e.ConditionManager.updateConditionValue(condition.id, token, condition.value + 1);
                } else if (objectHasKey(CONFIG.PF2E.conditionTypes, slug)) {
                    actor.increaseCondition(slug);
                } else {
                    this.#toggleStatus(token, control, event);
                }
            } else if (event.type === "contextmenu") {
                // Remove or decrement condition
                if (event.ctrlKey && slug !== "dead") {
                    // Remove all conditions
                    const conditionIds = actor.conditions.bySlug(slug, { temporary: false }).map((c) => c.id);
                    actor.deleteEmbeddedDocuments("Item", conditionIds);
                } else if (condition?.value) {
                    game.pf2e.ConditionManager.updateConditionValue(condition.id, token, condition.value - 1);
                } else {
                    this.#toggleStatus(token, control, event);
                }
            }
        }
    }

    static async #toggleStatus(token: TokenPF2e, control: HTMLElement, event: PointerEvent): Promise<void> {
        const { actor } = token;
        if (!actor) return;

        const slug = control.dataset.statusId ?? "";
        if (!setHasElement(CONDITION_SLUGS, slug) && slug !== "dead") {
            return;
        }

        const affecting = actor?.conditions
            .bySlug(slug, { active: true, temporary: false })
            .find((c) => !c.system.references.parent);
        const conditionIds: string[] = [];

        if (event.type === "click" && !affecting) {
            if (objectHasKey(CONFIG.PF2E.conditionTypes, slug)) {
                const newCondition = game.pf2e.ConditionManager.getCondition(slug).toObject();
                await token.actor?.createEmbeddedDocuments("Item", [newCondition]);
            } else if (slug === "dead") {
                await token.actor?.toggleStatusEffect(slug, { overlay: true });
            }
        } else if (event.type === "contextmenu") {
            if (affecting) conditionIds.push(affecting.id);

            if (conditionIds.length > 0) {
                await token.actor?.deleteEmbeddedDocuments("Item", conditionIds);
            }
        }
    }

    /** Create a ChatMessage with the actor's current conditions. */
    static async #createChatMessage(token: TokenDocumentPF2e | null, whisper = false): Promise<Maybe<ChatMessagePF2e>> {
        if (!token?.actor) return null;

        const conditions = await Promise.all(
            token.actor.conditions.active.map(async (c) => ({
                ...R.pick(c, ["name", "img"]),
                description: await TextEditorPF2e.enrichHTML(c.description),
            })),
        );
        if (conditions.length === 0) return null;

        const templatePath = "systems/pf2e/templates/chat/participant-conditions.hbs";
        const content = await fa.handlebars.renderTemplate(templatePath, { conditions });
        const messageSource: Partial<foundry.documents.ChatMessageSource> = {
            author: game.user.id,
            speaker: ChatMessagePF2e.getSpeaker({ token }),
            content,
            style: CONST.CHAT_MESSAGE_STYLES.OTHER,
        };
        const isNPCEvent = !token.actor?.hasPlayerOwner;
        const whisperMessage = whisper || (isNPCEvent && game.settings.get("pf2e", "metagame_secretCondition"));
        if (whisperMessage) {
            messageSource.whisper = ChatMessage.getWhisperRecipients("GM").map((u) => u.id);
        }

        return ChatMessagePF2e.create(messageSource);
    }

    /** Re-render the token HUD */
    static refresh(): void {
        if (canvas.ready && canvas.tokens.hud.rendered) {
            debouncedRender();
        }
    }
}
