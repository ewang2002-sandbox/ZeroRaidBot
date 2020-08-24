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
	originalModmailMessage: string; 
}