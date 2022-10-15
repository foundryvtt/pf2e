import { LocalizePF2e } from "@system/localize";
import { StatusEffectIconTheme } from "@scripts/config";
import { ErrorPF2e, fontAwesomeIcon, objectHasKey } from "@util";
import { TokenPF2e } from "@module/canvas/token";
import { EncounterPF2e } from "@module/encounter";
import { ChatMessagePF2e } from "@module/chat-message";
import { TokenDocumentPF2e } from "@scene";

/** Handle interaction with the TokenHUD's status effects menu */
export class StatusEffects {
    /** The ID of the last token processed following an encounter update */
    static #lastCombatantToken: string | null = null;

    static readonly #ICON_THEME_DIRS: Record<StatusEffectIconTheme, string> = {
        default: "systems/pf2e/icons/conditions/",
        blackWhite: "systems/pf2e/icons/conditions-2/",
    };

    /** Set the theme for condition icons on tokens */
    static setIconTheme(): void {
        const iconTheme = game.settings.get("pf2e", "statusEffectType");
        CONFIG.PF2E.statusEffects.lastIconTheme = iconTheme;
        CONFIG.PF2E.statusEffects.iconDir = this.#ICON_THEME_DIRS[iconTheme];
        this.#updateStatusIcons();
    }

    /** Link status effect icons to conditions */
    static initialize(): void {
        console.debug("PF2e System | Initializing Status Effects handler");
        const iconTheme = game.settings.get("pf2e", "statusEffectType");
        CONFIG.PF2E.statusEffects.lastIconTheme = iconTheme;
        CONFIG.PF2E.statusEffects.iconDir = this.#ICON_THEME_DIRS[iconTheme];
        this.#updateStatusIcons();
    }

    static get conditions() {
        return LocalizePF2e.translations.PF2E.condition;
    }

    /**
     * If the system setting statusEffectType is changed, we need to upgrade CONFIG
     * And migrate all statusEffect URLs of all Tokens
     */
    static async migrateStatusEffectUrls(chosenSetting: StatusEffectIconTheme): Promise<void> {
        console.debug("PF2e System | Changing status effect icon types");
        const iconDir = this.#ICON_THEME_DIRS[chosenSetting];
        const lastIconDir = this.#ICON_THEME_DIRS[CONFIG.PF2E.statusEffects.lastIconTheme];

        const promises: Promise<TokenDocument[]>[] = [];
        for (const scene of game.scenes) {
            const tokenUpdates: EmbeddedDocumentUpdateData<TokenDocumentPF2e>[] = [];

            for (const token of scene.tokens) {
                const update = token.toObject(false);
                for (const url of token.effects) {
                    if (url.includes(lastIconDir)) {
                        const slug = /([-\w]+)\./.exec(url)?.[1] ?? "";
                        const newUrl = `${iconDir}${slug}.webp` as const;
                        console.debug(
                            `PF2e System | Migrating effect ${slug} of Token ${token.name} on scene ${scene.name} | "${url}" to "${newUrl}"`
                        );
                        const index = update.effects.indexOf(url);
                        if (index !== -1) {
                            update.effects.splice(index, 1, newUrl);
                        }
                    }
                }
                tokenUpdates.push(update);
            }
            promises.push(scene.updateEmbeddedDocuments("Token", tokenUpdates));
        }
        await Promise.all(promises);

        CONFIG.PF2E.statusEffects.iconDir = iconDir;
        CONFIG.PF2E.statusEffects.lastIconTheme = chosenSetting;
        this.#updateStatusIcons();
    }

    static #activateListeners(html: HTMLElement, token: TokenPF2e): void {
        // Status Effects Controls
        const effectControls = html.querySelectorAll<HTMLPictureElement>(".effect-control");

        for (const control of effectControls) {
            control.addEventListener("click", (event) => {
                this.#setStatusValue(event, token);
            });
            control.addEventListener("contextmenu", (event) => {
                this.#setStatusValue(event, token);
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
        CONFIG.statusEffects = Object.entries(CONFIG.PF2E.statusEffects.conditions).map(([id, label]) => ({
            id,
            label,
            icon: `systems/pf2e/icons/${directory}/${id}.webp` as const,
        }));
        CONFIG.statusEffects.push({
            id: "dead",
            label: "PF2E.Actor.Dead",
            icon: CONFIG.controlIcons.defeated as ImagePath,
        });
    }

    static async onRenderTokenHUD(html: HTMLElement, tokenData: TokenHUDData): Promise<void> {
        const token = canvas.tokens.get(tokenData._id);
        if (!token) return;

        const iconGrid = html.querySelector<HTMLElement>(".status-effects");
        if (!iconGrid) throw ErrorPF2e("Unexpected error retrieving status effects grid");

        const affectingConditions = token.actor?.itemTypes.condition.filter((condition) => condition.isInHUD) ?? [];

        const titleBar = document.createElement("div");
        titleBar.className = "title-bar";
        iconGrid.append(titleBar);

        const statusIcons = iconGrid.querySelectorAll<HTMLImageElement>(".effect-control");

        for (const icon of statusIcons) {
            // Replace the img element with a picture element, which can display ::after content
            const picture = document.createElement("picture");
            picture.classList.add("effect-control");
            picture.dataset.statusId = icon.dataset.statusId;
            picture.title = icon.title;
            const iconSrc = icon.getAttribute("src") as ImagePath;
            picture.setAttribute("src", iconSrc);
            const newIcon = document.createElement("img");
            newIcon.src = iconSrc;
            picture.append(newIcon);
            icon.replaceWith(picture);

            const slug = picture.dataset.statusId ?? "";
            const affecting = affectingConditions.filter((c) => c.slug === slug);
            if (affecting.length > 0 || iconSrc === token.document.overlayEffect) {
                picture.classList.add("active");
            }

            if (affecting.length > 0) {
                // Show a badge icon if the condition has a value or is locked
                const isOverridden = affecting.every((c) => c.system.references.overriddenBy.length > 0);
                const isLocked = affecting.every((c) => c.isLocked);
                const hasValue = affecting.some((c) => c.value);

                if (isOverridden) {
                    picture.classList.add("overridden");
                    const badge = fontAwesomeIcon("angle-double-down");
                    badge.classList.add("badge");
                    picture.append(badge);
                } else if (isLocked) {
                    picture.classList.add("locked");
                    const badge = fontAwesomeIcon("lock");
                    badge.classList.add("badge");
                    picture.append(badge);
                } else if (hasValue) {
                    picture.classList.add("valued");
                    const badge = document.createElement("i");
                    badge.classList.add("badge");
                    const value = Math.max(...affecting.map((c) => c.value ?? 1));
                    badge.innerText = value.toString();
                    picture.append(badge);
                }
            }
        }

        this.#activateListeners(iconGrid, token);
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
            this.#createChatMessage(token.object, combatant.hidden);
        }
    }

    /** Show the Status Effect name and summary on mouseover of the token HUD */
    static #showStatusLabel(icon: HTMLPictureElement): void {
        const titleBar = icon.closest(".status-effects")?.querySelector<HTMLElement>(".title-bar");
        if (titleBar && icon.title) {
            titleBar.innerText = icon.title;
            titleBar.classList.toggle("active");
        }
    }

    /**
     * A click event handler to increment or decrement valued conditions.
     * @param event The window click event
     */
    static async #setStatusValue(event: MouseEvent, token: TokenPF2e): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        const icon = event.currentTarget;
        if (!(icon instanceof HTMLPictureElement)) return;

        const slug = icon.dataset.statusId;
        const { actor } = token;
        if (!(actor && slug)) return;

        const condition = actor.itemTypes.condition.find(
            (c) => c.slug === slug && c.isInHUD && !c.system.references.parent
        );

        if (event.type === "click") {
            if (typeof condition?.value === "number") {
                await game.pf2e.ConditionManager.updateConditionValue(condition.id, token, condition.value + 1);
            } else if (objectHasKey(CONFIG.PF2E.conditionTypes, slug)) {
                await token.actor?.increaseCondition(slug);
            } else {
                this.#toggleStatus(event, token);
            }
        } else if (event.type === "contextmenu") {
            // Remove or decrement condition
            if (event.ctrlKey) {
                // Remove all conditions
                const conditionIds = actor.itemTypes.condition.filter((c) => c.slug === slug).map((c) => c.id);
                await token.actor?.deleteEmbeddedDocuments("Item", conditionIds);
            } else if (condition?.value) {
                await game.pf2e.ConditionManager.updateConditionValue(condition.id, token, condition.value - 1);
            } else {
                this.#toggleStatus(event, token);
            }
        }

        // An update of a synthetic actor is a token update, which will trigger the HUD re-render
        if (token.document.isLinked) await canvas.hud?.token.render();
    }

    static async #toggleStatus(event: MouseEvent, token: TokenPF2e): Promise<void> {
        const icon = event.currentTarget;
        const { actor } = token;
        if (!actor || !(icon instanceof HTMLElement)) return;

        const slug = icon.dataset.statusId ?? "";
        const imgElement = icon.querySelector("img");
        const iconSrc = imgElement?.getAttribute("src") as ImagePath | null | undefined;

        const affecting = actor?.itemTypes.condition.find((c) => c.slug === slug && !c.system.references.parent);
        const conditionIds: string[] = [];

        if (event.type === "click" && !affecting) {
            if (objectHasKey(CONFIG.PF2E.conditionTypes, slug)) {
                const newCondition = game.pf2e.ConditionManager.getCondition(slug).toObject();
                newCondition.system.sources.hud = true;
                await token.actor?.createEmbeddedDocuments("Item", [newCondition]);
            } else if (iconSrc && (event.shiftKey || icon.dataset.statusId === "dead")) {
                await token.toggleEffect(iconSrc, { overlay: true, active: true });
                await canvas.tokens.hud.render();
            }
        } else if (event.type === "contextmenu") {
            if (affecting) conditionIds.push(affecting.id);

            if (conditionIds.length > 0) {
                await token.actor?.deleteEmbeddedDocuments("Item", conditionIds);
            } else if (token.document.overlayEffect === iconSrc) {
                await token.toggleEffect(iconSrc, { overlay: true, active: false });
                await canvas.tokens.hud.render();
            }
        }
    }

    /** Creates a ChatMessage with the Actors current status effects. */
    static #createChatMessage(token: TokenPF2e, whisper = false) {
        // Get the active applied conditions.
        // Iterate the list to create the chat and bubble chat dialog.

        const conditions = token.actor?.itemTypes.condition.filter((c) => c.isActive) ?? [];
        const iconFolder = CONFIG.PF2E.statusEffects.iconDir;
        const statusEffectList = conditions.map((condition): string => {
            const conditionInfo = StatusEffects.conditions[condition.slug];
            const summary = conditionInfo.summary ?? "";
            const conditionValue = condition.value ?? "";
            const iconPath = `${iconFolder}${condition.slug}.webp`;
            return `
                <li><img src="${iconPath}" title="${summary}">
                    <span class="statuseffect-li">
                        <span class="statuseffect-li-text">${condition.name} ${conditionValue}</span>
                        <div class="statuseffect-rules"><h2>${condition.name}</h2>${condition.description}</div>
                    </span>
                </li>`;
        });

        if (statusEffectList.length === 0) return;

        const content = `
            <div class="dice-roll">
                <div class="dice-result">
                    <div class="dice-total statuseffect-message">
                        <ul>${statusEffectList.join("")}</ul>
                    </div>
                </div>
            </div>
        `;

        const messageSource: DeepPartial<foundry.data.ChatMessageSource> = {
            user: game.user.id,
            speaker: { alias: game.i18n.format("PF2E.StatusEffects", { name: token.name }) },
            content,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
        };
        const isNPCEvent = !token.actor?.hasPlayerOwner;
        const hideNPCEvent = isNPCEvent && game.settings.get("pf2e", "metagame.secretCondition");
        if (hideNPCEvent || whisper) {
            messageSource.whisper = ChatMessage.getWhisperRecipients("GM").map((u) => u.id);
        }
        ChatMessagePF2e.create(messageSource);
    }
}
