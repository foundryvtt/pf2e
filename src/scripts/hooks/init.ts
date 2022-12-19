import { MystifiedTraits } from "@item/data/values";
import { HotbarPF2e } from "@module/apps/hotbar";
import { ActorDirectoryPF2e, ChatLogPF2e, CompendiumDirectoryPF2e, EncounterTrackerPF2e } from "@module/apps/sidebar";
import {
    AmbientLightPF2e,
    EffectsCanvasGroupPF2e,
    LightingLayerPF2e,
    MeasuredTemplatePF2e,
    TemplateLayerPF2e,
    TokenLayerPF2e,
    TokenPF2e,
} from "@module/canvas";
import { setPerceptionModes } from "@module/canvas/perception/modes";
import { PF2ECONFIG } from "@scripts/config";
import { registerHandlebarsHelpers } from "@scripts/handlebars";
import { registerFonts } from "@scripts/register-fonts";
import { registerKeybindings } from "@scripts/register-keybindings";
import { registerTemplates } from "@scripts/register-templates";
import { SetGamePF2e } from "@scripts/set-game-pf2e";
import { registerSettings } from "@system/settings";
import { htmlQueryAll } from "@util";

export const Init = {
    listen: (): void => {
        Hooks.once("init", () => {
            console.log("PF2e System | Initializing Pathfinder 2nd Edition System");

            CONFIG.PF2E = PF2ECONFIG;
            CONFIG.debug.ruleElement ??= false;

            // Assign canvas layer and placeable classes
            CONFIG.AmbientLight.layerClass = LightingLayerPF2e;
            CONFIG.AmbientLight.objectClass = AmbientLightPF2e;

            CONFIG.MeasuredTemplate.objectClass = MeasuredTemplatePF2e;
            CONFIG.MeasuredTemplate.layerClass = TemplateLayerPF2e;
            CONFIG.MeasuredTemplate.defaults.angle = 90;
            CONFIG.MeasuredTemplate.defaults.width = 1;

            CONFIG.Token.objectClass = TokenPF2e;
            CONFIG.Token.layerClass = TokenLayerPF2e;

            CONFIG.Canvas.groups.effects.groupClass = EffectsCanvasGroupPF2e;
            CONFIG.Canvas.layers.lighting.layerClass = LightingLayerPF2e;
            CONFIG.Canvas.layers.templates.layerClass = TemplateLayerPF2e;
            CONFIG.Canvas.layers.tokens.layerClass = TokenLayerPF2e;

            setPerceptionModes();

            // Automatically advance world time by 6 seconds each round
            CONFIG.time.roundTime = 6;
            // Decimals are 😠
            CONFIG.Combat.initiative.decimals = 0;

            // Assign the PF2e Sidebar subclasses
            CONFIG.ui.actors = ActorDirectoryPF2e;
            CONFIG.ui.combat = EncounterTrackerPF2e;
            CONFIG.ui.chat = ChatLogPF2e;
            CONFIG.ui.compendium = CompendiumDirectoryPF2e;
            CONFIG.ui.hotbar = HotbarPF2e;

            // The condition in Pathfinder 2e is "blinded" rather than "blind"
            CONFIG.specialStatusEffects.BLIND = "blinded";

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

            // Register custom enricher
            CONFIG.TextEditor.enrichers.push({
                pattern: new RegExp("@(Check|Localize|Template)\\[([^\\]]+)\\](?:{([^}]+)})?", "g"),
                enricher: (match, options) => game.pf2e.TextEditor.enrichString(match, options),
            });

            // Soft-set system-preferred core settings until they've been explicitly set by the GM
            // const schema = foundry.data.PrototypeToken.schema;
            // schema.displayName.default = schema.displayBars.default = CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER;

            // Register stuff with the Foundry client
            registerFonts();
            registerHandlebarsHelpers();
            registerKeybindings();
            registerSettings();
            registerTemplates();

            MystifiedTraits.compile();

            // Create and populate initial game.pf2e interface
            SetGamePF2e.onInit();

            // Disable tagify style sheets from modules
            for (const element of htmlQueryAll(document.head, "link[rel=stylesheet]")) {
                const href = element.getAttribute("href");
                if (href?.startsWith("modules/") && href.endsWith("tagify.css")) {
                    element.setAttribute("disabled", "");
                }
            }
        });
    },
};
