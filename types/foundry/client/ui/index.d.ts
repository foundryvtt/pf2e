export {};

declare global {
    const ui: {
        actors: ActorDirectory;
        chat: ChatLog;
        combat: CombatTracker<Combat>;
        compendium: CompendiumDirectory;
        controls: SceneControls;
        items: ItemDirectory;
        notifications: Notifications;
        settings: Settings;
        tables: RollTableDirectory;
        windows: Record<number, Application>;
    };
}
