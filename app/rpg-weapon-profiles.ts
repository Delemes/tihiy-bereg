// Data-driven weapon feel (§5).
//
// Раньше тайминги атак жили в виде чисел внутри rpg-combat.ts (0.16 / 0.22 / 0.26…),
// поэтому нож и топор ощущались одинаково. Здесь описана одна таблица:
// класс оружия -> startup / active / recovery / stamina / knockback / crit.
// Новое оружие добавляется строкой в weaponClasses, без правок боевого кода.
//
// Файл намеренно без import: он принимает любой объект оружия структурно
// (damage / reach / speed / arc / mode), чтобы не создавать циклических зависимостей.

export type WeaponClass =
	| 'unarmed'
	| 'light'
	| 'balanced'
	| 'heavy'
	| 'polearm'
	| 'ranged'

export type AttackKind = 'light' | 'heavy' | 'special'

export type WeaponLike = {
	damage?: number
	reach?: number
	/** длительность взмаха в секундах: меньше — быстрее */
	speed?: number
	arc?: number
	mode?: string
}

export type WeaponProfile = {
	weaponClass: WeaponClass
	/** секунды до появления hitbox */
	startup: number
	/** секунды, пока hitbox активен */
	active: number
	/** секунды блокировки после взмаха */
	recovery: number
	staminaCost: number
	/** смещение цели в мировых единицах */
	knockback: number
	/** секунды stagger у цели */
	stagger: number
	criticalChance: number
	criticalMultiplier: number
	/** множители геометрии поверх базовых reach/arc предмета */
	reachScale: number
	arcScale: number
	/** как сильно трясёт камеру попадание (0 = не трясёт) */
	shake: number
}

const profiles: Record<WeaponClass, WeaponProfile> = {
	unarmed: {
		weaponClass: 'unarmed',
		startup: 0.07,
		active: 0.08,
		recovery: 0.14,
		staminaCost: 5,
		knockback: 10,
		stagger: 0.16,
		criticalChance: 0.05,
		criticalMultiplier: 1.5,
		reachScale: 0.9,
		arcScale: 1,
		shake: 0,
	},
	light: {
		weaponClass: 'light',
		startup: 0.06,
		active: 0.07,
		recovery: 0.11,
		staminaCost: 6,
		knockback: 8,
		stagger: 0.14,
		criticalChance: 0.18,
		criticalMultiplier: 1.9,
		reachScale: 0.86,
		arcScale: 0.8,
		shake: 0,
	},
	balanced: {
		weaponClass: 'balanced',
		startup: 0.1,
		active: 0.09,
		recovery: 0.18,
		staminaCost: 8,
		knockback: 16,
		stagger: 0.22,
		criticalChance: 0.1,
		criticalMultiplier: 1.7,
		reachScale: 1,
		arcScale: 1,
		shake: 0.2,
	},
	heavy: {
		weaponClass: 'heavy',
		startup: 0.19,
		active: 0.11,
		recovery: 0.3,
		staminaCost: 13,
		knockback: 34,
		stagger: 0.38,
		criticalChance: 0.08,
		criticalMultiplier: 2,
		reachScale: 1.05,
		arcScale: 1.15,
		shake: 1,
	},
	polearm: {
		weaponClass: 'polearm',
		startup: 0.14,
		active: 0.08,
		recovery: 0.24,
		staminaCost: 10,
		knockback: 24,
		stagger: 0.26,
		criticalChance: 0.09,
		criticalMultiplier: 1.8,
		reachScale: 1.35,
		arcScale: 0.62,
		shake: 0.45,
	},
	ranged: {
		weaponClass: 'ranged',
		startup: 0.16,
		active: 0.05,
		recovery: 0.26,
		staminaCost: 7,
		knockback: 6,
		stagger: 0.12,
		criticalChance: 0.12,
		criticalMultiplier: 1.8,
		reachScale: 1,
		arcScale: 0.5,
		shake: 0,
	},
}

/** Карта существующих предметов → класс оружия. */
export const weaponClasses: Record<string, WeaponClass> = {
	fists: 'unarmed',
	stick: 'balanced',
	knife: 'light',
	axe: 'heavy',
	spear: 'polearm',
	saber: 'balanced',
	sling: 'ranged',
	bow: 'ranged',
	crossbow: 'ranged',
}

const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v

const num = (v: unknown, fallback: number) =>
	typeof v === 'number' && Number.isFinite(v) ? v : fallback

