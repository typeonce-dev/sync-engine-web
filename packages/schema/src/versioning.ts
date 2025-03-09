export const Version = [1, 2, 3] as const;
export type Version = (typeof Version)[number];
