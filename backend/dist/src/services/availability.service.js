import { DateTime } from 'luxon';
import { AppointmentsRepository } from '../repositories/appointmentsRepository.js';
import { bookingConfig } from '../../config/booking.js';
export class AvailabilityService {
    repository;
    constructor() {
        this.repository = new AppointmentsRepository();
    }
    /**
     * Check availability for a requested appointment time range in a timezone
     * Order of checks short-circuits:
     * 1. in_past
     * 2. too_soon
     * 3. outside_hours
     * 4. weekend
     * 5. bad_duration
     * 6. conflict
     */
    async checkAvailability(startAt, endAt, tz) {
        const start = typeof startAt === 'string'
            ? DateTime.fromISO(startAt, { zone: tz })
            : DateTime.fromJSDate(startAt, { zone: tz });
        const end = typeof endAt === 'string'
            ? DateTime.fromISO(endAt, { zone: tz })
            : DateTime.fromJSDate(endAt, { zone: tz });
        if (!start.isValid || !end.isValid) {
            return {
                ok: false,
                reason: 'bad_duration',
                suggestions: [],
            };
        }
        const now = DateTime.now().setZone(tz);
        // 1. Check in_past
        if (start < now) {
            return {
                ok: false,
                reason: 'in_past',
                suggestions: [],
            };
        }
        // 2. Check too_soon (less than tooSoonMinutes from now)
        const tooSoonThreshold = now.plus({ minutes: bookingConfig.tooSoonMinutes });
        if (start < tooSoonThreshold) {
            return {
                ok: false,
                reason: 'too_soon',
                suggestions: [],
            };
        }
        // 3. Check outside_hours
        const startOfDay = start.startOf('day');
        const businessStart = startOfDay.set({
            hour: bookingConfig.businessHours.start,
            minute: 0,
            second: 0,
            millisecond: 0,
        });
        const businessEnd = startOfDay.set({
            hour: bookingConfig.businessHours.end,
            minute: 0,
            second: 0,
            millisecond: 0,
        });
        if (start < businessStart || end > businessEnd || !start.hasSame(end, 'day')) {
            return {
                ok: false,
                reason: 'outside_hours',
                suggestions: [],
            };
        }
        // 4. Check weekend (6 = Saturday, 7 = Sunday in Luxon)
        if (start.weekday === 6 || start.weekday === 7) {
            return {
                ok: false,
                reason: 'weekend',
                suggestions: [],
            };
        }
        // 5. Check bad_duration
        const durationMinutes = end.diff(start, 'minutes').minutes;
        if (durationMinutes < bookingConfig.minBookingDurationMinutes ||
            durationMinutes > bookingConfig.maxBookingDurationMinutes) {
            return {
                ok: false,
                reason: 'bad_duration',
                suggestions: [],
            };
        }
        // 6. Check conflict - fetch confirmed ranges for the day ONCE
        const dayStartJS = start.startOf('day').toJSDate();
        const dayEndJS = start.endOf('day').toJSDate();
        const confirmedRanges = await this.repository.getConfirmedRanges(dayStartJS, dayEndJS);
        const hasConflict = confirmedRanges.some((range) => {
            const busyStart = DateTime.fromJSDate(range.start, { zone: tz });
            const busyEnd = DateTime.fromJSDate(range.end, { zone: tz });
            // Overlap condition: busyStart < end AND busyEnd > start
            // Note: touching ranges (busyEnd === start or busyStart === end) are NOT conflicts
            return busyStart < end && busyEnd > start;
        });
        if (hasConflict) {
            const suggestions = this.generateSuggestions(start, end, confirmedRanges, tz);
            return {
                ok: false,
                reason: 'conflict',
                suggestions,
            };
        }
        return { ok: true };
    }
    /**
     * Pure helper function to generate suggestions
     * Returns up to 3 closest slots by absolute distance on same day,
     * or if none available on same day, scans next 3 business days at same time of day.
     */
    generateSuggestions(requestedStart, requestedEnd, confirmedRanges, tz) {
        const durationMinutes = requestedEnd.diff(requestedStart, 'minutes').minutes;
        const dayStart = requestedStart.startOf('day');
        const businessStart = dayStart.set({
            hour: bookingConfig.businessHours.start,
            minute: 0,
            second: 0,
            millisecond: 0,
        });
        const businessEnd = dayStart.set({
            hour: bookingConfig.businessHours.end,
            minute: 0,
            second: 0,
            millisecond: 0,
        });
        const busyList = confirmedRanges.map((r) => ({
            start: DateTime.fromJSDate(r.start, { zone: tz }),
            end: DateTime.fromJSDate(r.end, { zone: tz }),
        }));
        // Find all free slots on requested day in 15-minute steps
        const candidateSlots = [];
        let slotStart = businessStart;
        while (slotStart.plus({ minutes: durationMinutes }) <= businessEnd) {
            const slotEnd = slotStart.plus({ minutes: durationMinutes });
            const overlaps = busyList.some((b) => b.start < slotEnd && b.end > slotStart);
            if (!overlaps) {
                candidateSlots.push({ start: slotStart, end: slotEnd });
            }
            slotStart = slotStart.plus({ minutes: bookingConfig.slotDurationMinutes });
        }
        if (candidateSlots.length > 0) {
            // Sort by absolute distance to requestedStart
            candidateSlots.sort((a, b) => {
                const distA = Math.abs(a.start.diff(requestedStart, 'minutes').minutes);
                const distB = Math.abs(b.start.diff(requestedStart, 'minutes').minutes);
                return distA - distB;
            });
            return candidateSlots.slice(0, 3).map((s) => ({
                start: s.start.toISO(),
                end: s.end.toISO(),
            }));
        }
        // If none on same day: scan next 3 business days at the same time of day
        const suggestions = [];
        let daysScanned = 0;
        let checkDay = dayStart.plus({ days: 1 });
        while (suggestions.length < 3 && daysScanned < 3) {
            // Skip weekends
            if (checkDay.weekday === 6 || checkDay.weekday === 7) {
                checkDay = checkDay.plus({ days: 1 });
                continue;
            }
            const candStart = checkDay.set({
                hour: requestedStart.hour,
                minute: requestedStart.minute,
                second: 0,
                millisecond: 0,
            });
            const candEnd = candStart.plus({ minutes: durationMinutes });
            const bizStartNext = checkDay.set({
                hour: bookingConfig.businessHours.start,
                minute: 0,
                second: 0,
                millisecond: 0,
            });
            const bizEndNext = checkDay.set({
                hour: bookingConfig.businessHours.end,
                minute: 0,
                second: 0,
                millisecond: 0,
            });
            if (candStart >= bizStartNext && candEnd <= bizEndNext) {
                suggestions.push({
                    start: candStart.toISO(),
                    end: candEnd.toISO(),
                });
            }
            checkDay = checkDay.plus({ days: 1 });
            daysScanned++;
        }
        return suggestions;
    }
}
/**
 * Pure function helper export
 */
export async function checkAvailability(startAt, endAt, tz) {
    const service = new AvailabilityService();
    return service.checkAvailability(startAt, endAt, tz);
}
