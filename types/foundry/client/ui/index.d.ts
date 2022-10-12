import "./context";
import "./dialog";
import "./drag-drop";
import "./filepicker";
import "./notifications";
import "./tabs";
import "./tooltip";
import "./tour";

declare global {
    interface FoundryUI<
        TActor extends Actor,
        TActorDirectory extends ActorDirectory<TActor>,
        TItem extends Item,
        TChatLog extends ChatLog,
        TCompendiumDirectory extends CompendiumDirectory
    > {
        actors: TActorDirectory;
        chat: TChatLog;
        combat: CombatTracker<Combat>;
        compendium: TCompendiumDirectory;
        controls: SceneControls;
        items: ItemDirectory<TItem>;
        notifications: Notifications;
        settings: Settings;
        tables: RollTableDirectory;
        windows: Record<number, Application>;
    }
}
