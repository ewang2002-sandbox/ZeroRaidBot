import { join } from "path";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { StringBuilder } from "./String/StringBuilder";
import { DateUtil } from "../Utility/DateUtil";

export class LoggerClient {
	private _allProcessLogs: [string, ProcessLogType][];
	private _allBotLogs: [string, BotLogType][];
	private _useDelay: boolean;
	private _lock: boolean = false;

	public constructor(delay: boolean = false) {
		this._useDelay = delay;
		this._allProcessLogs = [];
		this._allBotLogs = [];
	}

	public registerProcessEventLog(filePath: string[], event: ProcessLogType): LoggerClient {
		if (this._lock) {
			return this;
		}
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
		if (this._lock) {
			return this;
		}
		const pathToFile: string = join(process.cwd(), ...filePath);
		this._allBotLogs.push([pathToFile, event]);
		let fileName: string | undefined = filePath.pop();
		if (filePath.length !== 0 && !existsSync(join(...filePath)) && typeof fileName !== "undefined") {
			mkdirSync(join(...filePath));
		}
		return this;
	}

	public lock(): LoggerClient {
		if (this._lock) {
			return this;
		}
		this._lock = true;
		return this;
	}

	public sendBotEvent(eventType: BotLogType, info: any): void {
		const index: number = this._allBotLogs.findIndex(x => x[1] === eventType);
		if (index === -1) {
			return;
		}
		this.internalLog(index, info, eventType);
	}

	public sendProcessEvent(eventType: ProcessLogType, info: any): void {
		const index: number = this._allProcessLogs.findIndex(x => x[1] === eventType);
		if (index === -1) {
			return;
		}
		this.internalLog(index, info, eventType);
	}

	private internalLog(index: number, info: any, eventType: ProcessLogType | BotLogType) {
		const [path,] = this._allBotLogs[index];
		this.write(path, eventType, info);
	}

	public write(path: string, eventType: BotLogType | ProcessLogType, info: any): void {
		const sb: StringBuilder = new StringBuilder()
			.append(`[${DateUtil.getTime(new Date(), "America/Los_Angeles")}] ${eventType}`)
			.appendLine()
			.append(info)
			.appendLine()
			.appendLine();
		if (existsSync(path)) {
			writeFileSync(path, sb.toString());
		}
		else {
			const old: string = readFileSync(path).toString();
			writeFileSync(path, old + sb.toString());
		}
	}
}

export type ProcessLogType = "ERROR"
	| "INFO";


export type BotLogType = "SERVICE"
	// commands
	| "COMMAND_EXECUTED"
	| "COMMAND_FAILED"
	// afk checks
	| "AFK_CHECK_STARTED"
	| "AFK_CHECK_ENDED"
	| "AFK_CHECK_ABORTED"
	// headcounts
	| "HEADCOUNT_STARTED"
	| "HEADCOUNT_ENDED"
	// verification
	| "VERIFICATION_STARTED"
	| "VERIFICATION_ACTION"
	| "VERIFICATION_ENDED"
	| "VERIFICATION_ERRORED"
	| "REALMEYE_REQUEST_DATA"
	// manual verification
	| "MANUAL_VERIFICATION_COMPLETED"
	| "MANUAL_VERIFICATION_REJECTED"
	| "MANUAL_VERIFICATION_REQUEST"
	// modmail
	| "MODMAIL_SENT"
	| "MODMAIL_RESPONDED"
	| "MODMAIL_DELETED"
	// moderation
	| "SUSPENSION"
	| "BLACKLIST"
	| "MUTE"
	| "UNSUSPEND"
	| "UNBLACKLIST"
	| "UNMUTE";