/** Палка — эталон темпа: её длительность взмаха принята за единицу. */
export const baseSwingTime = 0.62

export function weaponClassOf(id: string, weapon?: WeaponLike): WeaponClass {
	const known = weaponClasses[id]
	if (known) return known
	if (weapon?.mode === 'ranged' || weapon?.mode === 'throw') return 'ranged'
	const reach = num(weapon?.reach, 34)
	const damage = num(weapon?.damage, 6)
	if (reach > 46) return 'polearm'
	if (damage >= 14) return 'heavy'
	if (damage <= 5 && reach <= 30) return 'light'
	return 'balanced'
}

export function weaponProfile(id: string, weapon?: WeaponLike): WeaponProfile {
	return profiles[weaponClassOf(id, weapon)]
}

export type AttackFrames = {
	kind: AttackKind
	weaponClass: WeaponClass
	startup: number
	active: number
	recovery: number
	/** полная длительность взмаха */
	total: number
	damage: number
	reach: number
	arc: number
	staminaCost: number
	knockback: number
	stagger: number
	criticalChance: number
	criticalMultiplier: number
	shake: number
}

/** Множители вида атаки поверх профиля оружия. */
const kindScale: Record<
	AttackKind,
	{
		startup: number
		active: number
		recovery: number
		damage: number
		reach: number
		arc: number
		stamina: number
		knockback: number
		stagger: number
		shake: number
	}
> = {
	light: {
		startup: 1,
		active: 1,
		recovery: 1,
		damage: 1,
		reach: 1,
		arc: 1,
		stamina: 1,
		knockback: 1,
		stagger: 1,
		shake: 1,
	},
	heavy: {
		startup: 1.75,
		active: 1.3,
		recovery: 1.4,
		damage: 1.75,
		reach: 1.12,
		arc: 1.25,
		stamina: 2.6,
		knockback: 2.2,
		stagger: 1.6,
		shake: 2,
	},
	special: {
		startup: 1.2,
		active: 1.6,
		recovery: 1.6,
		damage: 1.45,
		reach: 1.3,
		arc: 1.9,
		stamina: 3,
		knockback: 1.6,
		stagger: 1.4,
		shake: 1.6,
	},
}

/**
 * Единственная точка, где считаются кадры атаки.
 * combat берёт отсюда и тайминги, и геометрию, и цену выносливости.
 */
export function attackFrames(
	id: string,
	weapon: WeaponLike | undefined,
	kind: AttackKind = 'light',
): AttackFrames {
	const profile = weaponProfile(id, weapon)
	const scale = kindScale[kind] ?? kindScale.light
	// speed в данных предмета — это длительность взмаха в секундах
	// (нож 0.35 быстрый, арбалет 1.55 медленный), а не множитель скорости.
	// Переводим её в темп относительно палки: 1 — обычный, больше — медленнее.
	const tempo = clamp(num(weapon?.speed, baseSwingTime) / baseSwingTime, 0.55, 2.2)
	const startup = clamp(profile.startup * scale.startup * tempo, 0.04, 0.55)
	const active = clamp(profile.active * scale.active * tempo, 0.04, 0.3)
	const recovery = clamp(profile.recovery * scale.recovery * tempo, 0.08, 0.6)
	const reach = clamp(
		num(weapon?.reach, 34) * profile.reachScale * scale.reach,
		18,
		180,
	)
	const arc = clamp(
		num(weapon?.arc, 1.1) * profile.arcScale * scale.arc,
		0.35,
		Math.PI,
	)
	return {
		kind,
		weaponClass: profile.weaponClass,
		startup,
		active,
		recovery,
		total: startup + active + recovery,
		damage: Math.max(1, Math.round(num(weapon?.damage, 5) * scale.damage)),
		reach,
		arc,
		staminaCost: Math.round(profile.staminaCost * scale.stamina),
		knockback: profile.knockback * scale.knockback,
		stagger: profile.stagger * scale.stagger,
		criticalChance: profile.criticalChance,
		criticalMultiplier: profile.criticalMultiplier,
		shake: profile.shake * scale.shake,
	}
}

/** Короткое описание ощущения оружия — для тултипов инвентаря. */
export const weaponClassNames: Record<WeaponClass, string> = {
	unarmed: 'без оружия',
	light: 'лёгкое',
	balanced: 'сбалансированное',
	heavy: 'тяжёлое',
	polearm: 'древковое',
	ranged: 'дальнего боя',
}
