import { ActorProxyPF2e } from "@actor";
import { AutomaticBonusProgression } from "@actor/character/automatic-bonus-progression.ts";
import { ItemProxyPF2e } from "@item";
import { ActiveEffectPF2e } from "@module/active-effect.ts";
import { ChatMessagePF2e } from "@module/chat-message/index.ts";
import { ActorsPF2e } from "@module/collection/actors.ts";
import { CombatantPF2e, EncounterPF2e } from "@module/encounter/index.ts";
import { MacroPF2e } from "@module/macro.ts";
import { UserPF2e } from "@module/user/index.ts";
import {
    AmbientLightDocumentPF2e,
    MeasuredTemplateDocumentPF2e,
    ScenePF2e,
    TileDocumentPF2e,
    TokenConfigPF2e,
    TokenDocumentPF2e,
} from "@scene/index.ts";
import { monkeyPatchFoundry } from "@scripts/🐵🩹.ts";
import { CheckRoll, StrikeAttackRoll } from "@system/check/index.ts";
import { DamageInstance, DamageRoll } from "@system/damage/roll.ts";
import { ArithmeticExpression, Grouping, InstancePool, IntermediateDie } from "@system/damage/terms.ts";

/** Not an actual hook listener but rather things to run on initial load */
export const Load = {
    listen(): void {
        // Assign document classes
        CONFIG.ActiveEffect.documentClass = ActiveEffectPF2e;
        CONFIG.Actor.collection = ActorsPF2e;
        CONFIG.Actor.documentClass = ActorProxyPF2e;
        CONFIG.AmbientLight.documentClass = AmbientLightDocumentPF2e;
        CONFIG.ChatMessage.documentClass = ChatMessagePF2e;
        CONFIG.Combat.documentClass = EncounterPF2e;
        CONFIG.Combatant.documentClass = CombatantPF2e;
        CONFIG.Item.documentClass = ItemProxyPF2e;
        CONFIG.Macro.documentClass = MacroPF2e;
        CONFIG.MeasuredTemplate.documentClass = MeasuredTemplateDocumentPF2e;
        CONFIG.Scene.documentClass = ScenePF2e;
        CONFIG.Tile.documentClass = TileDocumentPF2e;
        CONFIG.Token.documentClass = TokenDocumentPF2e;
        CONFIG.Token.prototypeSheetClass = TokenConfigPF2e;
        CONFIG.User.documentClass = UserPF2e;

        CONFIG.Canvas.darknessColor = 0x2d2d52; // Lightness increased by ~0.4/10 (Munsell value)
        CONFIG.Canvas.exploredColor = 0x262626; // Increased from 0 (black)

        CONFIG.Dice.rolls.push(CheckRoll, StrikeAttackRoll, DamageRoll, DamageInstance);
        for (const TermCls of [ArithmeticExpression, Grouping, InstancePool, IntermediateDie]) {
            CONFIG.Dice.termTypes[TermCls.name] = TermCls;
        }

        // Mystery Man but with a drop shadow
        Actor.DEFAULT_ICON = "systems/pf2e/icons/default-icons/mystery-man.svg";

        Roll.MATH_PROXY = mergeObject(Roll.MATH_PROXY, {
            eq: (a: number, b: number) => a === b,
            gt: (a: number, b: number) => a > b,
            gte: (a: number, b: number) => a >= b,
            lt: (a: number, b: number) => a < b,
            lte: (a: number, b: number) => a <= b,
            ne: (a: number, b: number) => a !== b,
            ternary: (condition: boolean | number, ifTrue: number, ifFalse: number) => (condition ? ifTrue : ifFalse),
        });

        // Make available immediately on load for module subclassing
        window.AutomaticBonusProgression = AutomaticBonusProgression;

        // Monkey-patch `TextEditor.enrichHTML`
        monkeyPatchFoundry();

        // Prevent buttons from retaining focus when clicked so that canvas hotkeys still work
        document.addEventListener("mouseup", (): void => {
            const element = document.activeElement;
            if (element instanceof HTMLButtonElement && !element.classList.contains("pm-dropdown")) {
                element.blur();
            }
        });

        // HMR for template files
        if (import.meta.hot) {
            import.meta.hot.on("template-update", async ({ path }: { path: string }): Promise<void> => {
                delete _templateCache[path];
                await getTemplate(path);
                const apps = [...Object.values(ui.windows), ui.sidebar];
                for (const app of apps) {
                    app.render();
                }
            });
        }
    },
};
