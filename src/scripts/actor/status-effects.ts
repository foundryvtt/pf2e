import { LocalizePF2e } from "@system/localize";
import { StatusEffectIconTheme } from "@scripts/config";
import { ErrorPF2e, objectHasKey } from "@util";
import { ActorPF2e } from "@actor/base";
import { TokenPF2e } from "@module/canvas/token";
import { CombatPF2e } from "@module/combat";

/**
 * Class StatusEffects, which is the module to handle the status effects
 * @category PF2
 */
export class StatusEffects {
    /** Set the theme for condition icons on tokens */
    static setIconTheme() {
        const iconTheme = game.settings.get("pf2e", "statusEffectType");
        CONFIG.PF2E.statusEffects.lastIconType = iconTheme;
        CONFIG.PF2E.statusEffects.effectsIconFolder =
            StatusEffects.SETTINGOPTIONS.iconTypes[iconTheme].effectsIconFolder;
        CONFIG.PF2E.statusEffects.effectsIconFileType =
            StatusEffects.SETTINGOPTIONS.iconTypes[iconTheme].effectsIconFileType;
        CONFIG.PF2E.statusEffects.foundryStatusEffects = CONFIG.statusEffects;
    }

    /** Link status effect icons to conditions */
    static init() {
        if (CONFIG.PF2E.statusEffects.overruledByModule) return;

        console.log("PF2e System | Initializing Status Effects Module");
        this.hookIntoFoundry();

        /** Update FoundryVTT's CONFIG.statusEffects */
        this.updateStatusIcons();
    }

    static get conditions() {
        return LocalizePF2e.translations.PF2E.condition;
    }

    static get SETTINGOPTIONS() {
        // switching to other icons need to migrate all tokens
        return {
            iconTypes: {
                default: {
                    effectsIconFolder: "systems/pf2e/icons/conditions/",
                    effectsIconFileType: "webp",
                },
                blackWhite: {
                    effectsIconFolder: "systems/pf2e/icons/conditions-2/",
                    effectsIconFileType: "webp",
                },
                legacy: {
                    effectsIconFolder: "systems/pf2e/icons/conditions-3/",
                    effectsIconFileType: "webp",
                },
            },
        };
    }

    /**
     * Hook PF2e's status effects into FoundryVTT
     */
    static hookIntoFoundry() {
        /** Create hooks onto FoundryVTT */
        Hooks.on("renderTokenHUD", (app, html, data) => {
            console.log("PF2e System | Rendering PF2e customized status effects");
            StatusEffects._hookOnRenderTokenHUD(app, html, data);
        });
        Hooks.on("onTokenHUDClear", (tokenHUD, token: TokenPF2e) => {
            if (tokenHUD._state === tokenHUD?.constructor?.RENDER_STATES?.NONE) {
                // Closing the token HUD
                if (token?.statusEffectChanged === true) {
                    console.log("PF2e System | StatusEffects were updated - Message to chat");
                    token.statusEffectChanged = false;
                    StatusEffects._createChatMessage(token);
                }
            }
        });

        if (game.user.isGM && game.settings.get("pf2e", "statusEffectShowCombatMessage")) {
            let lastTokenId = "";
            Hooks.on("updateCombat", (combat: CombatPF2e) => {
                const combatant = combat.combatant;
                const token = combatant?.token;
                if (
                    token &&
                    token.id !== lastTokenId &&
                    combat?.started &&
                    typeof combatant?.initiative === "number" &&
                    !combatant.data.defeated
                ) {
                    lastTokenId = token.id;
                    this._createChatMessage(token.object, combatant.hidden);
                }
                if (!combat?.started && lastTokenId !== "") lastTokenId = "";
            });
        }
    }

