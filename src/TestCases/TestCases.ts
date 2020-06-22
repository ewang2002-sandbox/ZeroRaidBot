import { INameHistory } from "../Definitions/ICustomREVerification";

/**
 * All test cases.
 */
export module TestCasesNameHistory {
    export function withNames(): INameHistory[] {
        return [
            {
                name: "",
                from: "",
                to: ""
            },
            {
                name: "",
                from: "",
                to: ""
            }
        ];
    }

    export function withDefaultName(): INameHistory[] {
        return [
            {
                name: "",
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
                name: "",
                from: "",
                to: ""
            },
            {
                name: "",
                from: "",
                to: ""
            },
            {
                name: "",
                from: "",
                to: ""
            }
        ]
    }
}