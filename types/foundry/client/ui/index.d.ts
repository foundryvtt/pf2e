import "./context.js";
import "./dialog.js";
import "./drag-drop.js";
import "./filepicker.js";
import "./notifications.js";
import "./tabs.js";
import "./tooltip.js";
import "./tour.js";

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
