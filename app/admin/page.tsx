'use client';

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import type { Print, Collection } from '@/lib/db';
import { formatPrice, PRINT_SIZE_LABELS } from '@/lib/db';

// =============================================================================
// Types
// =============================================================================

interface PriceInputs {
  small: string;
  medium: string;
  large: string;
  xlarge: string;
}

interface UploadFormState {
  file: File | null;
  title: string;
  description: string;
  collectionId: string;
  prices: PriceInputs;
  isDragging: boolean;
  progress: number;
  error: string | null;
  success: string | null;
  isUploading: boolean;
}

type SortKey = 'title' | 'collection_name' | 'created_at';

// =============================================================================
// Helpers
// =============================================================================

function dollarsToString(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parseDollars(val: string): number {
  const num = parseFloat(val.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : Math.trunc(num * 100);
}

function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )admin_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// =============================================================================
// Upload Panel
// =============================================================================

function UploadPanel({ collections }: { collections: Collection[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadFormState>({
    file: null,
    title: '',
    description: '',
    collectionId: collections[0]?.id.toString() ?? '',
    prices: { small: '49.00', medium: '79.00', large: '129.00', xlarge: '199.00' },
    isDragging: false,
    progress: 0,
    error: null,
    success: null,
    isUploading: false,
  });

  const set = useCallback(
    <K extends keyof UploadFormState>(key: K, value: UploadFormState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setState((prev) => ({ ...prev, isDragging: true }));
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setState((prev) => ({ ...prev, isDragging: false }));
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setState((prev) => ({ ...prev, file, isDragging: false, error: null }));
    } else {
      setState((prev) => ({
        ...prev,
        isDragging: false,
        error: 'Please drop a valid image file (JPEG, PNG, WEBP).',
      }));
    }
  }, []);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setState((prev) => ({ ...prev, file, error: null }));
  }, []);

  const handlePriceChange = useCallback(
    (size: keyof PriceInputs, value: string) => {
      setState((prev) => ({
        ...prev,
        prices: { ...prev.prices, [size]: value },
      }));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!state.file) {
        set('error', 'Please select an image to upload.');
        return;
      }
      if (!state.title.trim()) {
        set('error', 'Title is required.');
        return;
      }
      if (!state.collectionId) {
        set('error', 'Please select a collection.');
        return;
      }

      const token = getAuthToken();
      if (!token) {
        set('error', 'Not authenticated. Please log in.');
        return;
      }

      set('isUploading', true);
      set('progress', 0);
      set('error', null);
      set('success', null);

      const formData = new FormData();
      formData.append('file', state.file);
      formData.append('title', state.title.trim());
      formData.append('description', state.description.trim());
      formData.append('collection_id', state.collectionId);
      formData.append('price_small', parseDollars(state.prices.small).toString());
      formData.append('price_medium', parseDollars(state.prices.medium).toString());
      formData.append('price_large', parseDollars(state.prices.large).toString());
      formData.append('price_xlarge', parseDollars(state.prices.xlarge).toString());

      try {
        // Use XMLHttpRequest to get real upload progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setState((prev) => ({ ...prev, progress: pct }));
            }
          });
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              try {
                const data = JSON.parse(xhr.responseText) as { error?: string };
                reject(new Error(data.error ?? `Upload failed (${xhr.status})`));
              } catch {
                reject(new Error(`Upload failed (${xhr.status})`));
              }
            }
          });
          xhr.addEventListener('error', () => reject(new Error('Network error during upload.')));
          xhr.open('POST', '/api/upload');
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.send(formData);
        });

        setState((prev) => ({
          ...prev,
          isUploading: false,
          progress: 100,
          success: `"${state.title}" uploaded successfully.`,
          file: null,
          title: '',
          description: '',
          prices: { small: '49.00', medium: '79.00', large: '129.00', xlarge: '199.00' },
        }));
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isUploading: false,
          error: err instanceof Error ? err.message : 'Upload failed.',
        }));
      }
    },
    [state, set],
  );

  return (
    <section aria-labelledby="upload-heading">
      <h2
        id="upload-heading"
        className="font-heading text-2xl text-dark mb-6"
      >
        Upload New Print
      </h2>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Drop zone: click or drag an image file to upload"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
          className={[
            'relative border-2 border-dashed rounded-sm p-10 text-center cursor-pointer transition-all duration-200',
            state.isDragging
              ? 'border-terra bg-terra/10'
              : 'border-sand hover:border-stone hover:bg-cream',
          ].join(' ')}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/tiff"
            onChange={handleFileChange}
            className="sr-only"
            aria-label="File input"
            tabIndex={-1}
          />
          {state.file ? (
            <div className="space-y-2">
              <p className="font-body font-semibold text-dark">
                {state.file.name}
              </p>
              <p className="text-sm font-body text-stone">
                {(state.file.size / 1024 / 1024).toFixed(1)} MB —{' '}
                <span className="text-terra">Click to change</span>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                className="mx-auto text-stone"
                aria-hidden="true"
              >
                <path
                  d="M20 28V12M13 19l7-7 7 7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 32h24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <p className="font-body font-semibold text-dark">
                Drag & drop your image here
              </p>
              <p className="text-sm font-body text-stone">
                or click to browse — JPEG, PNG, WEBP, TIFF accepted
              </p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {state.isUploading && (
          <div
            role="progressbar"
            aria-valuenow={state.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Upload progress: ${state.progress}%`}
            className="space-y-1"
          >
            <div className="flex justify-between text-xs font-body text-stone">
              <span>Uploading…</span>
              <span>{state.progress}%</span>
            </div>
            <div className="h-1.5 bg-cream rounded-full overflow-hidden">
              <div
                className="h-full bg-terra rounded-full transition-all duration-200"
                style={{ width: `${state.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label
            htmlFor="upload-title"
            className="block text-xs font-body font-semibold tracking-widest uppercase text-stone mb-1"
          >
            Title <span aria-hidden="true">*</span>
          </label>
          <input
            id="upload-title"
            type="text"
            required
            value={state.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Mountain Dawn"
            className="w-full px-4 py-3 border border-sand rounded-sm font-body text-sm text-dark bg-off-white focus:outline-none focus:border-dark focus:ring-1 focus:ring-dark"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="upload-desc"
            className="block text-xs font-body font-semibold tracking-widest uppercase text-stone mb-1"
          >
            Description
          </label>
          <textarea
            id="upload-desc"
            rows={3}
            value={state.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="A brief description of this print…"
            className="w-full px-4 py-3 border border-sand rounded-sm font-body text-sm text-dark bg-off-white focus:outline-none focus:border-dark focus:ring-1 focus:ring-dark resize-none"
          />
        </div>

        {/* Collection */}
        <div>
          <label
            htmlFor="upload-collection"
            className="block text-xs font-body font-semibold tracking-widest uppercase text-stone mb-1"
          >
            Collection <span aria-hidden="true">*</span>
          </label>
          <select
            id="upload-collection"
            required
            value={state.collectionId}
            onChange={(e) => set('collectionId', e.target.value)}
            className="w-full px-4 py-3 border border-sand rounded-sm font-body text-sm text-dark bg-off-white focus:outline-none focus:border-dark focus:ring-1 focus:ring-dark"
          >
            <option value="">Select a collection…</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id.toString()}>
                {col.name}
              </option>
            ))}
          </select>
        </div>

        {/* Prices */}
        <fieldset>
          <legend className="block text-xs font-body font-semibold tracking-widest uppercase text-stone mb-3">
            Prices (USD)
          </legend>
          <div className="grid grid-cols-2 gap-4">
            {(Object.keys(PRINT_SIZE_LABELS) as Array<keyof typeof PRINT_SIZE_LABELS>).map(
              (size) => (
                <div key={size}>
                  <label
                    htmlFor={`upload-price-${size}`}
                    className="block text-xs font-body text-stone mb-1"
                  >
                    {PRINT_SIZE_LABELS[size]}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone font-body text-sm">
                      $
                    </span>
                    <input
                      id={`upload-price-${size}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={state.prices[size]}
                      onChange={(e) => handlePriceChange(size, e.target.value)}
                      className="w-full pl-7 pr-4 py-3 border border-sand rounded-sm font-body text-sm text-dark bg-off-white focus:outline-none focus:border-dark focus:ring-1 focus:ring-dark"
                    />
                  </div>
                </div>
              ),
            )}
          </div>
        </fieldset>

        {/* Errors / Success */}
        {state.error && (
          <p
            role="alert"
            className="text-sm font-body text-terra bg-terra/10 px-4 py-3 rounded-sm border border-terra/30"
          >
            {state.error}
          </p>
        )}
        {state.success && (
          <p
            role="status"
            className="text-sm font-body text-dark bg-cream px-4 py-3 rounded-sm border border-sand"
          >
            {state.success}
          </p>
        )}

        <button
          type="submit"
          disabled={state.isUploading}
          className="w-full py-3 px-6 bg-dark text-off-white font-body font-semibold text-sm tracking-widest uppercase rounded-sm hover:bg-terra transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-terra focus-visible:ring-offset-2"
        >
          {state.isUploading ? 'Uploading…' : 'Upload Print'}
        </button>
      </form>
    </section>
  );
}

// =============================================================================
// Manage Prints Panel
// =============================================================================

function ManagePanel({ initialPrints }: { initialPrints: Print[] }) {
  const [prints, setPrints] = useState<Print[]>(initialPrints);
  const [editedPrices, setEditedPrices] = useState<Record<number, Partial<PriceInputs>>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');

  const sortedPrints = [...prints].sort((a, b) => {
    if (sortKey === 'title') return a.title.localeCompare(b.title);
    if (sortKey === 'collection_name')
      return (a.collection_name ?? '').localeCompare(b.collection_name ?? '');
    return b.created_at.localeCompare(a.created_at);
  });

  function getToken(): string | null {
    return getAuthToken();
  }

  async function handleToggle(
    print: Print,
    field: 'is_featured' | 'is_available',
  ) {
    const token = getToken();
    if (!token) { setError('Not authenticated.'); return; }
    const newVal = print[field] === 1 ? 0 : 1;
    try {
      const res = await fetch(`/api/gallery/${print.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [field]: newVal }),
      });
      if (!res.ok) throw new Error(`Failed to update print (${res.status})`);
      setPrints((prev) =>
        prev.map((p) =>
          p.id === print.id ? { ...p, [field]: newVal as 0 | 1 } : p,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    }
  }

  async function handleSavePrices(print: Print) {
    const token = getToken();
    if (!token) { setError('Not authenticated.'); return; }
    const overrides = editedPrices[print.id] ?? {};
    const payload = {
      price_small: parseDollars(overrides.small ?? dollarsToString(print.price_small)),
      price_medium: parseDollars(overrides.medium ?? dollarsToString(print.price_medium)),
      price_large: parseDollars(overrides.large ?? dollarsToString(print.price_large)),
      price_xlarge: parseDollars(overrides.xlarge ?? dollarsToString(print.price_xlarge)),
    };
    setSavingId(print.id);
    try {
      const res = await fetch(`/api/gallery/${print.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed to save prices (${res.status})`);
      setPrints((prev) =>
        prev.map((p) => (p.id === print.id ? { ...p, ...payload } : p)),
      );
      setEditedPrices((prev) => {
        const next = { ...prev };
        delete next[print.id];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(print: Print) {
    if (
      !confirm(
        `Permanently delete "${print.title}"? This cannot be undone.`,
      )
    ) return;
    const token = getToken();
    if (!token) { setError('Not authenticated.'); return; }
    setDeletingId(print.id);
    try {
      const res = await fetch(`/api/gallery/${print.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setPrints((prev) => prev.filter((p) => p.id !== print.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeletingId(null);
    }
  }

  function editedPrice(printId: number, size: keyof PriceInputs, fallbackCents: number): string {
    return editedPrices[printId]?.[size] ?? dollarsToString(fallbackCents);
  }

  function setPrice(printId: number, size: keyof PriceInputs, val: string) {
    setEditedPrices((prev) => ({
      ...prev,
      [printId]: { ...prev[printId], [size]: val },
    }));
  }

  function hasPriceEdits(print: Print): boolean {
    const ov = editedPrices[print.id];
    if (!ov) return false;
    return (
      (ov.small !== undefined && ov.small !== dollarsToString(print.price_small)) ||
      (ov.medium !== undefined && ov.medium !== dollarsToString(print.price_medium)) ||
      (ov.large !== undefined && ov.large !== dollarsToString(print.price_large)) ||
      (ov.xlarge !== undefined && ov.xlarge !== dollarsToString(print.price_xlarge))
    );
  }

  return (
    <section aria-labelledby="manage-heading">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 id="manage-heading" className="font-heading text-2xl text-dark">
          Manage Prints
          <span className="ml-2 text-base font-body text-stone font-normal">
            ({prints.length})
          </span>
        </h2>

        <div className="flex items-center gap-2">
          <label
            htmlFor="sort-select"
            className="text-xs font-body text-stone tracking-widest uppercase"
          >
            Sort
          </label>
          <select
            id="sort-select"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="px-3 py-2 border border-sand rounded-sm font-body text-sm text-dark bg-off-white focus:outline-none focus:border-dark"
          >
            <option value="created_at">Newest</option>
            <option value="title">Title A–Z</option>
            <option value="collection_name">Collection</option>
          </select>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 text-sm font-body text-terra bg-terra/10 px-4 py-3 rounded-sm border border-terra/30"
        >
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline focus-visible:ring-1 focus-visible:ring-terra rounded"
          >
            Dismiss
          </button>
        </p>
      )}

      {prints.length === 0 ? (
        <p className="font-body text-stone py-10 text-center">
          No prints in the database yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-cream">
          <table className="w-full min-w-[900px] text-sm font-body" aria-label="Prints management table">
            <thead>
              <tr className="bg-cream text-stone text-xs tracking-widest uppercase">
                <th scope="col" className="text-left px-4 py-3 font-semibold">
                  Title
                </th>
                <th scope="col" className="text-left px-4 py-3 font-semibold">
                  Collection
                </th>
                <th scope="col" className="text-left px-4 py-3 font-semibold">
                  8×10
                </th>
                <th scope="col" className="text-left px-4 py-3 font-semibold">
                  12×16
                </th>
                <th scope="col" className="text-left px-4 py-3 font-semibold">
                  16×20
                </th>
                <th scope="col" className="text-left px-4 py-3 font-semibold">
                  20×24
                </th>
                <th scope="col" className="text-center px-4 py-3 font-semibold">
                  Featured
                </th>
                <th scope="col" className="text-center px-4 py-3 font-semibold">
                  Available
                </th>
                <th scope="col" className="text-right px-4 py-3 font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream">
              {sortedPrints.map((print) => (
                <tr
                  key={print.id}
                  className="hover:bg-cream/50 transition-colors"
                >
                  {/* Title */}
                  <td className="px-4 py-3 text-dark font-medium max-w-[180px] truncate">
                    {print.title}
                  </td>

                  {/* Collection */}
                  <td className="px-4 py-3 text-stone">
                    {print.collection_name ?? '—'}
                  </td>

                  {/* Price cells */}
                  {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => {
                    const fallback =
                      size === 'small' ? print.price_small
                      : size === 'medium' ? print.price_medium
                      : size === 'large' ? print.price_large
                      : print.price_xlarge;
                    return (
                      <td key={size} className="px-4 py-3">
                        <div className="relative w-24">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone text-xs">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editedPrice(print.id, size, fallback)}
                            onChange={(e) =>
                              setPrice(print.id, size, e.target.value)
                            }
                            aria-label={`${PRINT_SIZE_LABELS[size]} price for ${print.title}`}
                            className="w-full pl-5 pr-2 py-1.5 border border-sand rounded font-body text-xs text-dark bg-off-white focus:outline-none focus:border-dark"
                          />
                        </div>
                      </td>
                    );
                  })}

                  {/* Featured toggle */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(print, 'is_featured')}
                      aria-label={`${print.is_featured ? 'Un-feature' : 'Feature'} ${print.title}`}
                      aria-pressed={print.is_featured === 1}
                      className={[
                        'w-10 h-5 rounded-full relative inline-flex transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-terra',
                        print.is_featured === 1 ? 'bg-terra' : 'bg-sand',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200',
                          print.is_featured === 1 ? 'translate-x-5' : 'translate-x-0',
                        ].join(' ')}
                        aria-hidden="true"
                      />
                    </button>
                  </td>

                  {/* Available toggle */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(print, 'is_available')}
                      aria-label={`Mark ${print.title} as ${print.is_available ? 'unavailable' : 'available'}`}
                      aria-pressed={print.is_available === 1}
                      className={[
                        'w-10 h-5 rounded-full relative inline-flex transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-terra',
                        print.is_available === 1 ? 'bg-dark' : 'bg-sand',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200',
                          print.is_available === 1 ? 'translate-x-5' : 'translate-x-0',
                        ].join(' ')}
                        aria-hidden="true"
                      />
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {hasPriceEdits(print) && (
                        <button
                          onClick={() => handleSavePrices(print)}
                          disabled={savingId === print.id}
                          aria-label={`Save price changes for ${print.title}`}
                          className="px-3 py-1.5 bg-dark text-off-white text-xs font-semibold rounded hover:bg-terra transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-terra"
                        >
                          {savingId === print.id ? 'Saving…' : 'Save'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(print)}
                        disabled={deletingId === print.id}
                        aria-label={`Delete ${print.title}`}
                        className="px-3 py-1.5 border border-terra text-terra text-xs font-semibold rounded hover:bg-terra hover:text-white transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-terra"
                      >
                        {deletingId === print.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// =============================================================================
// Admin Page
// =============================================================================

export default function AdminPage() {
  const [prints, setPrints] = useState<Print[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');

  useEffect(() => {
    async function load() {
      const token = getAuthToken();
      if (!token) {
        setAuthError(true);
        setLoading(false);
        return;
      }
      try {
        const [printsRes, collectionsRes] = await Promise.all([
          fetch('/api/gallery', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/gallery?collections_only=true', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (printsRes.status === 401 || collectionsRes.status === 401) {
          setAuthError(true);
          return;
        }

        const printsData = (await printsRes.json()) as { prints?: Print[] };
        const collectionsData = (await collectionsRes.json()) as {
          collections?: Collection[];
        };

        setPrints(printsData.prints ?? []);
        setCollections(collectionsData.collections ?? []);
      } catch {
        // Silently fail — panels will show empty state
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (authError) {
    return (
      <div className="min-h-screen bg-off-white flex items-center justify-center px-6">
        <div className="max-w-sm text-center space-y-4">
          <h1 className="font-heading text-dark text-3xl">Admin Access</h1>
          <p className="font-body text-stone">
            You must be authenticated to access this page. Please log in with
            your admin credentials.
          </p>
          <a
            href="/admin/login"
            className="inline-block px-6 py-3 bg-dark text-off-white font-body font-semibold text-sm tracking-widest uppercase rounded-sm hover:bg-terra transition-colors"
          >
            Log In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-off-white">
      {/* Admin header */}
      <div className="bg-dark text-off-white px-6 lg:px-10 py-5 flex items-center justify-between">
        <div>
          <p className="font-body text-xs tracking-widest uppercase text-stone mb-0.5">
            Prince Photography
          </p>
          <h1 className="font-heading text-off-white text-2xl">Admin Dashboard</h1>
        </div>
        <a
          href="/"
          className="text-sm font-body text-stone hover:text-sand transition-colors focus-visible:ring-2 focus-visible:ring-terra rounded"
        >
          ← View Site
        </a>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        {loading ? (
          <div className="py-24 text-center" aria-live="polite" aria-busy="true">
            <div className="inline-block w-8 h-8 border-2 border-sand border-t-dark rounded-full animate-spin" />
            <p className="font-body text-stone mt-4">Loading dashboard…</p>
          </div>
        ) : (
          <>
            {/* Tab navigation */}
            <div
              role="tablist"
              aria-label="Admin sections"
              className="flex gap-1 mb-10 border-b border-cream"
            >
              {(
                [
                  { key: 'upload', label: 'Upload New Print' },
                  { key: 'manage', label: `Manage Prints (${prints.length})` },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  role="tab"
                  id={`tab-${key}`}
                  aria-controls={`panel-${key}`}
                  aria-selected={activeTab === key}
                  onClick={() => setActiveTab(key)}
                  className={[
                    'px-5 py-3 font-body font-semibold text-sm transition-all duration-200 border-b-2 -mb-px',
                    activeTab === key
                      ? 'border-dark text-dark'
                      : 'border-transparent text-stone hover:text-dark',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Upload Panel */}
            <div
              role="tabpanel"
              id="panel-upload"
              aria-labelledby="tab-upload"
              hidden={activeTab !== 'upload'}
              className="max-w-2xl"
            >
              {activeTab === 'upload' && (
                <UploadPanel collections={collections} />
              )}
            </div>

            {/* Manage Panel */}
            <div
              role="tabpanel"
              id="panel-manage"
              aria-labelledby="tab-manage"
              hidden={activeTab !== 'manage'}
            >
              {activeTab === 'manage' && (
                <ManagePanel initialPrints={prints} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
