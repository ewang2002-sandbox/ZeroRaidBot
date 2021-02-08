import { DateUtil } from "../Utility/DateUtil";

export async function onError(error: Error): Promise<void> {
    console.error(`[EVENT] ERROR OCCURRED AT: ${DateUtil.getTime(new Date(), "America/Los_Angeles")}`);
    console.error(error);
    console.info("=====================");
}