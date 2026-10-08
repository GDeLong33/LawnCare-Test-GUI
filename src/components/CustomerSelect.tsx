import { useStore } from '../data/store';

/** Accessible customer dropdown, sorted by last name. */
export default function CustomerSelect({
  value,
  onChange,
  label = 'Customer',
  includeInactive = false,
  allowEmpty,
  required,
}: {
  value: string;
  onChange: (id: string) => void;
  label?: string;
  includeInactive?: boolean;
  allowEmpty?: string;
  required?: boolean;
}) {
  const { data } = useStore();
  const list = data.customers
    .filter((c) => includeInactive || c.active || c.id === value)
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  return (
    <label className="field">
      <span>{label}</span>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)} required={required}>
        {allowEmpty !== undefined ? <option value="">{allowEmpty}</option> : !value && <option value="">Choose a customer…</option>}
        {list.map((c) => (
          <option key={c.id} value={c.id}>
            {c.lastName}, {c.firstName} · {c.number}
            {c.active ? '' : ' (inactive)'}
          </option>
        ))}
      </select>
    </label>
  );
}
