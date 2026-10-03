import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AvailabilityService } from "../availability.service.js";
import { DateTime } from "luxon";

// Mock the database query function for unit tests
vi.mock("../../lib/database.js", () => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
}));

describe("AvailabilityService (Unit Tests)", () => {
  let service: AvailabilityService;
  let mockGetConfirmedRanges: any;

  // Choose a Monday during standard time so business days tests are clean
  // 2026-10-05 is a Monday
  const FIXED_NOW_ISO = "2026-10-05T08:00:00.000Z";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_NOW_ISO));

    service = new AvailabilityService();
    mockGetConfirmedRanges = vi
      .spyOn((service as any).repository, "getConfirmedRanges")
      .mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("Table-driven checkAvailability tests", () => {
    const tableCases = [
      {
        name: "short-circuits to in_past if startAt is in the past",
        startAt: "2026-10-05T07:30:00.000Z",
        endAt: "2026-10-05T08:30:00.000Z",
        tz: "UTC",
        expectedReason: "in_past",
      },
      {
        name: "short-circuits to too_soon if startAt is less than 15 mins from now",
        // Now is 08:00 UTC. 08:10 UTC is in 10 mins (< 15 mins)
        startAt: "2026-10-05T08:10:00.000Z",
        endAt: "2026-10-05T08:40:00.000Z",
        tz: "UTC",
        expectedReason: "too_soon",
      },
      {
        name: "request starting before opening (08:30 in 09:00-17:00 biz hours)",
        startAt: "2026-10-06T08:30:00.000",
        endAt: "2026-10-06T09:30:00.000",
        tz: "America/New_York",
        expectedReason: "outside_hours",
      },
      {
        name: "request ending after close (16:30 to 17:30 in 09:00-17:00 biz hours)",
        startAt: "2026-10-06T16:30:00.000",
        endAt: "2026-10-06T17:30:00.000",
        tz: "America/New_York",
        expectedReason: "outside_hours",
      },
      {
        name: "request on Saturday (weekend)",
        startAt: "2026-10-10T10:00:00.000",
        endAt: "2026-10-10T11:00:00.000",
        tz: "America/New_York",
        expectedReason: "weekend",
      },
      {
        name: "request on Sunday (weekend)",
        startAt: "2026-10-11T10:00:00.000",
        endAt: "2026-10-11T11:00:00.000",
        tz: "America/New_York",
        expectedReason: "weekend",
      },
      {
        name: "bad_duration when duration is under 30 minutes",
        startAt: "2026-10-06T10:00:00.000",
        endAt: "2026-10-06T10:15:00.000",
        tz: "America/New_York",
        expectedReason: "bad_duration",
      },
      {
        name: "bad_duration when duration is over 240 minutes (4 hours)",
        startAt: "2026-10-06T10:00:00.000",
        endAt: "2026-10-06T15:00:00.000",
        tz: "America/New_York",
        expectedReason: "bad_duration",
      },
    ];

    it.each(tableCases)(
      "$name -> returns reason $expectedReason",
      async ({ startAt, endAt, tz, expectedReason }) => {
        const res = await service.checkAvailability(startAt, endAt, tz);
        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.reason).toBe(expectedReason);
          expect(res.suggestions).toEqual([]);
        }
        // Early short-circuits must never call repository
        expect(mockGetConfirmedRanges).not.toHaveBeenCalled();
      },
    );
  });

  describe("DST-free and timezone boundaries", () => {
    it("handles DST-free timezone boundaries (e.g. UTC / Asia/Riyadh / America/Phoenix)", async () => {
      // 2026-10-06 in Asia/Riyadh (UTC+3, no DST)
      // 10:00 to 11:00 Riyadh time = 07:00 to 08:00 UTC
      const startAt = "2026-10-06T10:00:00";
      const endAt = "2026-10-06T11:00:00";
      const tz = "Asia/Riyadh";

      const res = await service.checkAvailability(startAt, endAt, tz);
      expect(res.ok).toBe(true);
      expect(mockGetConfirmedRanges).toHaveBeenCalledTimes(1);
    });

    it("handles Arizona (America/Phoenix - DST free) business hours accurately", async () => {
      const startAt = "2026-10-06T09:00:00";
      const endAt = "2026-10-06T10:00:00";
      const tz = "America/Phoenix";

      const res = await service.checkAvailability(startAt, endAt, tz);
      expect(res.ok).toBe(true);
    });
  });

  describe("Adjacent bookings (touching ranges are NOT conflicts)", () => {
    it("allows a booking that touches an existing booking start or end boundary", async () => {
      const tz = "America/New_York";
      // Existing confirmed range: 10:00 to 11:00 NY time
      const dayStartNY = DateTime.fromISO("2026-10-06T00:00:00", {
        zone: tz,
      }).toJSDate();
      const dayEndNY = DateTime.fromISO("2026-10-06T23:59:59.999", {
        zone: tz,
      }).toJSDate();

      const existingStart = DateTime.fromISO("2026-10-06T10:00:00", {
        zone: tz,
      }).toJSDate();
      const existingEnd = DateTime.fromISO("2026-10-06T11:00:00", {
        zone: tz,
      }).toJSDate();

      mockGetConfirmedRanges.mockResolvedValue([
        { start: existingStart, end: existingEnd },
      ]);

      // Slot 1: 09:00 to 10:00 (ends exactly when existing starts)
      const res1 = await service.checkAvailability(
        "2026-10-06T09:00:00",
        "2026-10-06T10:00:00",
        tz,
      );
      expect(res1.ok).toBe(true);

      // Slot 2: 11:00 to 12:00 (starts exactly when existing ends)
      const res2 = await service.checkAvailability(
        "2026-10-06T11:00:00",
        "2026-10-06T12:00:00",
        tz,
      );
      expect(res2.ok).toBe(true);
    });
  });

  describe("Conflict detection & Suggestions", () => {
    it("detects overlap conflict and returns 3 closest suggestions on same day", async () => {
      const tz = "America/New_York";
      // Existing booking: 10:00 to 11:30
      const existingStart = DateTime.fromISO("2026-10-06T10:00:00", {
        zone: tz,
      }).toJSDate();
      const existingEnd = DateTime.fromISO("2026-10-06T11:30:00", {
        zone: tz,
      }).toJSDate();

      mockGetConfirmedRanges.mockResolvedValue([
        { start: existingStart, end: existingEnd },
      ]);

      // Request: 10:30 to 11:30 (overlaps with existing 10:00-11:30)
      const res = await service.checkAvailability(
        "2026-10-06T10:30:00",
        "2026-10-06T11:30:00",
        tz,
      );

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason).toBe("conflict");
        expect(res.suggestions.length).toBe(3);

        // Closest free starts to 10:30 should be: 11:30 (+60m), 09:30 (-60m), 12:00 (+90m) or 09:00 (-90m)
        const suggestionStarts = res.suggestions.map((s) => s.start);
        expect(suggestionStarts).toContain("2026-10-06T11:30:00.000-04:00");
        expect(suggestionStarts).toContain("2026-10-06T09:00:00.000-04:00");
      }
    });

    it("fully booked day: scans next 3 business days at same time of day and handles weekend rollover", async () => {
      const tz = "America/New_York";
      // Friday 2026-10-09 fully booked from 09:00 to 17:00
      const dayStart = DateTime.fromISO("2026-10-09T09:00:00", {
        zone: tz,
      }).toJSDate();
      const dayEnd = DateTime.fromISO("2026-10-09T17:00:00", {
        zone: tz,
      }).toJSDate();

      mockGetConfirmedRanges.mockResolvedValue([
        { start: dayStart, end: dayEnd },
      ]);

      // Request 10:00 to 11:00 on Friday 2026-10-09
      const res = await service.checkAvailability(
        "2026-10-09T10:00:00",
        "2026-10-09T11:00:00",
        tz,
      );

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reason).toBe("conflict");
        expect(res.suggestions.length).toBe(3);

        // Next 3 business days after Friday Oct 9:
        // Mon Oct 12, Tue Oct 13, Wed Oct 14 (skipping Sat Oct 10 & Sun Oct 11!)
        const suggestionStarts = res.suggestions.map((s) => s.start);
        expect(suggestionStarts[0]).toContain("2026-10-12T10:00:00");
        expect(suggestionStarts[1]).toContain("2026-10-13T10:00:00");
        expect(suggestionStarts[2]).toContain("2026-10-14T10:00:00");
      }
    });
  });
});
