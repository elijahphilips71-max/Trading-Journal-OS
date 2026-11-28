/** Shown while a page's data loads. */
export default function Loading() {
  return (
    <main className="page" aria-busy="true" aria-label="Loading">
      <div className="skeleton" style={{ height: 28, width: "40%" }} />
      <div className="skeleton" style={{ height: 180 }} />
      <div className="skeleton" style={{ height: 72 }} />
      <div className="skeleton" style={{ height: 72 }} />
    </main>
  );
}
