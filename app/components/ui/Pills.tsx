"use client";

type PillOption = {
  label: string;
  value: string;
};

type PillsProps = {
  options: PillOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function Pills({
  options,
  value,
  onChange,
  className = "",
}: PillsProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
            value === option.value
              ? "bg-[#0052ff] text-white border-[#0052ff] shadow-sm"
              : "bg-[rgba(255,255,255,0.4)] text-[#58585c] border-[rgba(0,0,0,0.1)] hover:bg-[#e6edff] hover:text-[#0052ff] hover:border-[#0052ff]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
