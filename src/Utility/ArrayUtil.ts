export module ArrayUtil {
	/**
	 * Gets a random element from an array.
	 * @param {T} array The array. 
	 */
	export function getRandomElement<T>(array: T[]): T {
		return array[Math.floor(Math.random() * array.length)]
	}

	/**
	 * Shuffles an array. 
	 * @param {T[]} array The array to shuffle. 
	 */
	export function shuffle<T>(array: T[]): T[] {
		let j: number,
			x: T,
			i: number;
		for (i = array.length - 1; i > 0; i--) {
			j = Math.floor(Math.random() * (i + 1));
			x = array[i];
			array[i] = array[j];
			array[j] = x;
		}
		return array;
	}

	/**
	 * Removes duplicate entries from an array.
	 * @param {T[]} array The array to remove duplicates from. 
	 */
	export function removeDuplicate<T>(array: T[]): T[] {
		return array.filter((item, index) => array.indexOf(item) === index);
	}

	/**
	 * Returns the index of the last element in the array where predicate is true, and -1
	 * otherwise.
	 * @param array The source array to search in
	 * @param predicate find calls predicate once for each element of the array, in descending
	 * order, until it finds one where predicate returns true. If such an element is found,
	 * findLastIndex immediately returns that element index. Otherwise, findLastIndex returns -1.
	 */
	export function findLastIndex<T>(array: Array<T>, predicate: (value: T, index: number, obj: T[]) => boolean): number {
		let l: number = array.length;
		while (l >= 0) {
			if (predicate(array[l], l, array))
				return l;
			l--; 
		}
		return -1;
	}

	/**
     * Generates a leaderboard array (a 2D array with the first element being the place and the second being the value).
     * @param data The data.
	 * @param func The function that decides what data will be sorted.
	 * @param compareFn How to compare each element. 
     */
    export function generateLeaderboardArray<T>(
		data: T[],
		func: (val: T) => number,
		compareFn: ((a: T, b: T) => number) = (x, y) => func(y) - func(x)
	): [number, T][] {
        data.sort(compareFn);
        let place: number = 1;
        let diff: number = 0;
        let lastIndexOfData: number = 0;
        let returnData: [number, T][] = [];

        for (let i = 0; i < data.length; i++) {
            if (i === 0) {
                returnData.push([place, data[i]]);
                continue;
			}
			
			const val: number = func(data[i]); 

            if (val === func(returnData[lastIndexOfData][1])) {
                returnData.push([place, data[i]]);
                diff++;
            }
            else {
                place += diff + 1;
                diff = 0;
                returnData.push([place, data[i]]);
            }
            lastIndexOfData++;
        }

        return returnData;
	}
	
	/**
	 * Breaks up an array of elements into an array of human-readable string content with a specific length restriction per element. Note that you will have to check and make sure the number of elements in this array doesn't exceed 25.
	 * @param {T[]} array The array of elements.
	 * @param func The function to convert an element into a string.
	 * @param {number} [maxLenPerElement = 1016] The maximum length of a string per element in the fields array. This should be greater than 300.
	 */
	export function arrayToStringFields<T>(
		array: T[],
		func: (i: number, element: T) => string,
		maxLenPerElement: number = 1016
	): string[] {
		if (maxLenPerElement < 300) {
			maxLenPerElement = 300;
		}

		const returnArr: string[] = [];
		let str: string = "";

		for (let i = 0; i < array.length; i++) {
			const tempString: string = func(i, array[i]);
			// max elements you can have is 25
			if (returnArr.length <= 24) {
				if (str.length + tempString.length > maxLenPerElement) {
					returnArr.push(str);
					str = tempString;
				}
				else {
					str += tempString;
				}
			}
		}

		if (str.length !== 0 && str !== "") {
			returnArr.push(str);
		}

		return returnArr;
	}
}