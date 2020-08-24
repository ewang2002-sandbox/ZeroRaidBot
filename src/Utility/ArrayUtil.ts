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
}