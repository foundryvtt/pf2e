declare type UserRole = keyof typeof CONST.USER_ROLES_NAMES;
declare type UserRoleName = keyof typeof CONST.USER_ROLES;

declare module foundry {
    module data {
        interface UserSource extends abstract.DocumentSource {
            img: string;
            avatar: string;
            character?: string;
            color: string;
            hotbar: Record<number, string>;
            name: string;
            password: string;
            role: UserRole;
        }

        class UserData extends abstract.DocumentData {}

        interface UserData extends abstract.DocumentData, Omit<UserSource, '_id'> {
            _source: UserSource;
        }
    }
}