    static setPF2eStatusEffectControls(html: JQuery, token: TokenPF2e) {
        // Status Effects Controls
        const effects = html.find(".status-effects");
        effects
            .on("click", ".pf2e-effect-control", this._setStatusValue.bind(token))
            .on("contextmenu", ".pf2e-effect-control", this._setStatusValue.bind(token))
            .on("mouseover mouseout", ".pf2e-effect-control", this._showStatusDescr);

        effects.off("click", ".effect-control").on("click", ".effect-control", this.toggleStatus.bind(token));
        effects
            .off("contextmenu", ".effect-control")
            .on("contextmenu", ".effect-control", this.toggleStatus.bind(token))
            .on("mouseover mouseout", ".effect-control", this._showStatusDescr);
    }

    /** Updates the core CONFIG.statusEffects with the new icons */
    private static updateStatusIcons(): void {
        CONFIG.statusEffects = Array.from(game.pf2e.ConditionManager.conditions.values())
            .filter((condition) => !["attitudes", "detection"].includes(condition.data.group))
            .sort((conditionA, conditionB) => conditionA.name.localeCompare(conditionB.name))
            .map((condition) => {
                const folder = CONFIG.PF2E.statusEffects.effectsIconFolder;
                const slug = condition.data.slug;
                const extension = CONFIG.PF2E.statusEffects.effectsIconFileType;
                return `${folder}${slug}.${extension}`;
            });
    }

