export module DateUtil {
    /**
     * Gets the current time in a nice string format.
	 * @param {Date | number} [date] The date to choose, if any. 
     * @param {string} [timezone] The timezone, if applicable. Otherwise, UTC is used.
     * @returns {string} The current formatter date & time.
     */
	export function getTime(date: Date | number = new Date(), timezone: string = "Atlantic/Reykjavik"): string {
		if (!isValidTimeZone(timezone)) {
			return new Intl.DateTimeFormat([], {
				year: "numeric",
				month: "numeric",
				day: "numeric",
				hour: "numeric",
				minute: "numeric",
				second: "numeric",
			}).format(date);
		}
		const options: Intl.DateTimeFormatOptions = {
			timeZone: timezone,
			year: "numeric",
			month: "numeric",
			day: "numeric",
			hour: "numeric",
			minute: "numeric",
			second: "numeric",
		};
		return new Intl.DateTimeFormat([], options).format(date);
	}

    /**
     * Determines whether the given timezone is valid or not.
     * @param {string} tz The timezone to test.
     * @returns {boolean} Whether the timezone is valid.
     * @see https://stackoverflow.com/questions/44115681/javascript-check-if-timezone-name-valid-or-not
     * @see https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
     */
	export function isValidTimeZone(tz: string): boolean {
        /*
        if (Intl || !Intl.DateTimeFormat().resolvedOptions().timeZone) {
            throw 'Time zones are not available in this environment';
        }*/
		try {
			Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
			return true;
		}
		catch (ex) {
			return false;
		}
	}
}