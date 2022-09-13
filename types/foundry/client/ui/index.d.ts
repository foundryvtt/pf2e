import "./context";
import "./dialog";
import "./drag-drop";
import "./filepicker";
import "./notifications";
import "./tabs";
import "./tooltip";

declare global {
    interface FoundryUI<
        TActor extends Actor,
        TItem extends Item,
        TChatLog extends ChatLog,
        TCompendiumDirectory extends CompendiumDirectory
    > {
        actors: ActorDirectory<TActor>;
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
