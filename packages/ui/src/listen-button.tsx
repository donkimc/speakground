"use client";

import { useEffect, useState } from "react";

import { Button } from "./button";

/** Speaks English with the device voice. Shows a note when the device cannot. */
export function ListenButton({ text }: { text: string }) {
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  function play() {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setUnavailable(true);
      return;
    }
    setUnavailable(false);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" size="sm" onClick={play}>
        Listen
      </Button>
      {unavailable ? (
        <p className="text-sm text-muted-foreground" role="status">
          Audio is not available on this device.
        </p>
      ) : null}
    </div>
  );
}
