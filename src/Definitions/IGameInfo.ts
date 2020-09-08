import { ISection } from "../Templates/ISection";
import { RaidStatus } from "./RaidStatus";
import { IGameData } from "./IGameData";

export interface IGameInfo {
    section: ISection,
    gameInfo: IGameData,
	startTime: number;
	startedBy: string;
	status: RaidStatus;
    peopleWithSpecialReactions: { keyId: string; userId: string; }[];
    msgToDmPeople: string; 
    msgId: string;
    vcId: string; 
}