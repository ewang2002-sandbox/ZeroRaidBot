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
}