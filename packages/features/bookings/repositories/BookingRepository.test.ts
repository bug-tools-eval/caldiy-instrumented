import type { PrismaClient } from "@calcom/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingRepository } from "./BookingRepository";

describe("BookingRepository", () => {
  let repository: BookingRepository;
  let mockPrismaClient: {
    $queryRaw: ReturnType<typeof vi.fn>;
    booking: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrismaClient = {
      $queryRaw: vi.fn(),
      booking: {
        findMany: vi.fn(),
      },
    };

    repository = new BookingRepository(mockPrismaClient as unknown as PrismaClient);
  });

  describe("getTotalBookingDuration", () => {
    it("should return total minutes from the database result", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ totalMinutes: 120 }]);

      const result = await repository.getTotalBookingDuration({
        eventId: 52,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      expect(result).toBe(120);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("should return 0 when totalMinutes is null", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ totalMinutes: null }]);

      const result = await repository.getTotalBookingDuration({
        eventId: 52,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      expect(result).toBe(0);
    });

    it("should call query when rescheduleUid is provided", async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ totalMinutes: 90 }]);

      const result = await repository.getTotalBookingDuration({
        eventId: 52,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        rescheduleUid: "existing-booking-uid",
      });

      expect(result).toBe(90);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe("findAllExistingBookingsForEventTypeBetween", () => {
    it("selects attendees only for queries that need attendee email matching", async () => {
      mockPrismaClient.booking.findMany.mockResolvedValue([]);

      await repository.findAllExistingBookingsForEventTypeBetween({
        eventTypeId: 3,
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-08T00:00:00.000Z"),
        userIdAndEmailMap: new Map([[4, "pro@example.com"]]),
      });

      expect(mockPrismaClient.booking.findMany).toHaveBeenCalledTimes(3);
      expect(mockPrismaClient.booking.findMany.mock.calls[0][0].select).not.toHaveProperty("attendees");
      expect(mockPrismaClient.booking.findMany.mock.calls[1][0].select.attendees).toEqual({
        select: { email: true },
      });
      expect(mockPrismaClient.booking.findMany.mock.calls[2][0].select.attendees).toEqual({
        select: { email: true },
      });
    });
  });
});
