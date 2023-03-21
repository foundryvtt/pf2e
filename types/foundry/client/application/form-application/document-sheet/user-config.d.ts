export {};

declare global {
    /**
     * The Application responsible for configuring a single User document.
     * @extends {DocumentSheet}
     *
     * @param user      The User document being configured.
     * @param [options] Additional rendering options which modify the behavior of the form.
     */
    class UserConfig<TUser extends User> extends DocumentSheet<TUser> {
        static override get defaultOptions(): DocumentSheetOptions;

        override get title(): string;

        override getData(options: DocumentSheetOptions): Promise<UserConfigData<TUser>>;

        override activateListeners(html: JQuery): void;

        /** Handle changing the user avatar image by opening a FilePicker */
        protected _onEditAvatar(event: JQuery.TriggeredEvent): void;
    }

    interface UserConfigData<TUser extends User> extends DocumentSheetData<TUser> {
        user: User;
        actors: Actor<null>[];
    }
}
