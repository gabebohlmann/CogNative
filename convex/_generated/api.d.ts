/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as deck from "../deck.js";
import type * as sentences from "../sentences.js";
import type * as stats from "../stats.js";
import type * as stories from "../stories.js";
import type * as userWords from "../userWords.js";
import type * as users from "../users.js";
import type * as words from "../words.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  deck: typeof deck;
  sentences: typeof sentences;
  stats: typeof stats;
  stories: typeof stories;
  userWords: typeof userWords;
  users: typeof users;
  words: typeof words;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
