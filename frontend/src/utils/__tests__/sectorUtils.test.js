// Unit tests for sectorUtils.js
// Run with: npm test (from the frontend folder)

import { describe, it, expect } from 'vitest'
import { fmt, normValue, getLagAlertType } from '../sectorUtils'


// UT-01: fmt() should format poverty rate values as percentages
describe('fmt() formats poverty rate as a percentage', () => {
  it('converts 0.473 to 47.3%', () => {
    const result = fmt('predicted_poverty_rate', 0.473)
    expect(result).toBe('47.3%')
  })

  it('converts 0.1 to 10.0%', () => {
    expect(fmt('predicted_poverty_rate', 0.1)).toBe('10.0%')
  })

  it('converts 1.0 to 100.0%', () => {
    expect(fmt('predicted_poverty_rate', 1.0)).toBe('100.0%')
  })
})


// UT-02: getLagAlertType() should return the right alert level based on the CDI gap
describe('getLagAlertType() returns the correct alert level', () => {
  it('returns danger when gap is -14.3 which is below the -10 threshold', () => {
    expect(getLagAlertType(-14.3)).toBe('danger')
  })

  it('returns danger for a gap of -10.1 which is just past the boundary', () => {
    expect(getLagAlertType(-10.1)).toBe('danger')
  })

  it('returns warning when gap is -5.2 which is between -10 and 0', () => {
    expect(getLagAlertType(-5.2)).toBe('warning')
  })

  it('returns success when the gap is a positive number', () => {
    expect(getLagAlertType(8.1)).toBe('success')
  })

  it('returns success when gap is exactly 0', () => {
    expect(getLagAlertType(0)).toBe('success')
  })
})


// UT-03: normValue() should scale a value between 0 and 1 correctly
describe('normValue() normalises a value between min and max', () => {
  it('returns 0.5 for value 60 when min is 40 and max is 80', () => {
    expect(normValue(60, 40, 80)).toBe(0.5)
  })

  it('returns 0 when the value equals the minimum', () => {
    expect(normValue(40, 40, 80)).toBe(0)
  })

  it('returns 1 when the value equals the maximum', () => {
    expect(normValue(80, 40, 80)).toBe(1)
  })
})


// UT-04: fmt() should return a dash when the value is null or undefined
describe('fmt() returns a dash when value is missing', () => {
  it('returns a dash for null CDI value', () => {
    expect(fmt('cdi', null)).toBe('—')
  })

  it('returns a dash for undefined poverty rate', () => {
    expect(fmt('predicted_poverty_rate', undefined)).toBe('—')
  })

  it('returns a dash for null road density', () => {
    expect(fmt('road_density_km_per_km2', null)).toBe('—')
  })
})
