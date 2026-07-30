import { MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./WhatsAppPanel.module.css";

type Props = {
  label: string;
  text: string;
  note?: string;
  /** Shop display name shown in the fake chat header. */
  storeName?: string;
  phoneLabel?: string;
  /** When false, omit aria-live (duplicate preview slots). */
  live?: boolean;
};

/** Renders WhatsApp-style *bold* markers as <strong>. */
function renderWaMarkup(text: string): ReactNode {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const nodes: ReactNode[] = [];
  const re = /\*([^*\n]+)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(trimmed)) !== null) {
    if (match.index > last) {
      nodes.push(trimmed.slice(last, match.index));
    }
    nodes.push(<strong key={`b-${key++}`}>{match[1]}</strong>);
    last = match.index + match[0].length;
  }
  if (last < trimmed.length) {
    nodes.push(trimmed.slice(last));
  }
  return nodes;
}

export function WaMessagePreview({
  label,
  text,
  note,
  storeName = "Sua loja",
  phoneLabel,
  live = true,
}: Props) {
  const trimmed = text.trim();
  const empty = !trimmed;

  return (
    <div
      className={[styles.previewCard, styles.waAccent].join(" ")}
      {...(live ? { "aria-live": "polite" as const } : {})}
    >
      <div className={styles.chatHeader}>
        <span className={styles.chatAvatar} aria-hidden>
          <MessageCircle size={16} strokeWidth={2.25} />
        </span>
        <div className={styles.chatHeaderText}>
          <p className={styles.chatHeaderTitle}>{storeName}</p>
          <p className={styles.chatHeaderSub}>
            {phoneLabel?.trim() || "WhatsApp · mensagem pronta"}
          </p>
        </div>
      </div>
      <div className={styles.chatBody}>
        <p className={styles.previewLabel}>{label}</p>
        <div className={styles.bubble}>
          <pre
            className={[
              styles.bubbleText,
              empty ? styles.bubbleEmpty : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {empty ? "…" : renderWaMarkup(trimmed)}
          </pre>
          <span className={styles.bubbleTime} aria-hidden>
            agora
          </span>
        </div>
      </div>
      {note ? (
        <p className={[styles.previewNote, styles.chatNote].join(" ")}>{note}</p>
      ) : null}
    </div>
  );
}
