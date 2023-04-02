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
        TActor extends Actor<null>,
        TActorDirectory extends ActorDirectory<TActor>,
        TItem extends Item<null>,
        TChatLog extends ChatLog,
        TCompendiumDirectory extends CompendiumDirectory,
        TCombatTracker extends CombatTracker<Combat | null>
    > {
        actors: TActorDirectory;
        chat: TChatLog;
        combat: TCombatTracker;
        compendium: TCompendiumDirectory;
        controls: SceneControls;
        items: ItemDirectory<TItem>;
        notifications: Notifications;
        settings: Settings;
        tables: RollTableDirectory;
        windows: Record<number, Application>;
    }
}
