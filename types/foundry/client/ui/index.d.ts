import "./context";
import "./dialog";
import "./drag-drop";
import "./filepicker";
import "./notifications";
import "./tabs";

declare global {
    interface FoundryUI<TCompendiumDirectory extends CompendiumDirectory> {
        actors: ActorDirectory;
        chat: ChatLog;
        combat: CombatTracker<Combat>;
        compendium: TCompendiumDirectory;
        controls: SceneControls;
        items: ItemDirectory;
        notifications: Notifications;
        settings: Settings;
        tables: RollTableDirectory;
        windows: Record<number, Application>;
    }
}
