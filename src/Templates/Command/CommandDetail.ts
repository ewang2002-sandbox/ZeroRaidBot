export class CommandDetail {
	/**
	 * The formal, human-readable, command name.
	 */
	private formalCommandName: string;

	/**
	 * The main command name (how a user would primarily call this command.)
	 */
	private mainCommandName: string;

	/**
	 * Any additional aliases (other ways to call the command.)
	 */
	private aliases: string[];

	/**
	 * Description of the command (what does this command do?)
	 */
	private description: string;

	/**
	 * Information on how the command is used. In general, use [] for optional parameters and <> for mandatory parameters.
	 */
	private usage: string[];

	/**
	 * Examples on how the command is used. 
	 */
	private examples: string[];

	/**
	 * The minimum amount of required arguments.
	 */
	private argumentLength: number;

	/**
	 * A class that contains information about a command. 
	 * @param {string} formalCommandName The formal, human-readable, command name.
	 * @param {string} mainCommandName The name of the command. 
	 * @param {string[]} aliases Aliases (additional names) of the command, if any. 
	 * @param {string} description Description of the command. 
	 * @param {string[]} usage Information on how the command is used. 
	 * @param {string[]} examples Examples on how the command is used. 
	 * @param {number} argumentLength The minimum amount of required arguments.  
	 */
	public constructor(
		formalCommandName: string,
		mainCommandName: string,
		aliases: string[],
		description: string,
		usage: string[],
		examples: string[],
		argumentLength: number
	) {
		this.formalCommandName = formalCommandName;
		this.mainCommandName = mainCommandName;
		this.aliases = aliases;
		this.description = description;
		this.usage = usage;
		this.examples = examples;
		this.argumentLength = argumentLength;
	}

	/**
	 * Gets the main command name (in other words, how a user should primarily call this command).
	 * @returns {string} The main command name.
	 */
	public getMainCommandName(): string {
		return this.mainCommandName;
	}

	/**
	 * Gets the command aliases. If no aliases are defined, this will return an empty array.
	 * @returns {string[]} The aliases for this command.
	 */
	public getAliases(): string[] {
		return this.aliases;
	}

	/**
	 * Gets the description of the command (information about the command).
	 * @returns {string} The description of the command. 
	 */
	public getDescription(): string {
		return this.description;
	}

	/**
	 * Gets the usages for the command.
	 * @returns {string[]} The command usages. 
	 */
	public getUsage(): string[] {
		return this.usage;
	}

	/**
	 * Gets the examples of how to use the command.
	 * @returns {string[]} Examples of command usage. 
	 */
	public getExamples(): string[] {
		return this.examples;
	}

	/**
	 * Gets the number of required arguments.
	 * @returns {number} The number of required arguments. 
	 */
	public getArgumentLength(): number {
		return this.argumentLength;
	}

	/**
	 * Returns the formal, human-readable, command name.
	 * @returns {string} The formal, human-readable, command name.
	 */
	public getFormalCommandName(): string {
		return this.formalCommandName;
	}

}