    static async _hookOnRenderTokenHUD(_app: TokenHUD, html: JQuery, tokenData: TokenHUDData) {
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
        this.setPF2eStatusEffectControls(html, token);

        for (const icon of $statusIcons) {
            const $icon = $(icon);
            const iconPath = $icon.attr("src") ?? "";

            if (iconPath.includes(CONFIG.PF2E.statusEffects.effectsIconFolder)) {
                const slug = this.getSlugFromImg(iconPath);
                const conditionData = game.pf2e.ConditionManager.getCondition(slug);
                if (!conditionData) continue;

                $icon.attr("data-effect", slug);
                $icon.attr("data-condition", slug);

                const affecting = affectingConditions.find((condition) => condition.slug === slug);

                if (conditionData.data.value.isValued) {
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
            }
        }
    }

    static async updateHUD(html: JQuery, actor: ActorPF2e) {
        const $statusIcons = html.find("img.effect-control, img.pf2e-effect-control");
        const appliedConditions = actor.itemTypes.condition.filter(
            (condition) => condition.fromSystem && condition.isActive && condition.isInHUD
        );

        for (const icon of $statusIcons) {
            const $icon = $(icon);
            const status = $icon.attr("data-effect");
            const conditionSlug = $icon.attr("data-condition");

            if (conditionSlug && status) {
                // Icon is a condition
                const applied = appliedConditions.find((condition) => condition.slug === conditionSlug);
                const conditionBase = game.pf2e.ConditionManager.getCondition(conditionSlug);

                if (conditionBase?.data.value.isValued) {
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

    /**
     * Show the Status Effect name and summary on mouseover of the token HUD
     */
    static _showStatusDescr(event: JQuery.TriggeredEvent) {
        const f = $(event.currentTarget);
        const statusDescr = $("div.status-effect-summary");
        if (f.attr("src")?.includes(CONFIG.PF2E.statusEffects.effectsIconFolder)) {
            const slug = f.attr("data-effect");
            if (objectHasKey(StatusEffects.conditions, slug)) {
                const conditionInfo = StatusEffects.conditions[slug];
                statusDescr.text("name" in conditionInfo ? conditionInfo.name : "").toggleClass("active");
            }
        }
    }

    /**
     * A click event handler to increment or decrement valued conditions.
     *
     * @param event    The window click event
     */
    static async _setStatusValue(this: TokenPF2e, event: JQuery.ClickEvent | JQuery.ContextMenuEvent): Promise<void> {
        event.preventDefault();
        event.stopImmediatePropagation();

        if (event.shiftKey) {
            StatusEffects._onToggleOverlay(event, this);
            return;
        }

        const $icon = $(event.currentTarget);
        const slug = $icon.attr("data-condition");

        const { actor } = this;
        if (!(actor && slug)) return;
        const condition = actor.itemTypes.condition.find(
            (condition) =>
                condition.fromSystem &&
                condition.slug === slug &&
                condition.isInHUD &&
                !condition.data.data.references.parent
        );

        if (event.type === "contextmenu") {
            // Right click, remove
            if (event.ctrlKey) {
                // CTRL key pressed.
                // Remove all conditions.

                this.statusEffectChanged = true;

                const conditionIds = actor.itemTypes.condition
                    .filter((condition) => condition.fromSystem && condition.slug === slug)
                    .map((condition) => condition.id);

                await game.pf2e.ConditionManager.removeConditionFromToken(conditionIds, this);
            } else if (condition?.value) {
                this.statusEffectChanged = true;
                await game.pf2e.ConditionManager.updateConditionValue(condition.id, this, condition.value - 1);
                if (this.data.actorLink) {
                    StatusEffects.updateHUD($icon.parent().parent(), actor);
                }
            }
        } else if (event.type === "click") {
            this.statusEffectChanged = true;
            if (typeof condition?.value === "number") {
                await game.pf2e.ConditionManager.updateConditionValue(condition.id, this, condition.value + 1);
                if (this.data.actorLink) {
                    StatusEffects.updateHUD($icon.parent().parent(), actor);
                }
            } else {
                const newCondition = game.pf2e.ConditionManager.getCondition(slug).toObject();
                newCondition.data.sources.hud = true;
                await game.pf2e.ConditionManager.addConditionToToken(newCondition, this);
            }
        }
    }

    private static async toggleStatus(this: TokenPF2e, event: JQuery.TriggeredEvent): Promise<void> {
        event.preventDefault();
        event.stopImmediatePropagation();

        const $target = $(event.currentTarget);
        const slug = $target.attr("data-condition") ?? "";
        const src = ($target.attr("src") ?? "") as ImagePath;

        if (event.shiftKey || src === "icons/svg/skull.svg") {
            return StatusEffects._onToggleOverlay(event, this);
        }

        const { actor } = this;
        const condition = actor?.itemTypes.condition.find(
            (condition) => condition.slug === slug && condition.isInHUD && !condition.data.data.references.parent
        );

        const conditionIds: string[] = [];
        if (event.type === "contextmenu") {
            // Right click, remove
            if (event.ctrlKey) {
                // CTRL key pressed.
                // Remove all conditions.
                actor?.itemTypes.condition
                    .filter((condition) => condition.fromSystem && condition.data.data.base === slug)
                    .forEach((condition) => conditionIds.push(condition.id));
            } else if (condition) {
                conditionIds.push(condition.id);
            }

            if (conditionIds.length > 0) {
                this.statusEffectChanged = true;
                await game.pf2e.ConditionManager.removeConditionFromToken(conditionIds, this);
            } else if (this.data.effects.includes(src)) {
                await this.toggleEffect(src);
            }
        } else if (event.type === "click") {
            if (!condition && slug) {
                const newCondition = game.pf2e.ConditionManager.getCondition(slug).toObject();
                newCondition.data.sources.hud = true;
                this.statusEffectChanged = true;

                await game.pf2e.ConditionManager.addConditionToToken(newCondition, this);
            }
        }
    }

    /**
     * Recreating TokenHUD._onToggleOverlay. Handle assigning a status effect icon as the overlay effect
     */
    static _onToggleOverlay(event: JQuery.TriggeredEvent, token: TokenPF2e) {
        event.preventDefault();
        const $target = $(event.currentTarget);
        const iconPath = ($(event.currentTarget).attr("src") ?? "") as ImagePath;
        token.toggleEffect(iconPath, { overlay: true });
        $target.siblings().removeClass("overlay");
        $target.toggleClass("overlay");
    }

    /**
     * Creates a ChatMessage with the Actors current status effects.
     */
    static _createChatMessage(token: TokenPF2e, whisper = false) {
        let statusEffectList = "";

        // Get the active applied conditions.
        // Iterate the list to create the chat and bubble chat dialog.

        const conditions =
            token.actor?.itemTypes.condition.filter(
                (condition) => condition.fromSystem && condition.data.data.active
            ) ?? [];
        for (const condition of conditions) {
            type ConditionKey = keyof typeof StatusEffects.conditions;
            const conditionInfo = StatusEffects.conditions[condition.data.data.hud.statusName as ConditionKey];
            const summary = "summary" in conditionInfo ? conditionInfo.summary : "";
            statusEffectList += `
                <li><img src="${`${CONFIG.PF2E.statusEffects.effectsIconFolder + condition.data.data.hud.statusName}.${
                    CONFIG.PF2E.statusEffects.effectsIconFileType
                }`}" title="${summary}">
                    <span class="statuseffect-li">
                        <span class="statuseffect-li-text">${condition.name} ${
                condition.data.data.value.isValued ? condition.data.data.value.value : ""
            }</span>
                        <div class="statuseffect-rules"><h2>${condition.name}</h2>${
                condition.data.data.description.value
            }</div>
                    </span>
                </li>`;
        }

        if (statusEffectList === "") {
            // No updates
            return;
        }

        const message = `
            <div class="dice-roll">
                <div class="dice-result">
                    <div class="dice-total statuseffect-message">
                        <ul>${statusEffectList}</ul>
                    </div>
                </div>
            </div>
        `;

        const chatData: any = {
            user: game.user.id,
            speaker: { alias: game.i18n.format("PF2E.StatusEffects", { name: token.name }) },
            content: message,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
        };
        const isNPCEvent = !token.actor?.hasPlayerOwner;
        const hideNPCEvent = isNPCEvent && game.settings.get("pf2e", "metagame.secretCondition");
        if (hideNPCEvent || whisper) {
            chatData.whisper = ChatMessage.getWhisperRecipients("GM");
        }
        ChatMessage.create(chatData);
    }

    /**
     * If the system setting statusEffectType is changed, we need to upgrade CONFIG
     * And migrate all statusEffect URLs of all Tokens
     */
    static async migrateStatusEffectUrls(chosenSetting: StatusEffectIconTheme) {
        if (CONFIG.PF2E.statusEffects.overruledByModule) {
            console.log("PF2e System | The PF2eStatusEffect icons are overruled by a module");
            ui.notifications.error(
                "Changing this setting has no effect, as the icon types are overruled by a module.",
                { permanent: true }
            );
            return;
        }
        console.debug("PF2e System | Changing status effect icon types");
        const iconType = StatusEffects.SETTINGOPTIONS.iconTypes[chosenSetting];
        const lastIconType = StatusEffects.SETTINGOPTIONS.iconTypes[CONFIG.PF2E.statusEffects.lastIconType];

        const promises: Promise<TokenDocument[]>[] = [];
        for (const scene of game.scenes) {
            const tokenUpdates: any[] = [];

            for (const token of scene.data.tokens) {
                const tokenData = token.data;
                const update = tokenData.toObject(false);
                for (const url of tokenData.effects) {
                    if (url.includes(lastIconType.effectsIconFolder)) {
                        const statusName = this.getSlugFromImg(url);
                        const newUrl = `${iconType.effectsIconFolder + statusName}.${iconType.effectsIconFileType}`;
                        console.log(
                            `PF2e System | Migrating effect ${statusName} of Token ${tokenData.name} on scene ${scene.data.name} | '${url}' to '${newUrl}'`
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

        CONFIG.PF2E.statusEffects.effectsIconFolder = iconType.effectsIconFolder;
        CONFIG.PF2E.statusEffects.effectsIconFileType = iconType.effectsIconFileType;
        CONFIG.PF2E.statusEffects.lastIconType = chosenSetting;
        StatusEffects.updateStatusIcons();
    }

    /** Helper to get status effect name from image url */
    static getSlugFromImg(url: string) {
        return url.substring(
            url.lastIndexOf("/") + 1,
            url.length - CONFIG.PF2E.statusEffects.effectsIconFileType.length - 1
        );
    }
}
