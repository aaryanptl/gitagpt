import { Message, StreamingTextResponse } from "ai";
import { MessageContent, ChatMessage, OpenAI } from "llamaindex";
import { NextRequest, NextResponse } from "next/server";
import { createChatEngine } from "./engine";
import { LlamaIndexStream } from "./llamaindex-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getLastMessageContent = (
  textMessage: string,
  imageUrl: string | undefined,
): MessageContent => {
  if (!imageUrl) return textMessage;
  return [
    {
      type: "text",
      text: textMessage,
    },
    {
      type: "image_url",
      image_url: {
        url: imageUrl,
      },
    },
  ];
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, data }: { messages: Message[]; data: any } = body;
    const lastMessage = messages.pop();
    if (!messages || !lastMessage || lastMessage.role !== "user") {
      return NextResponse.json(
        {
          error:
            "messages are required in the request body and the last message must be from the user",
        },
        { status: 400 },
      );
    }

    const llm = new OpenAI({
      model: "gpt-3.5-turbo",
      maxTokens: 750,
    });

    const chatEngine = await createChatEngine(llm);

    const prefix = 'You are Lord Sri Krishna. Respond with a relevant verse and explanation.'; 

    const lastMessageContent = prefix + getLastMessageContent(
      lastMessage.content,
      data?.imageUrl,
    );


    const response = await chatEngine.chat(
      lastMessageContent as MessageContent,
      messages as ChatMessage[],
      true,
    );

    // Transform the response into a readable stream
    const stream = LlamaIndexStream(response);

    // Return a StreamingTextResponse, which can be consumed by the client
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error("[LlamaIndex]", error);
    return NextResponse.json(
      {
        error: (error as Error).message,
      },
      {
        status: 500,
      },
    );
  }
}
