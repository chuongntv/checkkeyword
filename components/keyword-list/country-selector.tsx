"use client"

import { Button } from "@/components/ui/button"

const countryOptions = [
  { code: "vn", label: "Việt Nam" },
  { code: "global", label: "Global" },
]

interface CountrySelectorProps {
  value: string[]
  onChange: (value: string[]) => void
}

export function CountrySelector({ value, onChange }: CountrySelectorProps) {
  function toggle(code: string) {
    if (value.includes(code)) {
      onChange(value.filter((c) => c !== code))
    } else {
      onChange([...value, code])
    }
  }

  return (
    <div className="flex gap-2">
      {countryOptions.map((opt) => (
        <Button
          key={opt.code}
          type="button"
          variant={value.includes(opt.code) ? "default" : "outline"}
          size="sm"
          onClick={() => toggle(opt.code)}
        >
          {opt.code === "vn" ? "🇻🇳" : "🌐"} {opt.label}
        </Button>
      ))}
    </div>
  )
}
