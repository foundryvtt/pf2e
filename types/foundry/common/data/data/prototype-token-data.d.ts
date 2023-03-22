declare namespace foundry {
    module data {
        interface PrototypeTokenSource
            extends Omit<
                documents.TokenSource,
                "_id" | "actorId" | "actorData" | "x" | "y" | "elevation" | "effects" | "overlayEffect" | "hidden"
            > {
            name: string;
            randomImg: boolean;
        }

        class PrototypeToken<TParent extends documents.BaseActor = documents.BaseActor> extends abstract.Document {
            protected override _initialize(): void;

            override toJSON(): RawObject<this>;

            lightAnimation: AnimationData;

            bar1: documents.TokenBarData;

            bar2: documents.TokenBarData;
        }

        interface PrototypeToken extends Omit<PrototypeTokenSource, "bar1" | "bar2"> {
            readonly _source: PrototypeTokenSource;
        }
    }
}
