"use client";

import { Button, KoreanHint, ListenButton } from "@fluentloop/ui";
import { useState } from "react";

import type { NotebookCard } from "@/lib/notebook";

export function NotebookList({ entries }: { entries: NotebookCard[] }) {
  const [cards, setCards] = useState(entries);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const due = cards.filter((card) => card.due);
  const saved = cards.filter((card) => !card.due);

  async function grade(id: string, grade: "again" | "good") {
    setPendingId(id);
    setError(null);
    try {
      const response = await fetch("/api/notebook/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, grade }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not save this review.");
        return;
      }
      setCards((current) =>
        current.map((card) => (card.id === id ? { ...card, due: false } : card)),
      );
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-8">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {due.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Due today</h2>
          <ul className="space-y-3">
            {due.map((card) => (
              <li
                key={card.id}
                className="space-y-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <Phrase card={card} />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    disabled={pendingId === card.id}
                    onClick={() => void grade(card.id, "again")}
                  >
                    Again
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={pendingId === card.id}
                    onClick={() => void grade(card.id, "good")}
                  >
                    Got it
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {saved.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Saved</h2>
          <ul className="space-y-3">
            {saved.map((card) => (
              <li
                key={card.id}
                className="space-y-2 rounded-lg border border-border bg-card px-4 py-3"
              >
                <Phrase card={card} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Phrase({ card }: { card: NotebookCard }) {
  return (
    <div className="space-y-1">
      <p className="font-medium">{card.term}</p>
      <p className="text-sm text-muted-foreground">{card.example}</p>
      <ListenButton text={card.example} />
      <KoreanHint>{card.meaningKo}</KoreanHint>
    </div>
  );
}
