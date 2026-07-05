"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Verifikat } from "../types";
import { getVerifikatPaginated, deleteVerifikat, getVerifikat } from "../actions";
import VerifikatForm from "./VerifikatForm";
import ConfirmModal from "./ConfirmModal";

const BATCH_SIZE = 25;

function formatSwedishDate(date: Date): string {
  return date.toLocaleDateString("sv-SE");
}

function formatSwedishAmount(amount: number): string {
  return amount.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface VerifikatListProps {
  searchQuery: string;
  sortField: "date" | "description" | "accounts";
  sortDirection: "asc" | "desc";
  filterAccountType: string;
  filterAccountId: number;
  filterDateFrom: string;
  filterDateTo: string;
  refreshToken: number;
  onTotalChange: (total: number) => void;
}

const VerifikatList = memo(function VerifikatList({
  searchQuery,
  sortField,
  sortDirection,
  filterAccountType,
  filterAccountId,
  filterDateFrom,
  filterDateTo,
  refreshToken,
  onTotalChange,
}: VerifikatListProps) {
  const [verifikat, setVerifikat] = useState<Verifikat[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedVerifikat, setSelectedVerifikat] = useState<Verifikat | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const firstReset = useRef(true);
  const didMountRef = useRef(false);

  const hasMore = verifikat.length < total;

  // Reset to the first batch and scroll to top whenever a filter/sort changes.
  useEffect(() => {
    let cancelled = false;
    async function reset() {
      setInitialLoading(true);
      const { verifikat: data, total: t } = await getVerifikatPaginated(
        BATCH_SIZE,
        0,
        searchQuery,
        sortField,
        sortDirection,
        filterAccountType,
        filterAccountId,
        filterDateFrom,
        filterDateTo
      );
      if (cancelled) return;
      setVerifikat(data);
      setTotal(t);
      onTotalChange(t);
      setInitialLoading(false);
      if (!firstReset.current) {
        window.scrollTo({ top: 0 });
      }
      firstReset.current = false;
    }
    reset();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, sortField, sortDirection, filterAccountType, filterAccountId, filterDateFrom, filterDateTo]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    if (total > 0 && verifikat.length >= total) return;
    loadingRef.current = true;
    setLoadingMore(true);
    const { verifikat: data, total: t } = await getVerifikatPaginated(
      BATCH_SIZE,
      verifikat.length,
      searchQuery,
      sortField,
      sortDirection,
      filterAccountType,
      filterAccountId,
      filterDateFrom,
      filterDateTo
    );
    setVerifikat((prev) => [...prev, ...data]);
    setTotal(t);
    onTotalChange(t);
    setLoadingMore(false);
    loadingRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifikat.length, total, searchQuery, sortField, sortDirection, filterAccountType, filterAccountId, filterDateFrom, filterDateTo]);

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  // Refetch the currently loaded window (offset 0) without moving scroll, so
  // edits/deletes/new entries stay in sync while preserving position.
  const refreshWindow = useCallback(async () => {
    const windowSize = Math.max(BATCH_SIZE, verifikat.length);
    const { verifikat: data, total: t } = await getVerifikatPaginated(
      windowSize,
      0,
      searchQuery,
      sortField,
      sortDirection,
      filterAccountType,
      filterAccountId,
      filterDateFrom,
      filterDateTo
    );
    setVerifikat(data);
    setTotal(t);
    onTotalChange(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifikat.length, searchQuery, sortField, sortDirection, filterAccountType, filterAccountId, filterDateFrom, filterDateTo]);

  // External refresh (e.g. after a manual "Ny transaktion"); skip first run.
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    refreshWindow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  async function handleDeleteConfirm() {
    if (deleteConfirmId === null) return;

    await deleteVerifikat(deleteConfirmId);
    await refreshWindow();
    setDeleteConfirmId(null);
  }

  async function handleEditSuccess() {
    await refreshWindow();
    setSelectedVerifikat(null);
  }

  // Open a verifikat by id, fetching it if it isn't in the currently loaded window.
  const openVerifikatById = useCallback(async (id: number) => {
    const existing = verifikat.find((v) => v.id === id);
    if (existing) {
      setSelectedVerifikat(existing);
      return;
    }
    const fetched = await getVerifikat(id);
    if (fetched) setSelectedVerifikat(fetched);
  }, [verifikat]);

  // Editing a länkat periodiseringsverifikat routes to its huvudverifikat instead.
  function openForEdit(v: Verifikat) {
    if (v.periodisering?.role === "lankat") {
      openVerifikatById(v.periodisering.motpartVerifikatId);
      return;
    }
    setSelectedVerifikat(v);
  }

  if (initialLoading) {
    return (
      <div className="rounded-lg bg-white shadow dark:bg-zinc-800 p-8 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">Laddar...</p>
      </div>
    );
  }

  if (verifikat.length === 0) {
    return (
      <div className="rounded-lg bg-white shadow dark:bg-zinc-800 p-8 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">
          Inga verifikat ännu.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {verifikat.map((v) => (
          <div
            key={v.id}
            className="rounded-lg bg-white shadow dark:bg-zinc-800 overflow-hidden"
          >
            {/* Posts Table with Header */}
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[35%]" />
                <col className="w-[35%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-800">
                  <th colSpan={4} className="px-6 py-4 text-left border-b border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {formatSwedishDate(v.date)}
                          </span>
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {v.description}
                          </span>
                          {v.recurringItems && v.recurringItems.length > 0 && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" title={v.recurringItems.map(ri => ri.namn).join(", ")}>
                              Återkommande
                            </span>
                          )}
                          {v.periodisering && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                              {v.periodisering.role === "huvud" ? "Periodisering" : "Periodisering (länkat)"}
                            </span>
                          )}
                        </div>
                        {v.bankEvent && (
                          <div className="text-xs text-zinc-600 dark:text-zinc-400">
                            Från bankhändelse: {v.bankEvent.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openForEdit(v)}
                          className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-600"
                        >
                          Redigera
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(v.id)}
                          className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-900 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                        >
                          Ta bort
                        </button>
                      </div>
                    </div>
                  </th>
                </tr>
                <tr className="bg-zinc-50 dark:bg-zinc-900/50">
                  <th className="px-6 py-2 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Konto
                  </th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Beskrivning
                  </th>
                  <th className="px-6 py-2 text-right text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Debet
                  </th>
                  <th className="px-6 py-2 text-right text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Kredit
                  </th>
                </tr>
              </thead>
              <tbody>
                {v.posts.map((post, idx) => (
                  <tr
                    key={post.id}
                    className={idx % 2 === 0 ? "bg-white dark:bg-zinc-800" : "bg-zinc-50 dark:bg-zinc-900/30"}
                  >
                    <td className="px-6 py-3 text-sm text-zinc-900 dark:text-zinc-50">
                      {post.account?.namn || "—"}
                      {post.account?.group && (
                        <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                          ({post.account.group.namn})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {post.description || "—"}
                    </td>
                    <td className="px-6 py-3 text-sm text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                      {post.debet > 0 ? formatSwedishAmount(post.debet) : ""}
                    </td>
                    <td className="px-6 py-3 text-sm text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                      {post.kredit > 0 ? formatSwedishAmount(post.kredit) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="py-6 text-center">
          {loadingMore && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Laddar…</p>
          )}
        </div>
      )}

      {selectedVerifikat && (
        <VerifikatForm
          key={selectedVerifikat.id}
          verifikat={selectedVerifikat}
          onClose={() => setSelectedVerifikat(null)}
          onSuccess={handleEditSuccess}
          onOpenVerifikat={openVerifikatById}
        />
      )}

      {deleteConfirmId !== null && (
        <ConfirmModal
          title="Ta bort verifikat"
          message="Är du säker på att du vill ta bort detta verifikat? Detta går inte att ångra."
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </>
  );
});

export default VerifikatList;
