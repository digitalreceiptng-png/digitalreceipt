'use client'

import { useState, useEffect } from 'react'

interface Props {
  value: string
  onChange: (raw: string) => void
  placeholder?: string
  className?: string
  min?: number
  step?: number
  max?: number
  blurDefault?: string
}

function formatWithCommas(raw: string) {
  if (!raw) return ''
  const [intPart, decPart] = raw.split('.')
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decPart !== undefined ? `${formatted}.${decPart}` : formatted
}

function stripCommas(s: string) {
  return s.replace(/,/g, '')
}

export default function AmountInput({ value, onChange, placeholder = '0.00', className = '', min, step, max, blurDefault }: Props) {
  const [display, setDisplay] = useState(formatWithCommas(value))

  useEffect(() => {
    // Sync when value changes externally (e.g. reset)
    if (stripCommas(display) !== value) {
      setDisplay(formatWithCommas(value))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = stripCommas(e.target.value)
    // Allow only valid number characters
    if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return
    if (max !== undefined && parseFloat(raw) > max) return
    setDisplay(formatWithCommas(raw))
    onChange(raw)
  }

  function handleBlur() {
    if (display === '' && blurDefault !== undefined) {
      setDisplay(formatWithCommas(blurDefault))
      onChange(blurDefault)
    }
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      min={min}
      step={step}
    />
  )
}
