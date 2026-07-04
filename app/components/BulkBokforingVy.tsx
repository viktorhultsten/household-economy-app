"use client";

import { useState, useCallback } from "react";
import { BankEvent, Verifikat } from "../types";
import VerifikatForm from "./VerifikatForm";
import { getVerifikat } from "../actions";

interface BulkBokforingVyProps {
  queue: BankEvent[];
  onClose: () => void;
}

export default function BulkBokforingVy({ queue, onClose }: BulkBokforingVyProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  // bankEventId → verifikatId for booked events
  const [savedIds, setSavedIds] = useState<Map<number, number>>(new Map());
  // bankEventId → Verifikat data for edit mode on revisit
  const [savedVerifikat, setSavedVerifikat] = useState<Map<number, Verifikat>>(new Map());

  const currentEvent = queue[currentIndex];
  const isSaved = savedIds.has(currentEvent.id);
  const currentVerifikat = isSaved ? savedVerifikat.get(currentEvent.id) : undefined;

  const handleNavigate = useCallback(
    (direction: -1 | 1) => {
      const newIndex = currentIndex + direction;
      if (newIndex >= 0 && newIndex < queue.length) {
        setCurrentIndex(newIndex);
      }
    },
    [currentIndex, queue.length]
  );

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

  return (
    <VerifikatForm
      key={`bulk-${currentEvent.id}-${isSaved ? "saved" : "new"}`}
      bankEvent={currentEvent}
      verifikat={currentVerifikat}
      onClose={onClose}
      onSuccess={handleSuccess}
      bulkNav={{
        currentIndex,
        total: queue.length,
        isSaved,
        onNavigate: handleNavigate,
        onSaved: handleVerifikatSaved,
      }}
    />
  );
}
