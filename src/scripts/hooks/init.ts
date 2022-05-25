import { MystifiedTraits } from "@item/data/values";
import { ChatLogPF2e, CompendiumDirectoryPF2e, EncounterTrackerPF2e } from "@module/apps/ui";
import { HotbarPF2e } from "@module/apps/ui/hotbar";
import {
    AmbientLightPF2e,
    LightingLayerPF2e,
    MeasuredTemplatePF2e,
    SightLayerPF2e,
    TemplateLayerPF2e,
    TokenLayerPF2e,
    TokenPF2e,
} from "@module/canvas";
import { PlayerConfigPF2e } from "@module/user/player-config";
import { registerHandlebarsHelpers } from "@scripts/handlebars";
import { registerKeybindings } from "@scripts/register-keybindings";
import { registerTemplates } from "@scripts/register-templates";
import { SetGamePF2e } from "@scripts/set-game-pf2e";
import { Check } from "@system/check";
import { registerSettings } from "@system/settings";
import { PF2ECONFIG } from "../config";

export const Init = {
    listen: (): void => {
        Hooks.once("init", () => {
            console.log("PF2e System | Initializing Pathfinder 2nd Edition System");

            // Support v10 `system` property in v9
            if (game.release.generation === 9) {
                for (const Document of [Actor, Item]) {
                    Object.defineProperty(Document.prototype, "system", {
                        get() {
                            return this.data.data;
                        },
                        configurable: true,
                        enumerable: true,
                    });
                }
            }

            CONFIG.PF2E = PF2ECONFIG;
            CONFIG.debug.ruleElement ??= false;

            CONFIG.Dice.rolls.push(Check.Roll, Check.StrikeAttackRoll);

            // Assign canvas layer and placeable classes
            CONFIG.AmbientLight.layerClass = LightingLayerPF2e;
            CONFIG.AmbientLight.objectClass = AmbientLightPF2e;

            CONFIG.MeasuredTemplate.objectClass = MeasuredTemplatePF2e;
            CONFIG.MeasuredTemplate.layerClass = TemplateLayerPF2e;
            CONFIG.MeasuredTemplate.defaults.angle = 90;
            CONFIG.MeasuredTemplate.defaults.width = 1;

            CONFIG.Token.objectClass = TokenPF2e;
            CONFIG.Token.layerClass = TokenLayerPF2e;

            CONFIG.Canvas.layers.lighting.layerClass = LightingLayerPF2e;
            CONFIG.Canvas.layers.sight.layerClass = SightLayerPF2e;
            CONFIG.Canvas.layers.templates.layerClass = TemplateLayerPF2e;
            CONFIG.Canvas.layers.tokens.layerClass = TokenLayerPF2e;

            // Make darkness visibility a little more appropriate for basic map use
            CONFIG.Canvas.lightLevels.dim = 0.25;
            CONFIG.Canvas.darknessColor = PIXI.utils.rgb2hex([0.25, 0.25, 0.4]);
            CONFIG.Canvas.exploredColor = PIXI.utils.rgb2hex([0.6, 0.6, 0.6]);

            // Automatically advance world time by 6 seconds each round
            CONFIG.time.roundTime = 6;
            // Decimals are 😠
            CONFIG.Combat.initiative.decimals = 0;

            // Assign the PF2e Sidebar subclasses
            CONFIG.ui.combat = EncounterTrackerPF2e;
            CONFIG.ui.chat = ChatLogPF2e;
            CONFIG.ui.compendium = CompendiumDirectoryPF2e;
            CONFIG.ui.hotbar = HotbarPF2e;

            // Remove fonts available only on Windows 10/11
            CONFIG.fontFamilies = CONFIG.fontFamilies.filter((f) => !["Courier", "Helvetica", "Times"].includes(f));

            // Insert templates into DOM tree so Applications can render into
            if (document.querySelector("#ui-top") !== null) {
                // Template element for effects-panel
                const uiTop = document.querySelector("#ui-top");
                const template = document.createElement("template");
                template.setAttribute("id", "pf2e-effects-panel");
                uiTop?.insertAdjacentElement("afterend", template);
            }

            // configure the bundled TinyMCE editor with PF2-specific options
            CONFIG.TinyMCE.extended_valid_elements = "pf2-action[action|glyph]";
            CONFIG.TinyMCE.content_css = CONFIG.TinyMCE.content_css.concat("systems/pf2e/styles/main.css");
            CONFIG.TinyMCE.style_formats = (CONFIG.TinyMCE.style_formats ?? []).concat({
                title: "PF2E",
                items: [
                    {
                        title: "Icons A D T F R",
                        inline: "span",
                        classes: ["pf2-icon"],
                        wrapper: true,
                    },
                    {
                        title: "Inline Header",
                        block: "h4",
                        classes: "inline-header",
                    },
                    {
                        title: "Info Block",
                        block: "section",
                        classes: "info",
                        wrapper: true,
                        exact: true,
                        merge_siblings: false,
                    },
                    {
                        title: "Stat Block",
                        block: "section",
                        classes: "statblock",
                        wrapper: true,
                        exact: true,
                        merge_siblings: false,
                    },
                    {
                        title: "Trait",
                        block: "section",
                        classes: "traits",
                        wrapper: true,
                    },
                    {
                        title: "Written Note",
                        block: "p",
                        classes: "message",
                    },
                    {
                        title: "GM Text Block",
                        block: "div",
                        wrapper: true,
                        attributes: {
                            "data-visibility": "gm",
                        },
                    },
                    {
                        title: "GM Text Inline",
                        inline: "span",
                        attributes: {
                            "data-visibility": "gm",
                        },
                    },
                ],
            });

            // Soft-set system-preferred core settings until they've been explicitly set by the GM
            const schema = foundry.data.PrototypeTokenData.schema;
            schema.displayName.default = schema.displayBars.default = CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER;

            // Register stuff with the Foundry client
            registerSettings();
            registerKeybindings();
            registerTemplates();
            registerHandlebarsHelpers();

            PlayerConfigPF2e.hookOnRenderSettings();
            MystifiedTraits.compile();

            // Create and populate initial game.pf2e interface
            SetGamePF2e.onInit();
        });
    },
};
