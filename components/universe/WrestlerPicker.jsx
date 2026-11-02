export default function WrestlerPicker({ wrestlers, value, onChange }) {
  const sorted = [...wrestlers].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <label className="wrestler-picker">
      Wrestler
      <select value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
        {sorted.map((wrestler) => (
          <option key={wrestler.id} value={wrestler.id}>
            {wrestler.name}
          </option>
        ))}
      </select>
    </label>
  );
}
