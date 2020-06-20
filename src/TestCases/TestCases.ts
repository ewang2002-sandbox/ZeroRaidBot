import { INameHistory } from "../Definitions/ICustomREVerification";

/**
 * All test cases.
 */
export module TestCasesNameHistory {
    export function withNames(): INameHistory[] {
        return [
            {
                name: "ConsoleMC",
                from: "",
                to: ""
            },
            {
                name: "Opre",
                from: "",
                to: ""
            }
        ];
    }

    export function withDefaultName(): INameHistory[] {
        return [
            {
                name: "ConsoleMC",
                from: "",
                to: ""
            } 
        ];
    }

    export function withNoNameChanges(): INameHistory[] {
        return [];
    }

    export function withNoCorrespondingNames(): INameHistory[] {
        return [
            {
                name: "ConsoleMC",
                from: "",
                to: ""
            },
            {
                name: "AOsakmdad",
                from: "",
                to: ""
            },
            {
                name: "OWEkisdS",
                from: "",
                to: ""
            }
        ]
    }
}