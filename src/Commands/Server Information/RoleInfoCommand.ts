import { Command } from "../../Templates/Command/Command";
import { CommandDetail } from "../../Templates/Command/CommandDetail";
import { CommandPermission } from "../../Templates/Command/CommandPermission";
import { Message, MessageEmbed, Role, Guild } from "discord.js";
import { IRaidGuild } from "../../Templates/IRaidGuild";
import { DateUtil } from "../../Utility/DateUtil";
import { MessageUtil } from "../../Utility/MessageUtil";
import { StringUtil } from "../../Utility/StringUtil";
import { StringBuilder } from "../../Classes/String/StringBuilder";

export class RoleInfoCommand extends Command {
    public constructor() {
        super(
            new CommandDetail(
                "Role Information",
                "roleinfo",
                [],
                "Gets details about a role.",
                ["roleinfo <@Mention | ID | Name>"],
                ["roleinfo @Member", "roleinfo Member", "roleinfo 703911436631670805"],
                1
            ),
            new CommandPermission(
                [],
                [],
                ["suspended"],
                [],
                true
            ),
            true, // guild-only command. 
            false,
			false,
			0
        );
    }

    public async executeCommand(
        msg: Message,
        args: string[],
        guildDb: IRaidGuild
    ): Promise<void> {
        const guild: Guild = msg.guild as Guild;
		// get role
        let role: Role | undefined = msg.mentions.roles.first()
			|| guild.roles.cache.find(x => x.name === args.join(" ").trim())
			|| guild.roles.cache.get(args.join(" ").trim());

		if (typeof role === "undefined") {
			const embed: MessageEmbed = MessageUtil.generateBuiltInEmbed(msg, "NO_ROLE_FOUND", null);
			await msg.channel.send(embed).catch(e => { });
			return;
		}

		let permName: string = Object.entries(role.permissions.serialize())
			.filter(x => x[1])
			.map(y => this.modifyTxt(y[0].replace(/_/g, ' ')))
			.join(", ");

		const stringBuilder: StringBuilder = new StringBuilder()
			.append(`⇒ Role: ${role}`)
			.appendLine()
			.append(`⇒ Role ID: \`${role.id}\``)
			.appendLine()
			.append(`⇒ Role Color: \`${role.hexColor} | ${role.color}\``);

		const roleInfo: MessageEmbed = new MessageEmbed()
			.setAuthor(msg.author.tag, msg.author.displayAvatarURL())
			.setTitle(`**Role Information: @${role.name}**`)
			.setDescription(stringBuilder.toString())
			.addField("Role Members", StringUtil.applyCodeBlocks(role.members.size), true)
			.addField("Mentionable", StringUtil.applyCodeBlocks(role.mentionable ? "Yes" : "No"), true)
			.addField("Displayed (Hoisted)", StringUtil.applyCodeBlocks(role.hoist ? "Yes" : "No"), true)
			.addField("Bot Role", (role.managed) ? StringUtil.applyCodeBlocks("Yes") : StringUtil.applyCodeBlocks("No"), true)
			.addField("Created On", StringUtil.applyCodeBlocks(DateUtil.getTime(role.createdTimestamp)), true)
			.addField("Permissions", StringUtil.applyCodeBlocks(permName.length !== 0 ? permName : "None"))
			.setTimestamp()
			.setThumbnail(`https://dummyimage.com/250/${role.hexColor.slice(1)}/&text=%20`)
			.setFooter(guild.name)
			.setColor(role.color);
		await msg.channel.send(roleInfo).catch(e => { });
	}

	private modifyTxt(permission: string): string {
		return permission.replace(
			/\w\S*/g,
			(txt: string): string => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
		);
	}
}