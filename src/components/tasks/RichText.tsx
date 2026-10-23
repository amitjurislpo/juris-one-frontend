import { Fragment } from "react";
import { splitMentions } from "@/lib/tasks";

const URL_PATTERN = /(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]])/g;

/** Plain text with web addresses made into links (new tab, `noopener`). */
function Linked({ text }: { text: string }) {
  return <>{text.split(URL_PATTERN).map((piece, i) => (i % 2 === 1 ? <a key={i} href={piece} target="_blank" rel="noopener noreferrer">{piece}</a> : <Fragment key={i}>{piece}</Fragment>))}</>;
}

/**
 * Stored task text (description, comment): paragraphs, line breaks, web links and `@{uuid}` mentions shown as an
 * `@Name` chip. Text is rendered as text, never as HTML.
 */
export function RichText({ text, people }: { text: string; people: Record<string, string> }) {
  return (
    <div className="rich-text">
      {text.split(/\n{2,}/).map((paragraph, paragraphIndex) => (
        <p key={paragraphIndex}>
          {paragraph.split("\n").map((line, lineIndex) => (
            <Fragment key={lineIndex}>
              {lineIndex > 0 && <br />}
              {splitMentions(line, people).map((part, partIndex) => part.kind === "text"
                ? <Linked key={partIndex} text={part.text} />
                : <span key={partIndex} className="mention">@{part.name ?? "…"}</span>)}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}
