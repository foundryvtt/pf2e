import { LocalizePF2e } from "@system/localize";
import { StatusEffectIconType } from "@scripts/config";
import { ErrorPF2e } from "@module/utils";
import { ActorPF2e } from "@actor/base";
import { TokenPF2e } from "@module/canvas/token";
import { CombatPF2e } from "@module/combat";

/**
 * Class StatusEffects, which is the module to handle the status effects
 * @category PF2
 */
export class StatusEffects {
    static init() {
        if (CONFIG.PF2E.statusEffects.overruledByModule) return;

        console.log("PF2e System | Initializing Status Effects Module");
        this.hookIntoFoundry();

        const statusEffectType = game.settings.get("pf2e", "statusEffectType");
        CONFIG.PF2E.statusEffects.lastIconType = statusEffectType;
        CONFIG.PF2E.statusEffects.effectsIconFolder =
            StatusEffects.SETTINGOPTIONS.iconTypes[statusEffectType].effectsIconFolder;
        CONFIG.PF2E.statusEffects.effectsIconFileType =
            StatusEffects.SETTINGOPTIONS.iconTypes[statusEffectType].effectsIconFileType;
        CONFIG.PF2E.statusEffects.foundryStatusEffects = CONFIG.statusEffects;
        /** Update FoundryVTT's CONFIG.statusEffects */
        this._updateStatusIcons();
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
        Hooks.on("onTokenHUDClear", (tokenHUD, token) => {
            // Foundry 0.5.7 bug? token parameter is null
            // Workaround: set tokenHUD.token in _hookOnRenderTokenHUD
            token = tokenHUD.token;

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
                    this._createChatMessage(token, combatant.hidden);
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

    /**
     * Updates the core CONFIG.statusEffects with the new icons
     */
    static _updateStatusIcons() {
        const effects: string[] = [];
        const conditions = Array.from(game.pf2e.ConditionManager.conditions.values()).filter(
            (c) => c.data.group !== "detection" && c.data.group !== "attitudes"
        );
        conditions
            .sort((a, b) => {
                return a.name.localeCompare(b.name);
            })
            .forEach((c) => {
                effects.push(
                    c.data.hud.img.useStatusName
                        ? `${CONFIG.PF2E.statusEffects.effectsIconFolder}${c.data.hud.statusName}.${CONFIG.PF2E.statusEffects.effectsIconFileType}`
                        : c.data.hud.img.value
                );
            });

        CONFIG.statusEffects = effects;
    }

    static async _hookOnRenderTokenHUD(_app: TokenHUD, html: JQuery, tokenData: foundry.data.TokenData) {
        const token = canvas.tokens.get(tokenData._id);

        if (!token) {
            throw ErrorPF2e(`StatusEffects | Could not find token with id: ${tokenData._id}`);
        }

        const $statusIcons = html.find("img.effect-control");

        const affectingConditions =
            token.actor?.itemTypes.condition
                .filter((condition) => condition.fromSystem && condition.isActive && condition.isInHUD)
                .map((condition) => condition.data) ?? [];

        html.find("div.status-effects").append('<div class="status-effect-summary"></div>');
        this.setPF2eStatusEffectControls(html, token);

        for (const icon of $statusIcons) {
            const $icon = $(icon);
            const src = $icon.attr("src") ?? "";

            if (src.includes(CONFIG.PF2E.statusEffects.effectsIconFolder)) {
                const statusName = this._getStatusFromImg(src);
                const condition = game.pf2e.ConditionManager.getConditionByStatusName(statusName);
                if (!condition) continue;

                $icon.attr("data-effect", statusName);
                $icon.attr("data-condition", condition.name);

                const effect = affectingConditions.find((e) => e.data.hud.statusName === statusName);

                if (condition.data.value.isValued) {
                    $icon.removeClass("effect-control").addClass("pf2e-effect-control");
                    // retrieve actor and the current effect value

                    $icon.wrap("<div class='pf2e-effect-img-container'></div>");
                    const $value = $("<div class='pf2e-effect-value' style='display:none'>0</div>");
                    $icon.parent().append($value);

                    if (effect !== undefined) {
                        $icon.attr("data-value", effect.data.value.value);

                        if (effect.data.value.isValued) {
                            $($value).removeAttr("style").text(effect.data.value.value);
                        }
                    }
                }

                if ($icon.hasClass("active") && effect === undefined) {
                    $icon.removeClass("active");
                } else if (!$icon.hasClass("active") && effect !== undefined) {
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
            const conditionName = $icon.attr("data-condition");

            if (conditionName && status) {
                // Icon is a condition

                const condition = appliedConditions.find((e) => e.name === conditionName)?.data;
                const conditionBase = game.pf2e.ConditionManager.getConditionByStatusName(status);

                if (conditionBase?.data.value.isValued) {
                    // Valued condition

                    const $value = $icon.siblings("div.pf2e-effect-value").first();

                    if ($icon.hasClass("active")) {
                        // icon is active.
                        if (
                            !condition ||
                            (condition && !condition.data.active) ||
                            (condition && !condition.data.value.isValued)
                        ) {
                            $icon.removeClass("active");
                            $value.attr("style", "display:none").text("0");
                        } else if (condition?.data.value.isValued) {
                            // Update the value

                            $value.text(condition.data.value.value);
                        }
                    } else if (condition && condition.data.active && condition.data.value.isValued) {
                        $icon.addClass("active");
                        $value.removeAttr("style").text(condition.data.value.value);
                    }
                } else if ($icon.hasClass("active")) {
                    // Toggle condition

                    // icon is active.
                    if (condition === undefined || (condition !== undefined && !condition.data.active)) {
                        // Remove active if no effect was found
                        // Or effect was found, but not active.

                        $icon.removeClass("active");
                    }
                } else if (condition !== undefined && condition.data.active) {
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
        type ConditionKey = keyof typeof StatusEffects.conditions;
        if (f.attr("src")?.includes(CONFIG.PF2E.statusEffects.effectsIconFolder)) {
            const statusName = f.attr("data-effect") ?? ("undefined" as ConditionKey);
            const conditions = StatusEffects.conditions;
            const conditionKeys = Object.keys(conditions);
            if (typeof statusName === "string" && conditionKeys.includes(statusName)) {
                const conditionInfo = conditions[statusName as ConditionKey];
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
        const status = $icon.attr("data-condition") ?? "undefined";

        if (!this.actor) return;

        const condition = this.actor.itemTypes.condition.find(
            (condition) =>
                condition.fromSystem &&
                condition.data.name === status &&
                condition.isInHUD &&
                condition.data.data.references.parent === undefined
        )?.data;

        if (event.type === "contextmenu") {
            // Right click, remove
            if (event.ctrlKey) {
                // CTRL key pressed.
                // Remove all conditions.

                this.statusEffectChanged = true;

                const conditionIds = this.actor.itemTypes.condition
                    .filter((condition) => condition.fromSystem && condition.data.data.base === status)
                    .map((condition) => condition.id);

                await game.pf2e.ConditionManager.removeConditionFromToken(conditionIds, this);
            } else if (condition?.data.value.isValued) {
                this.statusEffectChanged = true;
                await game.pf2e.ConditionManager.updateConditionValue(
                    condition._id,
                    this,
                    condition.data.value.value - 1
                );
                if (this.data.actorLink) {
                    StatusEffects.updateHUD($icon.parent().parent(), this.actor);
                }
            }
        } else if (event.type === "click") {
            this.statusEffectChanged = true;
            if (condition?.data.value.isValued) {
                await game.pf2e.ConditionManager.updateConditionValue(
                    condition._id,
                    this,
                    condition.data.value.value + 1
                );

                if (this.data.actorLink) {
                    StatusEffects.updateHUD($icon.parent().parent(), this.actor);
                }
            } else {
                const newCondition = game.pf2e.ConditionManager.getCondition(status).toObject();
                newCondition.data.sources.hud = true;

                await game.pf2e.ConditionManager.addConditionToToken(newCondition, this);
            }
        }
    }

    private static async toggleStatus(this: TokenPF2e, event: JQuery.TriggeredEvent): Promise<void> {
        event.preventDefault();
        event.stopImmediatePropagation();

        const $target = $(event.currentTarget);
        const status = $target.attr("data-condition") ?? "";
        const src = ($target.attr("src") ?? "") as ImagePath;

        if (event.shiftKey || src === "icons/svg/skull.svg") {
            return StatusEffects._onToggleOverlay(event, this);
        }

        const condition = this.actor?.itemTypes.condition.find(
            (condition) =>
                condition.data.name === status &&
                condition.isInHUD &&
                condition.data.data.references.parent === undefined
        )?.data;

        const conditionIds: string[] = [];
        if (event.type === "contextmenu") {
            // Right click, remove
            if (event.ctrlKey) {
                // CTRL key pressed.
                // Remove all conditions.
                this.actor?.itemTypes.condition
                    .filter((condition) => condition.fromSystem && condition.data.data.base === status)
                    .forEach((condition) => conditionIds.push(condition.id));
            } else if (condition) {
                conditionIds.push(condition._id);
            }

            if (conditionIds.length > 0) {
                this.statusEffectChanged = true;
                await game.pf2e.ConditionManager.removeConditionFromToken(conditionIds, this);
            } else if (this.data.effects.includes(src)) {
                await this.toggleEffect(src);
            }
        } else if (event.type === "click") {
            if (!condition && status) {
                const newCondition = game.pf2e.ConditionManager.getCondition(status).toObject();
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
    static async migrateStatusEffectUrls(chosenSetting: StatusEffectIconType) {
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
                        const statusName = this._getStatusFromImg(url);
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
        StatusEffects._updateStatusIcons();
    }

    /**
     * Helper to get status effect name from image url
     */
    static _getStatusFromImg(url: string) {
        return url.substring(
            url.lastIndexOf("/") + 1,
            url.length - CONFIG.PF2E.statusEffects.effectsIconFileType.length - 1
        );
    }

    /**
     * Add status effects to a token
     * Legacy function
     */
    static async setStatus(token: TokenPF2e, effects: any[] = []) {
        for await (const status of Object.values(effects)) {
            const statusName = status.name;
            const value = status.value;
            const source = status.source ? status.source : "PF2eStatusEffects.setStatus";

            const condition = game.pf2e.ConditionManager.getConditionByStatusName(statusName);

            if (!condition) {
                console.log(`PF2e System | '${statusName}' is not a vaild condition!`);
                continue;
            }

            const effect = token?.actor?.itemTypes?.condition?.find(
                (condition) =>
                    condition.data.data.source.value === source && condition.data.data.hud.statusName === statusName
            )?.data;

            if (typeof value === "string" && condition.data.value.isValued) {
                if (effect) {
                    // Has value with type string
                    let newValue = 0;

                    if (value.startsWith("+") || value.startsWith("-")) {
                        // Increment/decrement value
                        newValue = Number(effect.data.value.value) + Number(value);
                    } else {
                        // Set value
                        newValue = Number(value);
                    }

                    if (Number.isNaN(newValue)) {
                        console.log(`PF2e System | '${value}' is not a number!`);
                        continue;
                    }

                    await game.pf2e.ConditionManager.updateConditionValue(effect._id, token, newValue);
                } else if (Number(value) > 0) {
                    // No effect, but value is a number and is greater than 0.
                    // Add a new condition with the value.
                    const conditionData = condition.toObject();
                    conditionData.data.source.value = source;
                    conditionData.data.value.value = Number(value);
                    await game.pf2e.ConditionManager.addConditionToToken(conditionData, token);
                }
            } else if (!value) {
                // Value was not provided.

                if (condition.data.value.isValued) {
                    console.log(`PF2e System | '${statusName}' must have a value.`);
                    continue;
                }

                if (effect !== undefined && status.toggle) {
                    // Condition exists and toggle was true
                    // Remove it.
                    await game.pf2e.ConditionManager.removeConditionFromToken([effect._id], token);
                } else if (effect === undefined) {
                    // Effect does not exist.  Create it.
                    const conditionData = condition.toObject();
                    // Set the source to this function.
                    conditionData.data.source.value = source;
                    await game.pf2e.ConditionManager.addConditionToToken(conditionData, token);
                }
            }
        }
        this._createChatMessage(token);
    }
}
