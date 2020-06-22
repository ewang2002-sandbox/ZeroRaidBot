import { ISection } from "../Templates/ISection";

export interface IHeadCountInfo {
    /**
     * The current section. There should be a maximum of 1 headcount per section.
     */
    section: ISection;

    /**
     * The message that contains the headcount embed. 
     */
    msgID: string;

    /**
     * Who started the headcount.
     */
    startedBy: string;
    
    /**
     * The time this was started.
     */
    startTime: number;

    /**
     * Dungeons in the headcount.
     */
    dungeonsForHc: number[];

	/**
	 * Control panel message.
	 */
	controlPanelMsgId: string;
}