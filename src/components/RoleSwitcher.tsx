export function RoleSwitcher({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (role: string) => void;
}) {
  return (
    <label className="role-switcher">
      <span>Active role</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
