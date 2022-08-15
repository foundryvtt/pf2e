import { LocalizePF2e } from "@system/localize";
import { StatusEffectIconTheme } from "@scripts/config";
import { ErrorPF2e } from "@util";
import { ActorPF2e } from "@actor/base";
import { TokenPF2e } from "@module/canvas/token";
import { EncounterPF2e } from "@module/encounter";
import { ChatMessagePF2e } from "@module/chat-message";
import { TokenDocumentPF2e } from "@scene";

/** Handle interaction with the TokenHUD */
export class StatusEffects {
    static readonly #SETTING_OPTIONS: StatusEffectsSettingOptions = {
        default: {
            folder: "systems/pf2e/icons/conditions/",
            extension: "webp",
        },
        blackWhite: {
            folder: "systems/pf2e/icons/conditions-2/",
            extension: "webp",
        },
        legacy: {
            folder: "systems/pf2e/icons/conditions-3/",
            extension: "webp",
        },
    };

    /** Set the theme for condition icons on tokens */
    static setIconTheme(): void {
        const iconTheme = game.settings.get("pf2e", "statusEffectType");
        CONFIG.PF2E.statusEffects.lastIconType = iconTheme;
        CONFIG.PF2E.statusEffects.folder = this.#SETTING_OPTIONS[iconTheme].folder;
        CONFIG.PF2E.statusEffects.extension = this.#SETTING_OPTIONS[iconTheme].extension;
        CONFIG.PF2E.statusEffects.foundryStatusEffects = CONFIG.statusEffects;
    }

    /** Link status effect icons to conditions */
    static init(): void {
        if (!canvas.ready) return;

        console.debug("PF2e System | Initializing Status Effects handler");
        this.#hookIntoFoundry();
        this.#updateStatusIcons();
    }

    static get conditions() {
        return LocalizePF2e.translations.PF2E.condition;
    }

    /**
     * If the system setting statusEffectType is changed, we need to upgrade CONFIG
     * And migrate all statusEffect URLs of all Tokens
     */
    static async migrateStatusEffectUrls(chosenSetting: StatusEffectIconTheme) {
        console.debug("PF2e System | Changing status effect icon types");
        const iconType = this.#SETTING_OPTIONS[chosenSetting];
        const lastIconType = this.#SETTING_OPTIONS[CONFIG.PF2E.statusEffects.lastIconType];

        const promises: Promise<TokenDocument[]>[] = [];
        for (const scene of game.scenes) {
            const tokenUpdates: EmbeddedDocumentUpdateData<TokenDocumentPF2e>[] = [];

            for (const token of scene.tokens) {
                const update = token.toObject(false);
                for (const url of token.effects) {
                    if (url.includes(lastIconType.folder)) {
                        const statusName = this.#getSlugFromImg(url);
                        const newUrl = `${iconType.folder}${statusName}.webp` as const;
                        console.debug(
                            `PF2e System | Migrating effect ${statusName} of Token ${token.name} on scene ${scene.name} | "${url}" to "${newUrl}"`
                        );
                        const index = update.effects.indexOf(url);
                        if (index > -1) {
                            update.effects.splice(index, 1, newUrl);
                        }
                    }
                }
                tokenUpdates.push(update);
            }
            promises.push(scene.updateEmbeddedDocuments("Token", tokenUpdates));
        }
        await Promise.all(promises);

        CONFIG.PF2E.statusEffects.folder = iconType.folder;
        CONFIG.PF2E.statusEffects.extension = iconType.extension;
        CONFIG.PF2E.statusEffects.lastIconType = chosenSetting;
        StatusEffects.#updateStatusIcons();
    }

    static async updateHUD(html: JQuery, actor: ActorPF2e): Promise<void> {
        const $statusIcons = html.find("img.effect-control, img.pf2e-effect-control");
        const appliedConditions = actor.itemTypes.condition.filter(
            (condition) => condition.fromSystem && condition.isActive && condition.isInHUD
        );

        for (const icon of $statusIcons) {
            const $icon = $(icon);
            const conditionSlug = $icon.attr("data-effect");
            const conditionName = $icon.attr("data-condition");

            if (conditionSlug && conditionName) {
                // Icon is a condition
                const applied = appliedConditions.find((condition) => condition.slug === conditionSlug);
                const conditionBase = game.pf2e.ConditionManager.getCondition(conditionSlug);

                if (conditionBase?.value) {
                    // Valued condition

                    const $value = $icon.siblings("div.pf2e-effect-value").first();

                    if ($icon.hasClass("active")) {
                        // icon is active.
                        if (!applied || !applied.isActive || applied.value === null) {
                            $icon.removeClass("active");
                            $value.attr("style", "display:none").text("0");
                        } else if (applied.value !== null) {
                            // Update the value

                            $value.text(applied.value);
                        }
                    } else if (applied?.isActive && typeof applied.value === "number") {
                        $icon.addClass("active");
                        $value.removeAttr("style").text(applied.value);
                    }
                } else if ($icon.hasClass("active")) {
                    // Toggle condition

                    // icon is active.
                    if (!applied || !applied.isActive) {
                        // Remove active if no effect was found
                        // Or effect was found, but not active.

                        $icon.removeClass("active");
                    }
                } else if (applied?.isActive) {
                    $icon.addClass("active");
                }
            }
        }
    }

    /** Hook PF2e's status effects into FoundryVTT */
    static #hookIntoFoundry(): void {
        Hooks.on("renderTokenHUD", (_app, html, data) => {
            StatusEffects.#hookOnRenderTokenHUD(html, data);
        });

        if (game.user.isGM && game.settings.get("pf2e", "statusEffectShowCombatMessage")) {
            let lastTokenId = "";
            Hooks.on("updateCombat", (combat) => {
                if (!(combat instanceof EncounterPF2e)) return;

                const combatant = combat.combatant;
                const token = combatant?.token;
                if (
                    token &&
                    token.id !== lastTokenId &&
                    combat?.started &&
                    typeof combatant?.initiative === "number" &&
                    !combatant.defeated
                ) {
                    lastTokenId = token.id;
                    this.#createChatMessage(token.object, combatant.hidden);
                }
                if (!combat?.started && lastTokenId !== "") lastTokenId = "";
            });
        }
    }

    static #setStatusEffectControls($html: JQuery, token: TokenPF2e): void {
        // Status Effects Controls
        const effects = $html.find(".status-effects");
        effects
            .on("click", ".pf2e-effect-control", (event) => {
                this.#setStatusValue(token, event);
            })
            .on("contextmenu", ".pf2e-effect-control", (event) => {
                event.preventDefault();
                this.#setStatusValue(token, event);
            })
            .on("mouseover mouseout", ".pf2e-effect-control", this.#showStatusLabel);

        effects.off("click", ".effect-control").on("click", ".effect-control", (event) => {
            this.#toggleStatus(token, event);
        });
        effects
            .off("contextmenu", ".effect-control")
            .on("contextmenu", ".effect-control", (event) => {
                event.preventDefault();
                this.#toggleStatus(token, event);
            })
            .on("mouseover mouseout", ".effect-control", this.#showStatusLabel);
    }

    /** Updates the core CONFIG.statusEffects with the new icons */
    static #updateStatusIcons(): void {
        CONFIG.statusEffects = Array.from(game.pf2e.ConditionManager.conditions.values())
            .filter((c) => !["attitudes", "detection"].includes(c.system.group))
            .sort((conditionA, conditionB) => conditionA.name.localeCompare(conditionB.name))
            .map((condition): VideoPath => {
                const folder = CONFIG.PF2E.statusEffects.folder;
                return `${folder}${condition.slug}.webp`;
            });
        CONFIG.statusEffects.push(CONFIG.controlIcons.defeated);
    }

    static async #hookOnRenderTokenHUD(html: JQuery, tokenData: TokenHUDData) {
        const token = canvas.tokens.get(tokenData._id);

        if (!token) {
            throw ErrorPF2e(`StatusEffects | Could not find token with id: ${tokenData._id}`);
        }

        const $statusIcons = html.find("img.effect-control");

        const affectingConditions =
            token.actor?.itemTypes.condition.filter(
                (condition) => condition.fromSystem && condition.isActive && condition.isInHUD
            ) ?? [];

        html.find("div.status-effects").append('<div class="status-effect-summary"></div>');
        this.#setStatusEffectControls(html, token);

        for (const icon of $statusIcons) {
            const $icon = $(icon);
            const iconPath = $icon.attr("src") ?? "";

            if (iconPath.includes(CONFIG.PF2E.statusEffects.folder)) {
                const slug = this.#getSlugFromImg(iconPath);
                const condition = game.pf2e.ConditionManager.getCondition(slug);
                if (!condition) continue;

                $icon.attr("data-effect", slug);
                $icon.attr("data-condition", condition.name);

                const affecting = affectingConditions.find((condition) => condition.slug === slug);

                if (condition.value) {
                    $icon.removeClass("effect-control").addClass("pf2e-effect-control");
                    // retrieve actor and the current effect value
                    $icon.wrap("<div class='pf2e-effect-img-container'></div>");
                    const $value = $("<div class='pf2e-effect-value' style='display:none'>0</div>");
                    $icon.parent().append($value);

                    if (affecting) {
                        $icon.attr("data-value", affecting.value);

                        if (typeof affecting.value === "number") {
                            $($value).removeAttr("style").text(affecting.value);
                        }
                    }
                }

                if ($icon.hasClass("active") && !affecting) {
                    $icon.removeClass("active");
                } else if (!$icon.hasClass("active") && affecting) {
                    $icon.addClass("active");
                }
            } else if (iconPath === CONFIG.controlIcons.defeated) {
                $icon.attr({ "data-condition": game.i18n.localize("PF2E.Actor.Dead") });
            }
        }
    }

    /** Show the Status Effect name and summary on mouseover of the token HUD */
    static #showStatusLabel(event: JQuery.TriggeredEvent): void {
        const $toggle = $(event.currentTarget);
        const statusDescr = $("div.status-effect-summary");
        const label = $toggle.attr("data-condition");
        if (label) {
            statusDescr.text(label).toggleClass("active");
        }
    }

    /**
     * A click event handler to increment or decrement valued conditions.
     * @param event The window click event
     */
    static async #setStatusValue(token: TokenPF2e, event: JQuery.TriggeredEvent): Promise<void> {
        event.stopImmediatePropagation();

        if (event.shiftKey) {
            await this.#onToggleOverlay(event, token);
            return;
        }

        const $icon = $(event.currentTarget);
        const slug = $icon.attr("data-effect");
        const { actor } = token;
        if (!(actor && slug)) return;

        const condition = actor.itemTypes.condition.find(
            (c) => c.slug === slug && c.isInHUD && !c.system.references.parent
        );

        if (event.type === "contextmenu") {
            // Right click, remove
            if (event.ctrlKey) {
                // CTRL key pressed.
                // Remove all conditions.

                token.statusEffectChanged = true;
                const conditionIds = actor.itemTypes.condition.filter((c) => c.slug === slug).map((c) => c.id);

                await game.pf2e.ConditionManager.removeConditionFromToken(conditionIds, token);
            } else if (condition?.value) {
                token.statusEffectChanged = true;
                await game.pf2e.ConditionManager.updateConditionValue(condition.id, token, condition.value - 1);
                if (token.document.actorLink) {
                    StatusEffects.updateHUD($icon.parent().parent(), actor);
                }
            }
        } else if (event.type === "click") {
            token.statusEffectChanged = true;
            if (typeof condition?.value === "number") {
                await game.pf2e.ConditionManager.updateConditionValue(condition.id, token, condition.value + 1);
                if (token.document.actorLink) {
                    StatusEffects.updateHUD($icon.parent().parent(), actor);
                }
            } else {
                const newCondition = game.pf2e.ConditionManager.getCondition(slug).toObject();
                newCondition.system.sources.hud = true;
                await game.pf2e.ConditionManager.addConditionToToken(newCondition, token);
            }
        }
    }

    static async #toggleStatus(token: TokenPF2e, event: JQuery.TriggeredEvent): Promise<void> {
        event.stopImmediatePropagation();

        const { actor } = token;
        if (!actor) return;

        const $target = $(event.currentTarget);
        const slug = $target.attr("data-effect") ?? "";
        const src = ($target.attr("src") ?? "") as ImagePath;

        if (event.shiftKey || src === CONFIG.controlIcons.defeated) {
            return StatusEffects.#onToggleOverlay(event, token);
        }

        const condition = actor?.itemTypes.condition.find(
            (c) => c.slug === slug && c.isInHUD && !c.system.references.parent
        );

        const conditionIds: string[] = [];
        if (event.type === "contextmenu") {
            // Right click, remove
            if (event.ctrlKey) {
                // CTRL key pressed.
                // Remove all conditions.
                for (const condition of actor.itemTypes.condition.filter((c) => c.system.base === slug)) {
                    conditionIds.push(condition.id);
                }
            } else if (condition) {
                conditionIds.push(condition.id);
            }

            if (conditionIds.length > 0) {
                token.statusEffectChanged = true;
                await game.pf2e.ConditionManager.removeConditionFromToken(conditionIds, token);
            } else if (token.document.effects.includes(src)) {
                await token.toggleEffect(src);
            }
        } else if (event.type === "click") {
            if (!condition && slug) {
                const newCondition = game.pf2e.ConditionManager.getCondition(slug).toObject();
                newCondition.system.sources.hud = true;
                token.statusEffectChanged = true;
                await game.pf2e.ConditionManager.addConditionToToken(newCondition, token);
            }
        }
    }

    /** Recreating TokenHUD._onToggleOverlay. Handle assigning a status effect icon as the overlay effect */
    static async #onToggleOverlay(event: JQuery.TriggeredEvent, token: TokenPF2e): Promise<void> {
        const $target = $(event.currentTarget);
        const iconPath = ($(event.currentTarget).attr("src") ?? "") as ImagePath;

        // Do nothing if left-clicking an active overlay or right-clicking an inactive one
        if (
            (event.type === "click" && token.document.overlayEffect === iconPath) ||
            (event.type === "contextmenu" && token.document.overlayEffect !== iconPath)
        ) {
            return;
        }

        const deathIcon = CONFIG.controlIcons.defeated;
        const togglingDead = iconPath === deathIcon;
        if (token.combatant && togglingDead) {
            await token.combatant.toggleDefeated();
        } else {
            await token.toggleEffect(iconPath, { overlay: true });
            $target.siblings().removeClass("overlay");
            $target.toggleClass("overlay");
        }
        await token.layer.hud?.render();
    }

    /** Creates a ChatMessage with the Actors current status effects. */
    static #createChatMessage(token: TokenPF2e, whisper = false) {
        let statusEffectList = "";

        // Get the active applied conditions.
        // Iterate the list to create the chat and bubble chat dialog.

        const conditions =
            token.actor?.itemTypes.condition.filter((condition) => condition.fromSystem && condition.system.active) ??
            [];
        const iconFolder = CONFIG.PF2E.statusEffects.folder;
        for (const condition of conditions) {
            const conditionInfo = StatusEffects.conditions[condition.slug];
            const summary = "summary" in conditionInfo ? conditionInfo.summary : "";
            const conditionValue = condition.system.value.isValued ? condition.value : "";
            const iconPath = `${iconFolder}${condition.system.hud.statusName}.webp`;
            statusEffectList += `
                <li><img src="${iconPath}" title="${summary}">
                    <span class="statuseffect-li">
                        <span class="statuseffect-li-text">${condition.name} ${conditionValue}</span>
                        <div class="statuseffect-rules"><h2>${condition.name}</h2>${condition.description}</div>
                    </span>
                </li>`;
        }

        if (statusEffectList === "") {
            // No updates
            return;
        }

        const content = `
            <div class="dice-roll">
                <div class="dice-result">
                    <div class="dice-total statuseffect-message">
                        <ul>${statusEffectList}</ul>
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

    /** Helper to get status effect name from image url */
    static #getSlugFromImg(url: string) {
        return url.substring(url.lastIndexOf("/") + 1, url.length - CONFIG.PF2E.statusEffects.extension.length - 1);
    }
}

type StatusEffectsSettingOptions = Record<StatusEffectIconTheme, { folder: string; extension: "webp" }>;
