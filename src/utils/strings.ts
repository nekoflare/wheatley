import * as Discord from "discord.js";
import XXH from "xxhashjs";
import { markdown_node, MarkdownParser } from "dismark";

import { DAY, HOUR, MINUTE, MONTH, YEAR } from "../common.js";
import { round, unwrap } from "./misc.js";
import { remove } from "./arrays.js";

export function pluralize(n: number, word: string, round_to: null | number = null) {
    if (n == 1) {
        return `${round_to ? round(n, 2) : n} ${word}`;
    } else {
        return `${round_to ? round(n, 2) : n} ${word}s`;
    }
}

export function time_to_human_core(diff: number, seconds_with_higher_precision = true): string[] {
    if (diff >= YEAR) {
        const years = Math.floor(diff / YEAR);
        return [...(years == 0 ? [] : [pluralize(years, "year", 2)]), ...time_to_human_core(diff % YEAR, false)];
    }
    if (diff >= MONTH) {
        const months = Math.floor(diff / MONTH);
        return [...(months == 0 ? [] : [pluralize(months, "month", 2)]), ...time_to_human_core(diff % MONTH, false)];
    }
    if (diff >= DAY) {
        const days = Math.floor(diff / DAY);
        return [...(days == 0 ? [] : [pluralize(days, "day", 2)]), ...time_to_human_core(diff % DAY, false)];
    }
    if (diff >= HOUR) {
        const hours = Math.floor(diff / HOUR);
        return [...(hours == 0 ? [] : [pluralize(hours, "hour", 2)]), ...time_to_human_core(diff % HOUR, false)];
    }
    if (diff >= MINUTE) {
        const minutes = Math.floor(diff / MINUTE);
        return [
            ...(minutes == 0 ? [] : [pluralize(minutes, "minute", 2)]),
            ...time_to_human_core(diff % MINUTE, seconds_with_higher_precision && true),
        ];
    }
    const seconds = diff / 1000;
    return seconds == 0 ? [] : [pluralize(round(diff / 1000, seconds_with_higher_precision ? 1 : 0), "second", 2)];
}

export function time_to_human(diff: number, levels?: number): string {
    return time_to_human_core(diff).slice(0, levels).join(" ");
}

// removes code blocks from a message
// not perfect, but good enough
export function parse_out(message: string) {
    const ast = new MarkdownParser().parse(message);
    const text_content = (node: markdown_node): string => {
        switch (node.type) {
            case "doc":
                return node.content.map(node => text_content(node)).join("");
            case "list":
                return node.items.map(item => text_content(item)).join(""); // todo: newlines
            case "italics":
            case "bold":
            case "underline":
            case "strikethrough":
            case "spoiler":
            case "header":
            case "subtext":
            case "masked_link":
            case "blockquote":
                return text_content(node.content);
            case "inline_code":
            case "code_block":
                return "";
            case "plain":
                return node.content;
            default:
                throw new Error(`Unknown ast node ${(node as markdown_node).type}`);
        }
    };
    return text_content(ast);
}

export function format_list(items: string[]) {
    if (items.length <= 2) {
        return items.join(" and ");
    } else {
        return `${items.slice(0, items.length - 1).join(", ")}, and ${items[items.length - 1]}`;
    }
}

export function xxh3(message: string) {
    return XXH.h64().update(message).digest().toString(16);
}

// https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
export function escape_regex(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function is_string(value: string | unknown): value is string {
    return typeof value === "string" || value instanceof String;
}

export function string_split(str: string, delim: string, limit: number) {
    const parts = str.split(delim);
    if (parts.length > limit) {
        parts.splice(limit - 1, parts.length - limit + 1, parts.slice(limit - 1).join(delim));
    }
    return parts;
}

export function escape_discord(str: string) {
    // Escape <> for mentions, - for lists, # for headings, [ for links, and the period in \d. for ordered lists on top
    // of what discord.js escapes
    return Discord.escapeMarkdown(str).replace(/[<>\-#[]|(?<=^\s*\d+)\./gm, c => `\\${c}`);
}

export function capitalize(str: string) {
    if (str === "") {
        return str;
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function wrap(str: string, thing: string | [string, string]) {
    if (is_string(thing)) {
        return thing + str + thing;
    } else {
        return thing[0] + str + thing[1];
    }
}

// Takes an array of lines and joins them, skips null entries. This is a helper function to make building descriptions
// and conditionally excluding lines more ergonomic
export function build_description(...lines: (string | null)[]) {
    return remove(lines, null)
        .map(line => line.trim())
        .join("\n");
}

export function to_string(obj: any) {
    let str = "<error in to_string>";
    try {
        str = obj.toString();
    } catch {
        try {
            str = String(obj);
        } catch {
            void 0;
        }
    }
    return str;
}

export function debug_unicode(str: string) {
    return Array.from(str)
        .map(v => unwrap(v.codePointAt(0)).toString(16))
        .map(v => `\\u${v}`)
        .join(", ");
}

export function truncate(str: string, length: number) {
    return str.length <= length ? str : str.slice(0, length - 3) + "...";
}
