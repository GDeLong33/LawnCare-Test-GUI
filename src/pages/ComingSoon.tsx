import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="page">
      <header className="page-head">
        <h1>{title}</h1>
      </header>
      <div className="card">
        <EmptyState title="This screen is being built next.">
          <Link to="/">Back to the start menu</Link>
        </EmptyState>
      </div>
    </div>
  );
}
