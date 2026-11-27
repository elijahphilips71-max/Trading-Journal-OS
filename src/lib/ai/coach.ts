import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";

/**
 * AI coach (SPEC §7). Server only: the API key never reaches the browser.
 * Model: Claude Sonnet 5.5, as the spec suggests (good and cheap enough for a student budget).
 * Change it with the AI_MODEL environment variable.
 */
export const AI_MODEL = process.env.AI_MODEL || "claude-sonnet-5-5";

/** Most coach replies (reviews + chat answers) per user per UK day. */
export const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 40);

export const GRADES = ["A+", "A", "A−", "B+", "B", "B−", "C+", "C", "C−", "D", "F"] as const;

export const ReviewSchema = z.object({
  grade: z.enum(GRADES),
  went_well: z.string(),
  fix_next: z.string(),
});
export type Review = z.infer<typeof ReviewSchema>;

export class CoachError extends Error {}

let client: Anthropic | null = null;
export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
function getClient() {
  if (!aiConfigured()) throw new CoachError("The AI coach isn't switched on yet (no API key).");
  client ??= new Anthropic({ timeout: 45_000, maxRetries: 1 });
  return client;
}

const COACH_RULES = `You are the trading coach inside OS Journal, a journal for Elijah, a beginner swing trader in the UK who paper trades US shares and ETFs.
He is proving consistency over 3 months so his dad will open a real account. His dad's targets: profitable in 2 of 3 months, average win bigger than average loss, no month below −5%, all rules followed on 90%+ of trades, and 30+ trades.

How you coach:
- Coach the PROCESS: following his rules and setup, risk, stops, patience, emotions, journaling. Judge the decision, not the outcome. A loss taken at the planned stop with all rules followed is a good trade. A lucky win that broke rules is not.
- Never give financial advice. Never tell him to buy, sell or hold any share, and never predict prices. If asked, say you can't, and steer back to his process.
- Plain, short UK English. Be encouraging, honest and specific to the numbers given. Explain any trading word you use.
- Use £ for his account and $ for share prices.`;

const REVIEW_TASK = `Grade this closed trade and give feedback.
Grades: A+ to A− = rules followed and the plan executed well; B range = solid with a small slip; C range = a clear process mistake; D = several rules broken or a stop ignored; F = reckless (no stop, huge risk, revenge trading).
"went_well": one or two sentences on what he did well.
"fix_next": one or two sentences on the single most useful thing to do differently next time.`;

function refusalCheck(stop: string | null) {
  if (stop === "refusal") throw new CoachError("The coach couldn't answer that one.");
}

export async function reviewTrade(context: string): Promise<Review> {
  const anthropic = getClient();
  let res;
  try {
    res = await anthropic.beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: COACH_RULES, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "low", format: betaZodOutputFormat(ReviewSchema) },
      messages: [{ role: "user", content: `${REVIEW_TASK}\n\n${context}` }],
    });
  } catch (e) {
    throw toCoachError(e);
  }
  refusalCheck(res.stop_reason);
  const parsed = ReviewSchema.safeParse(res.parsed_output);
  if (!parsed.success) throw new CoachError("The coach's answer came back garbled. Try again.");
  return parsed.data;
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

export async function askCoach(context: string, history: ChatTurn[], question: string): Promise<string> {
  const anthropic = getClient();
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history.slice(-16).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: question },
  ];
  // The API needs the first message to be from the user.
  while (messages.length && messages[0].role !== "user") messages.shift();
  let res;
  try {
    res = await anthropic.beta.messages.create({
      model: AI_MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [
        { type: "text", text: COACH_RULES, cache_control: { type: "ephemeral" } },
        { type: "text", text: `Answer in at most 5 short sentences unless he asks for more.\n\nContext:\n${context}` },
      ],
      output_config: { effort: "low" },
      messages,
    });
  } catch (e) {
    throw toCoachError(e);
  }
  refusalCheck(res.stop_reason);
  const text = res.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!text) throw new CoachError("The coach didn't reply. Try again.");
  return text;
}

function toCoachError(e: unknown): CoachError {
  if (e instanceof CoachError) return e;
  if (e instanceof Anthropic.AuthenticationError) return new CoachError("The AI key isn't working. Check ANTHROPIC_API_KEY.");
  if (e instanceof Anthropic.RateLimitError) return new CoachError("The coach is busy. Try again in a minute.");
  if (e instanceof Anthropic.APIConnectionError) return new CoachError("Couldn't reach the coach. Check your connection.");
  if (e instanceof Anthropic.APIError) return new CoachError("The coach is having a problem right now. Try again later.");
  return new CoachError("Something went wrong with the coach.");
}

export const ExtractSchema = z.object({
  ticker: z.string().nullable(),
  direction: z.enum(["long", "short"]).nullable(),
  entry: z.number().nullable(),
  stop: z.number().nullable(),
  target: z.number().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  note: z.string(),
});
export type Extracted = z.infer<typeof ExtractSchema>;

const EXTRACT_TASK = `This is a screenshot of a TradingView chart. Read the trade plan from it.
- ticker: the symbol shown at the top left (e.g. "SPY", "AAPL"), without the exchange prefix. null if you can't see it.
- direction: "long" if a Long Position tool is drawn (green profit zone ABOVE entry, red loss zone BELOW), "short" if a Short Position tool is drawn (green zone BELOW, red ABOVE). null if no position tool.
- entry, stop, target: dollar prices read from the position tool's labels or the price axis. stop = the edge of the red zone, target = the edge of the green zone. null for anything you can't read.
- confidence: how sure you are about the numbers overall.
- note: one short plain-English sentence on anything unclear (empty string if all clear).
Only read what is on the image. Never guess a ticker or invent prices.`;

/** Read ticker, direction, entry, stop and target from a chart screenshot. Always confirmed by the user. */
export async function extractFromScreenshot(base64: string, mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif"): Promise<Extracted> {
  const anthropic = getClient();
  let res;
  try {
    res = await anthropic.beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(ExtractSchema) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: EXTRACT_TASK },
          ],
        },
      ],
    });
  } catch (e) {
    throw toCoachError(e);
  }
  refusalCheck(res.stop_reason);
  const parsed = ExtractSchema.safeParse(res.parsed_output);
  if (!parsed.success) throw new CoachError("Couldn't read that screenshot. Try a clearer one.");
  return parsed.data;
}
