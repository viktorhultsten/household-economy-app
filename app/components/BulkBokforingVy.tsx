"use client";

import { useState, useCallback, useEffect } from "react";
import { BankEvent, Verifikat } from "../types";
import VerifikatForm from "./VerifikatForm";
import ForenkladBokforing from "./ForenkladBokforing";
import { KonteringsforslagKort } from "../lib/konteringsforslag";
import { getVerifikat } from "../actions";

interface BulkBokforingVyProps {
  queue: BankEvent[];
  /**
   * Säkra förslag per bankhändelse. Satt när säkra händelser godkänns: då
   * finns den förenklade vyn och en växlare mot den vanliga.
   */
  sakraForslag?: Map<number, KonteringsforslagKort>;
  onClose: () => void;
}

export default function BulkBokforingVy({ queue, sakraForslag, onClose }: BulkBokforingVyProps) {
  // pendingIndex = where the user has navigated to (updates instantly for the
  // position/segment UI). currentIndex = the event actually mounted+loaded into
  // the form; it follows pendingIndex after a short debounce so paging quickly
  // through many events only loads the one you land on, not every skipped event.
  const [pendingIndex, setPendingIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  // bankEventId → verifikatId for booked events
  const [savedIds, setSavedIds] = useState<Map<number, number>>(new Map());
  // bankEventId → Verifikat data for edit mode on revisit
  const [savedVerifikat, setSavedVerifikat] = useState<Map<number, Verifikat>>(new Map());
  // Track flagged state changes during the session
  const [flaggedIds, setFlaggedIds] = useState<Set<number>>(
    () => new Set(queue.filter((e) => e.flagged).map((e) => e.id))
  );

  // Vyvalet gäller hela kön och finns kvar vid bläddring.
  const [vy, setVy] = useState<"forenklad" | "vanlig">("forenklad");

  const currentEvent = queue[currentIndex];
  const isSaved = savedIds.has(currentEvent.id);
  const currentVerifikat = isSaved ? savedVerifikat.get(currentEvent.id) : undefined;
  // En redan bokförd händelse visas alltid i den vanliga vyn.
  const currentForslag = isSaved ? undefined : sakraForslag?.get(currentEvent.id);

  const handleNavigate = useCallback(
    (direction: -1 | 1) => {
      setPendingIndex((i) => {
        const next = i + direction;
        return next >= 0 && next < queue.length ? next : i;
      });
    },
    [queue.length]
  );

  const handleJump = useCallback(
    (index: number) => {
      setPendingIndex((i) => (index >= 0 && index < queue.length ? index : i));
    },
    [queue.length]
  );

  // Only load the event once the user settles on it. While paging rapidly the
  // timer keeps resetting, so intermediate events are never mounted/loaded.
  useEffect(() => {
    if (pendingIndex === currentIndex) return;
    const timer = setTimeout(() => setCurrentIndex(pendingIndex), 150);
    return () => clearTimeout(timer);
  }, [pendingIndex, currentIndex]);

  const handleFlagChange = useCallback((updated: BankEvent) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (updated.flagged) {
        next.add(updated.id);
      } else {
        next.delete(updated.id);
      }
      return next;
    });
  }, []);

  // Called by VerifikatForm after a new verifikat is created in bulk mode.
  // Fetches the full verifikat so we can show it in edit/revisit mode.
  const handleVerifikatSaved = useCallback(
    async (verifikatId: number) => {
      const bankEventId = currentEvent.id;
      const v = await getVerifikat(verifikatId);
      if (v) {
        // Set verifikat data first, then mark as saved so the key change and
        // data are both ready when the component remounts.
        setSavedVerifikat((prev) => new Map(prev).set(bankEventId, v));
        setSavedIds((prev) => new Map(prev).set(bankEventId, verifikatId));
      }
      // If fetch failed, the event is still posted in DB but the queue
      // won't show it as saved — benign, user can continue with other events.
    },
    [currentEvent.id]
  );

  // After updating an already-saved verifikat in bulk mode, refresh
  // the cached data so revisits show the latest version.
  const handleSuccess = useCallback(async () => {
    if (!isSaved) return;
    const verifikatId = savedIds.get(currentEvent.id);
    if (!verifikatId) return;
    const v = await getVerifikat(verifikatId);
    if (v) {
      setSavedVerifikat((prev) => new Map(prev).set(currentEvent.id, v));
    }
  }, [isSaved, savedIds, currentEvent.id]);

  // Efter ett godkännande: nästa obokförda händelse i kön, eller stäng när
  // alla är bokförda.
  const handleGodkand = useCallback(
    async (verifikatId: number) => {
      const bokforda = new Set([...savedIds.keys(), currentEvent.id]);
      await handleVerifikatSaved(verifikatId);
      for (let steg = 1; steg < queue.length; steg++) {
        const i = (currentIndex + steg) % queue.length;
        if (!bokforda.has(queue[i].id)) {
          setPendingIndex(i);
          setCurrentIndex(i);
          return;
        }
      }
      onClose();
    },
    [savedIds, currentEvent.id, handleVerifikatSaved, queue, currentIndex, onClose]
  );

  const vaxlaVy = useCallback(() => setVy((v) => (v === "forenklad" ? "vanlig" : "forenklad")), []);

  const segments = queue.map((event) => {
    if (savedIds.has(event.id)) return "saved" as const;
    if (flaggedIds.has(event.id)) return "flagged" as const;
    return "pending" as const;
  });

  if (currentForslag && vy === "forenklad") {
    return (
      <ForenkladBokforing
        key={`forenklad-${currentEvent.id}`}
        bankEvent={currentEvent}
        forslag={currentForslag}
        nav={{
          currentIndex: pendingIndex,
          total: queue.length,
          segments,
          onNavigate: handleNavigate,
          onJump: handleJump,
        }}
        onVaxlaVy={vaxlaVy}
        onClose={onClose}
        onGodkand={handleGodkand}
      />
    );
  }

  return (
    <VerifikatForm
      key={`bulk-${currentEvent.id}-${isSaved ? "saved" : "new"}`}
      bankEvent={currentEvent}
      verifikat={currentVerifikat}
      initialForslag={currentForslag}
      onClose={onClose}
      onSuccess={handleSuccess}
      onFlagChange={handleFlagChange}
      bulkNav={{
        currentIndex: pendingIndex,
        total: queue.length,
        isSaved,
        onNavigate: handleNavigate,
        onSaved: handleVerifikatSaved,
        segments,
        onJump: handleJump,
        onVaxlaVy: currentForslag ? vaxlaVy : undefined,
      }}
    />
  );
}

