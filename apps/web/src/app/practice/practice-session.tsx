"use client";

import { spokenQuestion } from "@fluentloop/core";
import { Button, KoreanHint, Label, ListenButton, Textarea } from "@fluentloop/ui";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { ItemFlag, PracticeView } from "@/lib/practice-view";

const FLAG_LABEL = {
  wrong: "Wrong",
  "too-hard": "Too hard",
  "too-easy": "Too easy",
} as const;

const TOPIC_LABEL: Record<string, string> = {
  "daily-life": "daily life",
  work: "work",
  travel: "travel",
  "small-talk": "small talk",
  opinions: "opinions",
};

export function PracticeSession({ showKorean }: { showKorean: boolean }) {
  const [view, setView] = useState<PracticeView | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [choice, setChoice] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);
  const [round, setRound] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [flags, setFlags] = useState<Record<number, ItemFlag["kind"]>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/practice");
        const data = (await response.json()) as PracticeView & { error?: string };
        if (cancelled) return;
        if (!response.ok) {
          setError(data.error ?? "Could not load today's practice.");
          return;
        }
        applyView(data);
      } catch {
        if (!cancelled) setError("Could not reach the server.");
      } finally {
        if (!cancelled) setPending(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [round]);

  function applyView(data: PracticeView) {
    setView(data);
    if (data.status === "questions" || data.status === "done") {
      setFlags(Object.fromEntries(data.flags.map((flag) => [flag.itemIndex, flag.kind])));
    }
  }

  async function selectFlag(itemIndex: number, kind: ItemFlag["kind"]) {
    setFlags((current) => ({ ...current, [itemIndex]: kind }));
    try {
      const response = await fetch("/api/practice/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIndex, kind }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) setError(data.error ?? "Could not save this flag.");
    } catch {
      setError("Could not reach the server.");
    }
  }

  async function finish(nextAnswers: number[]) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/practice/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: nextAnswers }),
      });
      const data = (await response.json()) as PracticeView & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not score today's practice.");
        return;
      }
      applyView(data);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  async function submitWriting() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/practice/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writing: draft }),
      });
      const data = (await response.json()) as PracticeView & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not review today's writing.");
        return;
      }
      applyView(data);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPending(false);
    }
  }

  if (pending && !view) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Today&apos;s practice</h1>
        <p className="text-muted-foreground">Preparing today&apos;s questions.</p>
        <KoreanHint>오늘의 문제를 준비하고 있어요.</KoreanHint>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Today&apos;s practice</h1>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="button" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  const topic = TOPIC_LABEL[view.topic] ?? view.topic;

  if (view.status === "done") {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {view.score} of {view.total}
          </h1>
          <p className="text-muted-foreground">
            {view.level} practice on {topic}. A new set arrives tomorrow.
          </p>
          <KoreanHint>내일 새로운 문제가 나와요.</KoreanHint>
          <span className="flex gap-4">
            <Link href="/progress" className="text-sm font-medium text-primary">
              Progress
            </Link>
            <Link href="/notebook" className="text-sm font-medium text-primary">
              Notebook
            </Link>
          </span>
        </div>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Writing</h2>
          <p>{view.writing.prompt}</p>
          {showKorean ? <KoreanHint>{view.writing.promptKo}</KoreanHint> : null}
          <p className="text-sm text-muted-foreground">{view.writing.text}</p>
          <p className="text-sm font-medium text-primary">{view.writing.feedback.score} of 5</p>
          <p>{view.writing.feedback.summary.en}</p>
          {showKorean ? <KoreanHint>{view.writing.feedback.summary.ko}</KoreanHint> : null}
          {view.writing.feedback.corrections.length > 0 ? (
            <ul className="space-y-3">
              {view.writing.feedback.corrections.map((correction) => (
                <li
                  key={`${correction.original}-${correction.suggestion}`}
                  className="space-y-1 rounded-lg border border-border bg-card px-4 py-3"
                >
                  <p className="text-sm">{correction.original}</p>
                  <p className="text-sm font-medium">{correction.suggestion}</p>
                  <p className="text-sm text-muted-foreground">{correction.note.en}</p>
                  {showKorean ? <KoreanHint>{correction.note.ko}</KoreanHint> : null}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="space-y-2">
            <p className="text-sm font-medium">A clearer version</p>
            <p>{view.writing.feedback.better}</p>
            <ListenButton text={view.writing.feedback.better} />
          </div>
        </section>
        <ol className="space-y-4">
          {view.review.map((item, itemIndex) => (
            <li
              key={item.question}
              className="space-y-2 rounded-lg border border-border bg-card px-4 py-3"
            >
              <p className="text-sm font-medium text-primary">
                {itemIndex + 1}. {item.correct ? "Correct" : "Review"}
              </p>
              <p>{item.question}</p>
              <ListenButton text={spokenQuestion(item.question)} />
              <QuestionFlags
                itemIndex={itemIndex}
                selected={flags[itemIndex]}
                onSelect={(index, kind) => void selectFlag(index, kind)}
              />
              <p className="text-sm">
                Answer: <span className="font-medium">{item.options[item.answerIndex]}</span>
              </p>
              <p className="text-sm text-muted-foreground">{item.explanation.en}</p>
              {showKorean ? <KoreanHint>{item.explanation.ko}</KoreanHint> : null}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (view.status === "writing") {
    return (
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void submitWriting();
        }}
      >
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">
            Questions: {view.score} of {view.total}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Write a few sentences</h1>
          <p className="text-muted-foreground">
            {view.level} · {topic}
          </p>
        </div>
        <p className="text-lg leading-relaxed">{view.prompt}</p>
        <ListenButton text={view.prompt} />
        {showKorean ? <KoreanHint>{view.promptKo}</KoreanHint> : null}
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="writing">Your answer</Label>
          <Textarea
            id="writing"
            name="writing"
            required
            maxLength={2000}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          Get feedback
        </Button>
      </form>
    );
  }

  if (view.status === "review") {
    const cards = view.cards;
    const card = cards[cardIndex];
    if (!card) return null;
    const cardId = card.id;

    async function gradeCard(grade: "again" | "good") {
      setPending(true);
      setError(null);
      let reload = false;
      try {
        const response = await fetch("/api/notebook/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: cardId, grade }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          setError(data.error ?? "Could not save this review.");
          return;
        }
        setRevealed(false);
        if (cardIndex + 1 >= cards.length) {
          reload = true;
          setCardIndex(0);
          setView(null);
          setRound((current) => current + 1);
          return;
        }
        setCardIndex(cardIndex + 1);
      } catch {
        setError("Could not reach the server.");
      } finally {
        if (!reload) setPending(false);
      }
    }

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">
            Review {cardIndex + 1} of {cards.length}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Saved phrases</h1>
          <p className="text-muted-foreground">
            From earlier practice. Then today&apos;s questions.
          </p>
          <KoreanHint>어제까지 틀린 표현을 먼저 복습해요.</KoreanHint>
        </div>
        <div className="space-y-2 rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-lg font-medium">{card.term}</p>
          <p className="text-sm text-muted-foreground">{card.example}</p>
          <ListenButton text={card.example} />
          {revealed ? <KoreanHint>{card.meaningKo}</KoreanHint> : null}
        </div>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        {revealed ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              disabled={pending}
              onClick={() => void gradeCard("again")}
            >
              Again
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={pending}
              onClick={() => void gradeCard("good")}
            >
              Got it
            </Button>
          </div>
        ) : (
          <Button type="button" className="w-full" onClick={() => setRevealed(true)}>
            Show Korean
          </Button>
        )}
      </div>
    );
  }

  const questions = view.questions;
  const question = questions[index];
  if (!question) return null;

  function continuePractice() {
    if (choice === null) {
      setError("Choose one option.");
      return;
    }
    const nextAnswers = [...answers, choice];
    if (index + 1 >= questions.length) {
      void finish(nextAnswers);
      return;
    }
    setAnswers(nextAnswers);
    setIndex(index + 1);
    setChoice(null);
    setError(null);
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        continuePractice();
      }}
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">
          {question.skill[0]?.toUpperCase()}
          {question.skill.slice(1)} · {index + 1} of {questions.length}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Today&apos;s practice</h1>
        <p className="text-muted-foreground">
          {view.level} · {topic}
        </p>
        <KoreanHint>문제를 푼 다음 짧은 글을 씁니다.</KoreanHint>
      </div>

      <p className="text-lg leading-relaxed">{question.question}</p>
      <ListenButton text={spokenQuestion(question.question)} />
      <QuestionFlags
        itemIndex={index}
        selected={flags[index]}
        onSelect={(itemIndex, kind) => void selectFlag(itemIndex, kind)}
      />

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="sr-only">Answer</legend>
        {question.options.map((option, optionIndex) => (
          <label
            key={`${index}-${option}`}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
          >
            <input
              type="radio"
              name="choice"
              className="size-4 accent-primary"
              checked={choice === optionIndex}
              onChange={() => setChoice(optionIndex)}
            />
            <span>{option}</span>
          </label>
        ))}
      </fieldset>

      <Button type="submit" className="w-full" disabled={pending}>
        Continue
      </Button>
    </form>
  );
}

function QuestionFlags({
  itemIndex,
  selected,
  onSelect,
}: {
  itemIndex: number;
  selected?: ItemFlag["kind"];
  onSelect: (itemIndex: number, kind: ItemFlag["kind"]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Question feedback">
      {(Object.keys(FLAG_LABEL) as ItemFlag["kind"][]).map((kind) => (
        <Button
          key={kind}
          type="button"
          size="sm"
          variant={selected === kind ? "primary" : "secondary"}
          aria-pressed={selected === kind}
          className="min-h-11"
          onClick={() => onSelect(itemIndex, kind)}
        >
          {FLAG_LABEL[kind]}
        </Button>
      ))}
    </div>
  );
}
