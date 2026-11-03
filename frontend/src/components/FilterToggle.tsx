/** Phone-only button that shows or hides a filter panel (see `.filter-panel` in index.css). Hidden from 640px up. */
export default function FilterToggle({ open, onClick, active = 0 }: { open: boolean; onClick: () => void; active?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className="sm:hidden ml-auto rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold normal-case tracking-normal text-slate-700"
    >
      {open ? 'Hide filters' : active ? `Show filters (${active})` : 'Show filters'}
    </button>
  );
}
