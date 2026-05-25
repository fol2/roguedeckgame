import { GAME_CENTER_X, GAME_HEIGHT } from "./game-size";

export const PET_SLOT_SIZE = {
  width: 164,
  height: 88
} as const;

export const PET_LAYOUT = {
  y: GAME_HEIGHT - 366,
  gap: 18,
  maxSlots: 3
} as const;

export const PET_TEXT = {
  nicknameY: -24,
  nameY: 0,
  moodY: 24,
  fontSize: {
    nickname: "17px",
    name: "14px",
    mood: "12px"
  }
} as const;

export const getPetSlotPosition = (
  index: number,
  slotCount: number
): { readonly x: number; readonly y: number } => {
  const clampedSlotCount = Math.max(1, Math.min(slotCount, PET_LAYOUT.maxSlots));
  const totalWidth = clampedSlotCount * PET_SLOT_SIZE.width + (clampedSlotCount - 1) * PET_LAYOUT.gap;
  const startX = GAME_CENTER_X - totalWidth / 2 + PET_SLOT_SIZE.width / 2;

  return {
    x: startX + index * (PET_SLOT_SIZE.width + PET_LAYOUT.gap),
    y: PET_LAYOUT.y
  };
};
