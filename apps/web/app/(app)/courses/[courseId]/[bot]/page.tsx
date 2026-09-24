"use client";

import { notFound, useParams } from "next/navigation";

import { ChatView } from "@/components/chat/chat-view";
import type { Bot } from "@/lib/types";

const BOTS: Bot[] = ["assignment", "solution", "paper", "ask"];

export default function BotPage() {
  const { courseId, bot } = useParams<{ courseId: string; bot: string }>();
  if (!BOTS.includes(bot as Bot)) notFound();
  return <ChatView key={`${courseId}-${bot}`} courseId={courseId} bot={bot as Bot} />;
}
