import { REPOSITORY_NAME, REPOSITORY_ORG, GITHUB_TOKEN } from "../Configuration/Config";
import { StringBuilder } from "../Classes/String/StringBuilder";
import { DateUtil } from "../Utility/DateUtil";
import { Zero } from "../Zero";
import { AxiosResponse } from "axios";

export module GithubHandler {
	const GITHUB_BASE_URL: string = "https://api.github.com";

	export interface IBaseGithubIssues {
		time: number;
		authorId: string;
		authorTag: string;
		title: string;
		version: string;
	}

	export interface IFeedback extends IBaseGithubIssues {
		feedback: string;
	}

	export interface IBugReport extends IBaseGithubIssues {
		// description of bug
		// basically "what happens"
		description: string;
		// how to reproduce
		// ask what they did before
		// this happened
		reproduceSteps: string;
		// any other info
		otherInfo: string;
	}

	export enum IssuesResponse {
		SUCCESS,
		FAILED,
		NOT_CONFIGURED
	}

	/**
	 * Creates a new issue.
	 * @param type The issue type.
	 * @param details The details of the issue.
	 */
	export async function createIssue(
		type: "FEEDBACK" | "BUG_REPORT",
		details: IFeedback | IBugReport
	): Promise<IssuesResponse> {
		if (REPOSITORY_NAME === "" || REPOSITORY_ORG === "" || GITHUB_TOKEN === "") {
			return IssuesResponse.NOT_CONFIGURED;
		}

		const issuesUrl: string = `${GITHUB_BASE_URL}/repos/${REPOSITORY_ORG}/${REPOSITORY_NAME}/issues`;

		const body: StringBuilder = new StringBuilder()
			.append("### Version")
			.appendLine()
			.append(details.version)
			.appendLine()
			.appendLine();

		if (type === "FEEDBACK") {
			details = details as IFeedback;
			body.append("### Feedback")
				.appendLine()
				.append(details.feedback);
		}
		else {
			details = details as IBugReport;
			body
				// C
				.append("### Description")
				.appendLine()
				.append(details.description)
				.appendLine()
				.appendLine()
				// D
				.append("### Reproduction Steps")
				.appendLine()
				.append(details.reproduceSteps)
				.appendLine()
				.appendLine()
				// E
				.append("### Other Information")
				.appendLine()
				.append(details.otherInfo);
		}

		body
			// user submission 
			.appendLine()
			.appendLine()
			.append("### Submitter Information")
			.appendLine()
			.append(`Discord Tag: ${details.authorTag}`)
			.appendLine()
			.append(`Discord ID: ${details.authorId}`)
			.appendLine()
			.append(`Date/Time Submitted: ${DateUtil.getTime(details.time, "America/Los_Angeles")}`)
			// disclaimer part
			.appendLine()
			.appendLine()
			.appendLine()
			.append("### Disclaimer: PLEASE READ")
			.appendLine()
			.append("This issue was NOT written by the author of the repository OR the account that posted this issue. This issue was submitted through the program hosted in this repository, via Github's API, by someone that uses the program (\"user\"). The user can be found above.");

		try {
			const resp: AxiosResponse<any> = await Zero.AxiosClient.post(issuesUrl, {
				title: details.title,
				body: body.toString()
			}, {
				headers: {
					"Authorization": `token ${GITHUB_TOKEN}`,
					'Content-Type':'application/json',
				}
			});

			if (resp.status === 201) {
				return IssuesResponse.SUCCESS;
			}
			else {
				return IssuesResponse.FAILED;
			}
		}
		catch (e) {
			console.error(e);
			return IssuesResponse.FAILED;
		}
	}
}