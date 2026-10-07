export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="page">
      <div className="page-head">
        <h1>{title}</h1>
      </div>
      <div className="card placeholder">This screen is being built next.</div>
    </div>
  );
}
