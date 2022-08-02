declare module foundry {
    module documents {
        /**
         * The Token document model.
         * @param data Initial data from which to construct the document.
         * @property data The constructed data object for the document.
         */
        class BaseToken extends abstract.Document {
            readonly actorLink: boolean;

            img: VideoPath;

            displayName: TokenDisplayMode;

            disposition: TokenDisposition;

            width: number;

            height: number;

            sightAngle: number;

            scale: number;

            light: foundry.data.LightData<this>;

            static override get schema(): typeof data.TokenData;

            static override get metadata(): TokenMetadata;

            /** Is a user able to update an existing Token? */
            protected static _canUpdate(user: BaseUser, doc: BaseToken, data: data.TokenData): boolean;
        }

        interface BaseToken extends abstract.Document {
            readonly data: data.TokenData<this>;

            readonly parent: BaseScene | null;
        }

        interface TokenMetadata extends abstract.DocumentMetadata {
            name: "Token";
            collection: "tokens";
            label: "DOCUMENT.Token";
            isEmbedded: true;
            permissions: Omit<abstract.DocumentMetadata["permissions"], "create"> & {
                create: "TOKEN_CREATE";
            };
        }
    }
}
