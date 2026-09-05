import { WebhookClient } from "discord.js";
import axios from "axios";

// ============================================================
// DISCORD ADAPTER
// ============================================================

export interface DiscordNotification {
  title: string;
  description: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  url?: string;
  thumbnail?: string;
}

export async function sendDiscordWebhook(
  webhookUrl: string,
  notification: DiscordNotification
): Promise<boolean> {
  try {
    const embed = {
      title: notification.title,
      description: notification.description,
      color: notification.color || 0x6366f1, // ZenWork brand color
      fields: notification.fields,
      url: notification.url,
      thumbnail: notification.thumbnail
        ? { url: notification.thumbnail }
        : undefined,
      timestamp: new Date().toISOString(),
      footer: {
        text: "ZenWork",
        icon_url: "https://zenwork.com/logo.png",
      },
    };

    await axios.post(webhookUrl, {
      username: "ZenWork",
      avatar_url: "https://zenwork.com/logo.png",
      embeds: [embed],
    });

    return true;
  } catch (error) {
    console.error("Error sending Discord webhook:", error);
    return false;
  }
}

// ============================================================
// DISCORD BOT COMMANDS (Slash Commands)
// ============================================================

export const DISCORD_SLASH_COMMANDS = [
  {
    name: "zenwork",
    description: "Comandos de ZenWork",
    options: [
      {
        name: "status",
        description: "Ver estado de tu organización en ZenWork",
        type: 1, // SUB_COMMAND
      },
      {
        name: "issues",
        description: "Listar issues recientes",
        type: 1,
        options: [
          {
            name: "project",
            description: "Clave del proyecto (ej: ZW)",
            type: 3, // STRING
            required: true,
          },
        ],
      },
    ],
  },
];
