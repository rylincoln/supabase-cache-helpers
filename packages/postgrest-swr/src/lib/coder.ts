import { INFINITE_PREFIX, KEY_PREFIX, KEY_SEPARATOR } from "./constants";
import { PostgrestParser } from "@supabase-cache-helpers/postgrest-filter";
import { DEFAULT_SCHEMA_NAME } from "@supabase-cache-helpers/postgrest-shared";

export type PostgrestSWRKey = {
  isInfinite: boolean;
  schema: string;
  table: string;
  query: string;
  body: string;
  count: string | null;
  isHead: boolean;
  key: string;
  limit?: number;
  offset?: number;
};

export const decode = (key: unknown): PostgrestSWRKey | null => {
  if (typeof key !== "string") return null;

  const isInfinite = key.startsWith(INFINITE_PREFIX);
  let parsedKey = key.replace(INFINITE_PREFIX, "");

  // Exit early if not a postgrest key
  const isPostgrestKey = parsedKey.startsWith(`${KEY_PREFIX}${KEY_SEPARATOR}`);
  if (!isPostgrestKey) {
    return null;
  }
  parsedKey = parsedKey.replace(`${KEY_PREFIX}${KEY_SEPARATOR}`, "");

  const [schema, table, query, body, count, head] =
    parsedKey.split(KEY_SEPARATOR);

  const params = new URLSearchParams(query);
  const limit = params.get("limit");
  const offset = params.get("offset");

  return {
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
    body,
    count: JSON.parse(count.replace("count=", "")),
    isHead: head === "head=true",
    isInfinite,
    key,
    query,
    schema,
    table,
  };
};

export const encode = <Type extends object>(parser: PostgrestParser<Type>) => {
  return [
    KEY_PREFIX,
    parser.schema ?? DEFAULT_SCHEMA_NAME,
    parser.table,
    parser.queryKey,
    parser.bodyKey,
    `count=${parser.count}`,
    `head=${parser.isHead}`,
  ]
    .filter(Boolean)
    .join(KEY_SEPARATOR);
};