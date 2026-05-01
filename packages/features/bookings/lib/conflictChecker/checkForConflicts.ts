import dayjs from "@calcom/dayjs";
import type { CurrentSeats } from "@calcom/features/availability/lib/getUserAvailability";
import type { BufferedBusyTime } from "@calcom/types/BufferedBusyTime";
import type { Dayjs } from "dayjs";

type BufferedBusyTimes = BufferedBusyTime[];

export type SortedBusyTime = { start: number; end: number };

/**
 * Pre-compute numeric, sorted busy times once before checking many slots against
 * the same `busy` array. Hoisting this out of `checkForConflicts` avoids re-running
 * `dayjs.utc(...)` and a full sort for every slot in the slot-generation loop.
 */
export function buildSortedBusyTimes(busy: BufferedBusyTimes): SortedBusyTime[] {
  if (!Array.isArray(busy) || busy.length < 1) {
    return [];
  }
  const result: SortedBusyTime[] = new Array(busy.length);
  for (let i = 0; i < busy.length; i++) {
    const b = busy[i];
    result[i] = {
      start: dayjs.utc(b.start).valueOf(),
      end: dayjs.utc(b.end).valueOf(),
    };
  }
  result.sort((a, b) => a.start - b.start);
  return result;
}

// if true, there are conflicts.
export function checkForConflicts({
  busy,
  time,
  eventLength,
  currentSeats,
  sortedBusyTimes: precomputedSortedBusyTimes,
}: {
  busy: BufferedBusyTimes;
  time: Dayjs;
  eventLength: number;
  currentSeats?: CurrentSeats;
  sortedBusyTimes?: SortedBusyTime[];
}) {
  // Early return
  if (!precomputedSortedBusyTimes && (!Array.isArray(busy) || busy.length < 1)) {
    return false; // guaranteed no conflicts when there is no busy times.
  }
  // no conflicts if some seats are found for the current time slot
  if (currentSeats?.some((booking) => booking.startTime.toISOString() === time.toISOString())) {
    return false;
  }
  const slotStart = time.valueOf();
  const slotEnd = slotStart + eventLength * 60 * 1000;

  const sortedBusyTimes = precomputedSortedBusyTimes ?? buildSortedBusyTimes(busy);

  for (const busyTime of sortedBusyTimes) {
    if (busyTime.start >= slotEnd) {
      break;
    }
    if (busyTime.end <= slotStart) {
      continue;
    }
    return true;
  }

  return false;
}
