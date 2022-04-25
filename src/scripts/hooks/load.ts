import { ActorPF2e } from "@actor";
import { AutomaticBonusProgression } from "@actor/character/automatic-bonus-progression";
import { ItemPF2e } from "@item";
import { ActiveEffectPF2e } from "@module/active-effect";
import { ChatMessagePF2e } from "@module/chat-message";
import { ActorsPF2e } from "@module/collection/actors";
import { CombatantPF2e, EncounterPF2e } from "@module/encounter";
import { FogExplorationPF2e } from "@module/fog-exploration";
import { FolderPF2e } from "@module/folder";
import { MacroPF2e } from "@module/macro";
import { UserPF2e } from "@module/user";
import {
    AmbientLightDocumentPF2e,
    MeasuredTemplateDocumentPF2e,
    ScenePF2e,
    TileDocumentPF2e,
    TokenConfigPF2e,
    TokenDocumentPF2e,
} from "@scene";

/** Not an actual hook listener but rather things to run on initial load */
export const Load = {
    listen(): void {
        // Assign document classes
        CONFIG.ActiveEffect.documentClass = ActiveEffectPF2e;
        CONFIG.Actor.collection = ActorsPF2e;
        CONFIG.Actor.documentClass = ActorPF2e;
        CONFIG.AmbientLight.documentClass = AmbientLightDocumentPF2e;
        CONFIG.ChatMessage.documentClass = ChatMessagePF2e;
        CONFIG.Combat.documentClass = EncounterPF2e;
        CONFIG.Combatant.documentClass = CombatantPF2e;
        CONFIG.FogExploration.documentClass = FogExplorationPF2e;
        CONFIG.Folder.documentClass = FolderPF2e;
        CONFIG.Item.documentClass = ItemPF2e;
        CONFIG.Macro.documentClass = MacroPF2e;
        CONFIG.MeasuredTemplate.documentClass = MeasuredTemplateDocumentPF2e;
        CONFIG.Scene.documentClass = ScenePF2e;
        CONFIG.Tile.documentClass = TileDocumentPF2e;
        CONFIG.Token.documentClass = TokenDocumentPF2e;
        CONFIG.Token.prototypeSheetClass = TokenConfigPF2e;
        CONFIG.User.documentClass = UserPF2e;

        // Make available immediately on load for module subclassing
        window.AutomaticBonusProgression = AutomaticBonusProgression;
    },
};
