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
}