import { AxiosResponse } from "axios";
import { Zero } from "../../Zero";
import { PConstants } from "../PConstants/PConstants";
import { IPingResult } from "../Types/Ping/IPingResult";
import { IBaseRealmEyeResponse } from "../Types/RealmEye/IBaseRealmEyeResponse";

export module InternalPrivateApi {
    export type RealmEyeEndpoint = "player"
        | "pet"
        | "exaltations"
        | "graveyard"
        | "graveyard_summary"
        | "rank_history"
        | "name_history"
        | "guild_history";

    let InitChecker: boolean = false;
    export let PrivateApiAvailable: boolean = false;

    /**
     * Checks to see if the private API can be used for this instance. This will be checked every 10 minutes.
     */
    export async function initPrivateApiPinger(): Promise<void> {
        if (InitChecker) {
            return;
        }
        InitChecker = true;

        const check = async (): Promise<void> => {
            try {
                const initLookUp: AxiosResponse<IPingResult> = await Zero.AxiosClient.get<IPingResult>(`${PConstants.BaseUrl}/ping`);
                PrivateApiAvailable = initLookUp.status === 200 && initLookUp.data.statusCode === 200;
            }
            catch (e) {
                PrivateApiAvailable = false;
            }
        };

        await check();

        setInterval(async () => {
            await check();
        }, 10 * 60 * 1000);
    }

    /**
     * Requests data from the private RealmEye API.
     * @param {RealmEyeEndpoint} endpoint The endpoint to get data from.
     * @param {string} name The name of the person to look up.
     * @param {any[]} optionalArgs Any optional arguments.
     * @returns {(T | null)} If no issues, whatever T is. Otherwise, null.
     */
    export async function requestRealmEye<T extends IBaseRealmEyeResponse>(endpoint: RealmEyeEndpoint,
        name: string, ...optionalArgs: any[]): Promise<T | null> {
        if (name.length === 0) {
            return null;
        }

        const args: string = optionalArgs.join("/");
        try {
            const res: AxiosResponse<T> = await Zero.AxiosClient.get<T>(`${PConstants.BaseUrl}/realmeye/${endpoint}/${name}/${args}`);
            if (res.status === 200) {
                return res.data;
            }

            return null;
        }
        catch (e) {
            return null;
        }
    }

    /**
     * Parses a /who screenshot.
     * @param {string} url The url of the image to parse.
     * @returns {string[]} An array of people present in the /who screenshot. 
     */
    export async function parseWho(url: string): Promise<string[]> {
        if (url.length === 0) {
            return [];
        }

        try {
            const res: AxiosResponse<string[]> = await Zero.AxiosClient.get<string[]>(`${PConstants.BaseUrl}/realm/who/`, {
                data: {
                    url: url
                }
            });

            if (res.status === 200) {
                return res.data;
            }

            return [];
        }
        catch (e) {
            return [];
        }
    }
}