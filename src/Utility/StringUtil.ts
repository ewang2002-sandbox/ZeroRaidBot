export namespace StringUtil {
	/**
	 * Applies three backticks on each side of a string (for codeblocks in DiscordJS).
	 * @param {string} msg The string.
	 * @returns {string} The modified string.
	 */
	export function applyCodeBlocks(msg: any): string { 
		return "```\n" + msg + "```";
	}

	/**
	 * Removes symbols from a string.
	 * @param {string} str The string.
	 * @returns {string} The string without any symbols. 
	 */
	export function removeSymbols(str: string): string {
		return str.replace(/[^A-Z0-9]/ig, "");
	}
	
	/**
	 * Returns a fraction between 0 and 1, which indicates the degree of similarity between the two strings. 0 indicates completely different strings, 1 indicates identical strings. The comparison is case-sensitive. Based on Dice's Coefficient, which is mostly better than Levenshtein Distance.
	 * @param {string} first The first string.
	 * @param {string} second The second string.
	 * @returns {number} A fraction from 0 to 1, both inclusive. Higher number indicates more similarity.
	 */
	export function compareTwoStrings(first: string, second: string): number {
		first = first.replace(/\s+/g, '');
		second = second.replace(/\s+/g, '');

		if (!first.length && !second.length) {
			return 1; // if both are empty strings
		}
		if (!first.length || !second.length) {
			return 0; // if only one is empty string
		}
		if (first === second) {
			return 1; // identical
		}
		if (first.length === 1 && second.length === 1) {
			return 0; // both are 1-letter strings
		}
		if (first.length < 2 || second.length < 2) {
			return 0; // if either is a 1-letter string
		}

		let firstBigrams: Map<string, any> = new Map();

		for (let i = 0; i < first.length - 1; i++) {
			const bigram: string = first.substring(i, i + 2);
			const count: number = firstBigrams.has(bigram)
				? firstBigrams.get(bigram) + 1
				: 1;

			firstBigrams.set(bigram, count);
		}

		let intersectionSize: number = 0;
		for (let i = 0; i < second.length - 1; i++) {
			const bigram: string = second.substring(i, i + 2);
			const count: number = firstBigrams.has(bigram)
				? firstBigrams.get(bigram)
				: 0;

			if (count > 0) {
				firstBigrams.set(bigram, count - 1);
				intersectionSize++;
			}
		}

		return (2.0 * intersectionSize) / (first.length + second.length - 2);
	}

	/**	
	 * Returns a string consisting of all symbols BEFORE any letters.	
	 * @param {string} str The string. 	
	 */	
	export function getSymbolsFromStartOfString(str: string): string {	
		let symbols: string = "";	
		for (let i = 0; i < str.length; i++) {	
			if (!/^[A-Za-z]+$/.test(str[i])) {	
				symbols += str[i];	
				continue;	
			}	
			else {	
				break;	
			}	
		}	

		return symbols;	
	}

	/**
	 * Breaks up an array of elements into an array of human-readable string content with a specific length restriction per element.
	 * @param {T[]} array The array of elements.
	 * @param func The function to convert an element into a string.
	 * @param {number} [maxLenPerElement = 1016] The maximum length of a string per element in the fields array.
	 */
	export function arrayToStringFields<T>(
		array: T[], 
		func: (i: number, element: T) => string,
		maxLenPerElement: number = 1016
	): string[] {
		const returnArr: string[] = [];
		let str: string = "";
		
		for (let i = 0; i < array.length; i++) {
			const tempString: string = func(i, array[i]);
			if (str.length + tempString.length > maxLenPerElement) {
				returnArr.push(str);
				str = tempString;
			}
			else {
				str += tempString;
			}
		}

		if (returnArr.length === 0 && str.length !== 0) {
			returnArr.push(str);
		}

		return returnArr;
	}
}