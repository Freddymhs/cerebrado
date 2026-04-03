"use client";

import type { AudioProviderKey } from "@/lib/audio/types";
import { AUDIO_PROVIDERS } from "@/constants/audio";

interface AudioProviderSelectorProps {
  value: AudioProviderKey;
  onChange: (key: AudioProviderKey) => void;
}

export function AudioProviderSelector({ value, onChange }: AudioProviderSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Audio</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AudioProviderKey)}
        className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        title={AUDIO_PROVIDERS[value].description}
      >
        {(Object.keys(AUDIO_PROVIDERS) as AudioProviderKey[]).map((key) => (
          <option key={key} value={key}>
            {AUDIO_PROVIDERS[key].label}
          </option>
        ))}
      </select>
    </div>
  );
}
