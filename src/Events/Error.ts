import { DateUtil } from "../Utility/DateUtil";

export async function onError(error: Error): Promise<void> {
    console.error(`[EVENT] ERROR OCCURRED AT: ${DateUtil.getTime()}`);
    console.error(error);
    console.log("=====================");
}