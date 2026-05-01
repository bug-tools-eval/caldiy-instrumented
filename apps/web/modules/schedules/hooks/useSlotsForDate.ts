import { useCallback, useEffect, useMemo, useState } from "react";
import type { Slot, Slots } from "../lib/types";

/**
 * Gets slots for a specific date from the schedule cache.
 * @param date Format YYYY-MM-DD
 * @param scheduleCache Instance of useScheduleWithCache
 */

export const useSlotsForDate = (date: string | null, slots?: Slots) => {
  const slotsForDate = useMemo(() => {
    if (!date || typeof slots === "undefined") return [];
    return slots[date] || [];
  }, [date, slots]);

  return slotsForDate;
};

export const useSlotsForAvailableDates = (dates: (string | null)[], slots?: Slots) => {
  const [slotsPerDay, setSlotsPerDay] = useState<{ date: string | null; slots: Slots[string] }[]>([]);

  const toggleConfirmButton = useCallback((selectedSlot: Slot) => {
    setSlotsPerDay((prevSlotsPerDay) =>
      prevSlotsPerDay.map(({ date, slots }) => ({
        date,
        slots: slots.map((slot) => ({
          ...slot,
          showConfirmButton: slot.time === selectedSlot.time ? !selectedSlot?.showConfirmButton : false,
        })),
      }))
    );
  }, []);

  // The dates array changes identity when its content changes (the caller derives
  // it via useMemo on stable inputs). slots comes from React Query and only
  // changes identity when the query data changes — both are safe as plain deps,
  // and avoid the per-render JSON.stringify cost on a potentially large slots map.
  useEffect(() => {
    if (slots === undefined) {
      setSlotsPerDay([]);
      return;
    }

    const updatedSlots = dates
      .filter((date) => date !== null)
      .map((date) => ({
        slots: slots[`${date}`] || [],
        date,
      }));

    setSlotsPerDay(updatedSlots);
  }, [dates, slots]);

  return { slotsPerDay, setSlotsPerDay, toggleConfirmButton } as const;
};
