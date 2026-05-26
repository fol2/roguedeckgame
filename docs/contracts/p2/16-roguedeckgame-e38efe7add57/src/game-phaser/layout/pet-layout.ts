import { COMBAT_BOARD, KEEPER_AVATAR } from "./combat-layout";

export const PET_SLOT_SIZE = {
  width: 118,
  height: 118
} as const;

export const PET_LAYOUT = {
  x: KEEPER_AVATAR.x + 122,
  y: KEEPER_AVATAR.y - 12,
  futureSlotGap: 70,
  maxSlots: 3,
  activeRingRadius: 46,
  futureRingRadius: 26,
  labelY: 62,
  statusY: 98,
  chargeY: -54,
  chargeGap: 16
} as const;

export const PET_TEXT = {
  nicknameY: PET_LAYOUT.labelY,
  nameY: PET_LAYOUT.labelY + 17,
  moodY: PET_LAYOUT.statusY,
  fontSize: {
    nickname: "13px",
    name: "11px",
    mood: "10px"
  }
} as const;

export const getPetSlotPosition = (
  index: number
): { readonly x: number; readonly y: number } => {
  if (index === 0) {
    return {
      x: PET_LAYOUT.x,
      y: PET_LAYOUT.y
    };
  }

  return {
    x: Math.min(PET_LAYOUT.x + index * PET_LAYOUT.futureSlotGap, COMBAT_BOARD.x + COMBAT_BOARD.width / 2 - 42),
    y: PET_LAYOUT.y + 8
  };
};
