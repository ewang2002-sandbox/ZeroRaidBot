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
                name: "Testing",
                from: "",
                to: ""
            },
            {
                name: "BigEpic",
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
}