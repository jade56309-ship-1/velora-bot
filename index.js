
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField
} = require("discord.js");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const packages = {
  normal: 10000,
  deluxe: 15000,
  premium: 25000,
  vip: 35000
};

const bookings = [];
const reports = [];
const sessions = [];
const giveaways = [];

function makeEmbed(title, description) {
  return new EmbedBuilder()
    .setColor("#c9a7df")
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: "VELORA Hotel" })
    .setTimestamp();
}

function isStaff(message) {
  return message.member?.permissions.has(
    PermissionsBitField.Flags.ManageGuild
  );
}

client.once("ready", () => {
  console.log(`VELORA online as ${client.user.tag}`);
  client.user.setActivity("VELORA Hotel");
});

client.on("messageCreate", async message => {
  if (message.author.bot || !message.content.startsWith("!")) return;

  const args = message.content.slice(1).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (command === "help" || command === "commands") {
    return message.reply({
      embeds: [makeEmbed("VELORA Commands",
        "**Guest commands**\n" +
        "`!packages` View packages\n" +
        "`!book <package>` Request a room\n" +
        "`!mybooking` View your bookings\n" +
        "`!support <message>` Contact staff\n\n" +
        "**Staff commands**\n" +
        "`!bookings` View bookings\n" +
        "`!approve <ID>` Approve booking\n" +
        "`!deny <ID> <reason>` Deny booking\n" +
        "`!report @user <reason>` Submit report\n" +
        "`!reports` View reports\n" +
        "`!session <details>` Schedule session\n" +
        "`!delay <ID> <new time>` Delay session\n" +
        "`!cancel <ID>` Cancel session\n" +
        "`!announce <message>` Announcement\n" +
        "`!giveaway <prize>` Start giveaway"
      )]
    });
  }

  if (command === "packages") {
    return message.reply({
      embeds: [makeEmbed("VELORA Hotel Packages",
        "**Normal** · $10,000 Bloxburg cash\n" +
        "**Deluxe** · $15,000 Bloxburg cash\n" +
        "**Premium** · $25,000 Bloxburg cash\n" +
        "**VIP** · $35,000 Bloxburg cash\n\n" +
        "Use `!book <package>` to request a room."
      )]
    });
  }

  if (command === "book") {
    const type = args[0]?.toLowerCase();
    if (!packages[type]) {
      return message.reply("Choose normal, deluxe, premium or vip.");
    }

    const id = bookings.length + 1;
    bookings.push({
      id,
      user: message.author.id,
      package: type,
      status: "Pending"
    });

    return message.reply({
      embeds: [makeEmbed("Booking submitted",
        `Booking ID: **${id}**\n` +
        `Package: **${type.toUpperCase()}**\n` +
        `Price: **$${packages[type].toLocaleString()} Bloxburg cash**\n` +
        "Status: Pending"
      )]
    });
  }

  if (command === "mybooking") {
    const mine = bookings.filter(b => b.user === message.author.id);
    if (!mine.length) return message.reply("You have no bookings.");

    return message.reply({
      embeds: [makeEmbed("Your bookings",
        mine.map(b =>
          `#${b.id} · ${b.package.toUpperCase()} · ${b.status}`
        ).join("\n")
      )]
    });
  }

  if (command === "support") {
    const text = args.join(" ");
    if (!text) return message.reply("Usage: !support <message>");

    const channel = message.guild.channels.cache.find(c =>
      c.isTextBased() && /support|ticket|help/i.test(c.name)
    );

    if (!channel) return message.reply("No support channel was found.");

    await channel.send({
      embeds: [makeEmbed("New support request",
        `From: ${message.author}\n${text}`
      )]
    });

    return message.reply("Your support request was sent.");
  }

  if (command === "bookings") {
    if (!isStaff(message)) return message.reply("Staff only.");

    if (!bookings.length) return message.reply("No bookings yet.");

    return message.reply({
      embeds: [makeEmbed("Booking Requests",
        bookings.map(b =>
          `#${b.id} · <@${b.user}> · ${b.package} · ${b.status}`
        ).join("\n")
      )]
    });
  }

  if (command === "approve" || command === "deny") {
    if (!isStaff(message)) return message.reply("Staff only.");

    const id = Number(args[0]);
    const booking = bookings.find(b => b.id === id);
    if (!booking) return message.reply("Booking not found.");

    booking.status = command === "approve" ? "Approved" : "Denied";

    const reason = args.slice(1).join(" ");
    await message.reply(`Booking #${id} is now ${booking.status}.`);

    const user = await client.users.fetch(booking.user).catch(() => null);
    if (user) {
      await user.send(
        `Your VELORA booking #${id} was ${booking.status}.` +
        (reason ? ` Reason: ${reason}` : "")
      ).catch(() => {});
    }
    return;
  }

  if (command === "report") {
    const target = message.mentions.users.first();
    const reason = args.slice(1).join(" ");

    if (!target || !reason) {
      return message.reply("Usage: !report @user <reason>");
    }

    reports.push({
      id: reports.length + 1,
      reporter: message.author.id,
      target: target.id,
      reason
    });

    return message.reply("Report submitted to the staff records.");
  }

  if (command === "reports") {
    if (!isStaff(message)) return message.reply("Staff only.");
    if (!reports.length) return message.reply("No reports.");

    return message.reply({
      embeds: [makeEmbed("Staff Reports",
        reports.map(r =>
          `#${r.id} · <@${r.reporter}> reported <@${r.target}>\n${r.reason}`
        ).join("\n\n")
      )]
    });
  }

  if (command === "session") {
    if (!isStaff(message)) return message.reply("Staff only.");
    const details = args.join(" ");
    if (!details) return message.reply("Add session details.");

    const id = sessions.length + 1;
    sessions.push({ id, details, status: "Scheduled" });

    return message.reply({
      embeds: [makeEmbed("Session scheduled",
        `Session #${id}\n${details}`
      )]
    });
  }

  if (command === "delay") {
    if (!isStaff(message)) return message.reply("Staff only.");

    const id = Number(args.shift());
    const session = sessions.find(s => s.id === id);
    if (!session) return message.reply("Session not found.");

    const newTime = args.join(" ");
    if (!newTime) return message.reply("Add the new time.");

    session.details = newTime;
    return message.reply(`Session #${id} has been updated.`);
  }

  if (command === "cancel") {
    if (!isStaff(message)) return message.reply("Staff only.");

    const id = Number(args[0]);
    const session = sessions.find(s => s.id === id);
    if (!session) return message.reply("Session not found.");

    session.status = "Cancelled";
    return message.reply(`Session #${id} cancelled.`);
  }

  if (command === "announce") {
    if (!isStaff(message)) return message.reply("Staff only.");

    const announcement = args.join(" ");
    if (!announcement) return message.reply("Write an announcement.");

    return message.channel.send({
      embeds: [makeEmbed("VELORA Announcement", announcement)]
    });
  }

  if (command === "giveaway") {
    if (!isStaff(message)) return message.reply("Staff only.");

    const prize = args.join(" ");
    if (!prize) return message.reply("Add a giveaway prize.");

    const post = await message.channel.send({
      embeds: [makeEmbed("VELORA Giveaway",
        `Prize: **${prize}**\nReact with 🎉 to enter.`
      )]
    });

    await post.react("🎉");
    giveaways.push({ messageId: post.id, prize });
    return;
  }
});

client.login(process.env.BOT_TOKEN);
