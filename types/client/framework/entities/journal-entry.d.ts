declare class Journal extends EntityCollection<JournalEntry> {
    /** @override */
    get entity(): 'JournalEntry';
}

declare interface JournalEntryData extends BaseEntityData {
    content: string;
    folder?: string | null;
    sort: number;
}

declare interface JournalEntryClassConfig extends EntityClassConfig<JournalEntry> {
    collection: Journal;
}

/**
 * The JournalEntry class
 */
declare class JournalEntry extends Entity {
    data: JournalEntryData;
    _data: JournalEntryData;

    /** @override */
    static get config(): JournalEntryClassConfig;

    /**
     * Return a reference to the Note instance for this JournalEntry in the current Scene, if any
     */
    sceneNote: Note;

    /**
     *
     */
    _onUpdate(): void;

    /**
     * If the JournalEntry has a pinned note on the canvas, this method will animate to that note The note will also be highlighted as if hovered upon by the mouse
     */
    panToNote(): void;

    /**
     * Show the JournalEntry to connected players.
     * By default the entry will only be shown to players who have permission to observe it.
     * If the parameter force is passed, the entry will be shown to all players regardless of normal permission.
     * @param mode Which JournalEntry mode to display? Default is text.
     * @param force Display the entry to all players regardless of normal permissions
     * @returns A Promise that resolves back to the shown entry once the request is processed
     */

    show(mode: string, force: boolean): Promise<JournalEntry>;
}
