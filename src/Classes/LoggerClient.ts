import { join, sep } from "path";
import { existsSync, mkdirSync, writeFileSync } from "fs";

export class LoggerClient {
	private _allProcessLogs: [string, ProcessLogType][];
	private _allBotLogs: [string, BotLogType][];
	private _delay: boolean;

	private _queue: [any, string][];

	public constructor(delay: boolean = false) {
		this._delay = delay; 
		this._allProcessLogs = [];
		this._queue = [];
		this._allBotLogs = [];
	}

	public registerProcessEventLog(filePath: string[], event: ProcessLogType): LoggerClient {
		const pathToFile: string = join(process.cwd(), ...filePath);
		this._allProcessLogs.push([pathToFile, event]);
		// remove last element -- the name of file
		let fileName: string | undefined = filePath.pop(); 
		if (filePath.length !== 0 && !existsSync(join(...filePath)) && typeof fileName !== "undefined") {
			mkdirSync(join(...filePath));
		}
		return this; 
	}

	public registerBotEventLog(filePath: string[], event: BotLogType): LoggerClient {
		const pathToFile: string = join(process.cwd(), ...filePath);
		this._allBotLogs.push([pathToFile, event]);
		let fileName: string | undefined = filePath.pop(); 
		if (filePath.length !== 0 && !existsSync(join(...filePath)) && typeof fileName !== "undefined") {
			mkdirSync(join(...filePath));
		}
		return this; 
	}

	public sendBotEvent(eventType: BotLogType, info: any): void {
		
	}

	public sendProcessEvent(eventType: ProcessLogType, info: any): void {

	}

	public write(info: any, path: string): void {

	}
}

export enum ProcessLogType {
	ERROR,
	INFO
}

export enum BotLogType {
	SERVICE,
	// commands
	COMMAND_EXECUTED,
	COMMAND_FAILED,
	// afk checks
	AFK_CHECK_STARTED,
	AFK_CHECK_ENDED,
	AFK_CHECK_ABORTED,
	// headcounts
	HEADCOUNT_STARTED,
	HEADCOUNT_ENDED,
	// verification
	VERIFICATION_STARTED,
	VERIFICATION_ACTION,
	VERIFICATION_ENDED,
	VERIFICATION_ERRORED,
	REALMEYE_REQUEST_DATA,
	// manual verification
	MANUAL_VERIFICATION_COMPLETED,
	// modmail
	MODMAIL_SENT,
	MODMAIL_RESPONDED,
	MODMAIL_DELETED,
	// moderation
	SUSPENSION,
	BLACKLIST,
	MUTE,
	UNSUSPEND,
	UNBLACKLIST,
	UNMUTE
}