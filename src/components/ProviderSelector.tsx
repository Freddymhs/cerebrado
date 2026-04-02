"use client";

export type AIProviderKey = "gemini" | "openai" | "ollama";

const PROVIDER_OPTIONS: { value: AIProviderKey; label: string }[] = [
  { value: "gemini", label: "Gemini 2.5 Flash" },
  { value: "openai", label: "GPT-4o mini" },
  { value: "ollama", label: "Ollama (local)" },
];

interface ProviderSelectorProps {
  selectedProvider: AIProviderKey;
  onProviderChange: (provider: AIProviderKey) => void;
}

export function ProviderSelector({
  selectedProvider,
  onProviderChange,
}: ProviderSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-600">AI</label>
      <select
        value={selectedProvider}
        onChange={(e) => onProviderChange(e.target.value as AIProviderKey)}
        className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {PROVIDER_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
