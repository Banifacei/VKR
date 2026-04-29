/** Русская плюрализация: pluralizeRu(1, 'урок', 'урока', 'уроков') → 'урок' */
export const pluralizeRu = (n: number, one: string, few: string, many: string): string => {
    const abs = Math.abs(n) % 100;
    const mod = abs % 10;
    if (abs > 10 && abs < 20) return many;
    if (mod === 1) return one;
    if (mod >= 2 && mod <= 4) return few;
    return many;
};
