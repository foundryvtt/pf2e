export {};

declare global {
    type UserRole = keyof typeof CONST.USER_ROLES_NAMES;
    module foundry {
        module data {
            interface UserSource extends foundry.abstract.DocumentSource {
                img: string;
                avatar: string;
                character?: string;
                color: string;
                hotbar: Record<number, string>;
                name: string;
                password: string;
                role: UserRole;
            }

            class UserData extends foundry.abstract.DocumentData {}
            interface UserData extends foundry.abstract.DocumentData, Omit<UserSource, '_id'> {
                _source: UserSource;
            }
        }
    }
}
