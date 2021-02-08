export interface IModmailThread {
	// the person that started this
	originalModmailAuthor: string;
	// base message id
	// this contains reactions that allow
	// someone to close or blacklist
	baseMsg: string;  
	// started time
	startedOn: number;
	// channel
	channel: string;
	// original message
	// if any
	originalModmailMessageId: string; 
	// messages
	messages: IModmailThreadMessage[]; 
}

export interface IModmailThreadMessage { 
	authorId: string; 
	tag: string; 
	timeSent: number; 
	content: string; 
	attachments: string[];
}