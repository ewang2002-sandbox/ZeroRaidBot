export namespace NumberUtil {
    /**
     * Gets a random integer from `min` (inclusive) to `max` (inclusive).
     * @param {number} min The minimum number in the range. 
     * @param {number} max The maximum number in the range. 
     * @returns {number} The random number. 
     */
    export function getRandomInt(min: number, max: number): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Finds the first missing number from `min` to `max` in in an array of numbers.
     * @param {number[]} arr The array of all numbers. 
     * @param {number} min The minimum number.  
     * @param {number} max The maximum number. 
     * @returns {number} The first missing number; -1 otherwise. 
     */
    export function findFirstMissingNumber(arr: number[], min: number, max: number): number {
        arr = arr.sort();
        for (let i = min; i <= max; i++) {
            if (arr.indexOf(i) === -1) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Parses a set of numbers from a string.
     * @param {number} str The number(s). Use commas as separators and a hyphen to indicate a range.
     * @returns {number[]} The set of parsed numbers.
     */
    export function parseNumbersFromString(str: string): number[] {
        const returnVals: number[] = [];
        const splitVals: string[] = str.split(",").map(x => x.trim());
        for (const val of splitVals) {
            // range
            if (val.includes("-")) {
                const unparsedRangeVals: string[] = val.split("-")
                    .filter(x => x.length !== 0);
                // there should be two numbers
                const min: number = Number.parseInt(unparsedRangeVals[0]);
                const max: number = Number.parseInt(unparsedRangeVals[1]);
                if (Number.isNaN(min) || Number.isNaN(max)) {
                    continue;
                }

                for (let i = min; i <= max; i++) {
                    returnVals.push(i);
                }
            }
            else {
                const parsedNum: number = Number.parseInt(val);
                if (Number.isNaN(parsedNum)) {
                    continue;
                }
                returnVals.push(parsedNum);
            }
        }
        return returnVals;
    }
}