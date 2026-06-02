import { Injectable } from '@angular/core';

export interface TempReading {
  time: string;
  value: number;
  alert: boolean;
}

@Injectable({ providedIn: 'root' })
export class TemperatureService {
  constructor() {}

  // Mocked current temperature for an order
  getCurrentTemp(orderCode?: string): number {
    const base = orderCode && orderCode.includes('RE') ? 3.5 : 4.5;
    return parseFloat((base + (Math.random() - 0.5) * 1.2).toFixed(1));
  }

  // Return an array of historical readings (mock)
  getReadings(orderCode?: string, count = 10, baseline = 4.5): TempReading[] {
    const now = Date.now();
    const readings: TempReading[] = [];
    for (let i = count - 1; i >= 0; i--) {
      const time = new Date(now - i * 5 * 60 * 1000);
      const value = parseFloat((baseline + (Math.random() - 0.5) * 0.6).toFixed(1));
      readings.push({ time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value, alert: value > 6.0 });
    }
    return readings;
  }
}
