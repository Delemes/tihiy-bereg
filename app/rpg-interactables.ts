// Interaction System (§8–§10).
//
// Раньше любое действие с миром (сундук, доска, верстак, кровать) шло через
// open('talk') → диалоговое окно. Здесь объекты описаны данными: каждый вид
// точки даёт свой набор действий, а UI строит компактное контекстное меню
// по этому набору. Новый объект = строка в таблице, а не новое окно.
//
// Файл без runtime-importов — только структурные типы, чтобы не тянуть
// rpg-model в цикл зависимостей.

export type InteractionActionType =
	| 'open'
	| 'search'
	| 'take'
	| 'inspect'
	| 'use'
	| 'force'
	| 'rest'
	| 'cook'
	| 'craft'
	| 'read'
	| 'enter'
	| 'talk'
	| 'trade'
	| 'quest'
	| 'leave'
	/** мост к старой сцене, пока контент не переведён полностью */
	| 'legacy-scene'

export type InteractionContext = {
	flags: readonly string[]
	collected: readonly string[]
	visited: readonly string[]
	/** есть ли чем ломать/взламывать */
	hasTool: boolean
	/** есть ли ключ от конкретной двери */
	hasKey: boolean
	/** ночь — влияет на «Отдохнуть» */
	night: boolean
	/** рядом есть враги — часть действий блокируется */
	threatened: boolean
}

export type InteractionAction = {
	id: string
	label: string
	/** короткий глиф для рамки меню; не эмодзи */
	icon: string
	actionType: InteractionActionType
	/** подсказка одной строкой, только если она что-то добавляет */
	hint?: string
	/** показывать ли действие вообще */
	condition?: (ctx: InteractionContext) => boolean
	/** показать, но недоступным (с причиной) */
	disabled?: (ctx: InteractionContext) => string | null
}

export type Interactable = {
	id: string
	name: string
	description: string
	kind: string
	/** радиус в мировых единицах (до масштаба региона) */
	interactionRadius: number
	/** NPC и объекты — разные ветки UI (§9) */
	isNpc: boolean
	actions: InteractionAction[]
}

export type PlaceLike = {
	id: string
	name?: string
	kind: string
	label?: string
	description?: string
	target?: string
}

const act = (
	id: string,
	label: string,
	icon: string,
	actionType: InteractionActionType,
	extra: Partial<InteractionAction> = {},
): InteractionAction => ({ id, label, icon, actionType, ...extra })

const notCollected =
	(placeId: string) =>
	(ctx: InteractionContext): boolean =>
		!ctx.collected.includes(placeId)

const leave = act('leave', 'Оставить', '×', 'leave')

/**
 * Словарь «вид точки → доступные действия».
 * Виды совпадают с Place['kind'] из rpg-model.
 */
export const actionsByKind: Record<string, InteractionAction[]> = {
	chest: [
		act('open', 'Открыть', '▣', 'open'),
		act('inspect', 'Осмотреть', '?', 'inspect'),
		act('force', 'Взломать', '†', 'force', {
			disabled: (ctx) => (ctx.hasTool ? null : 'Нужен инструмент'),
		}),
		leave,
	],
	door: [
		act('enter', 'Войти', '→', 'enter'),
		act('inspect', 'Осмотреть', '?', 'inspect'),
		act('key', 'Использовать ключ', '⚷', 'use', {
			condition: (ctx) => ctx.hasKey,
		}),
		act('force', 'Взломать', '†', 'force', {
			disabled: (ctx) => (ctx.hasTool ? null : 'Нужен инструмент'),
		}),
		leave,
	],
	exit: [act('enter', 'Перейти', '→', 'enter'), leave],
	herb: [
		act('take', 'Собрать', '◆', 'take'),
		act('inspect', 'Осмотреть', '?', 'inspect'),
		leave,
	],
	wood: [
		act('take', 'Нарубить', '◆', 'take'),
		act('inspect', 'Осмотреть', '?', 'inspect'),
		leave,
	],
	flower: [
		act('take', 'Сорвать', '◆', 'take'),
		act('inspect', 'Осмотреть', '?', 'inspect'),
		leave,
	],
	dock: [
		act('use', 'Рыбачить', '≈', 'use'),
		act('inspect', 'Осмотреть', '?', 'inspect'),
		leave,
	],
	well: [
		act('use', 'Набрать воды', '≈', 'use'),
		act('search', 'Заглянуть внутрь', '‹', 'search'),
		leave,
	],
	clue: [
		act('inspect', 'Осмотреть', '?', 'inspect'),
		act('search', 'Обыскать', '‹', 'search', {
			condition: notCollected('__place__'),
		}),
		leave,
	],
	camp: [
		act('search', 'Обыскать', '‹', 'search'),
		act('inspect', 'Осмотреть', '?', 'inspect'),
		leave,
	],
	workbench: [
		act('craft', 'Работать', '⚒', 'craft', {
			disabled: (ctx) => (ctx.threatened ? 'Сначала разберись с угрозой' : null),
		}),
		act('inspect', 'Осмотреть', '?', 'inspect'),
		leave,
	],
	bed: [
		act('rest', 'Отдохнуть', '☽', 'rest', {
			disabled: (ctx) => (ctx.threatened ? 'Рядом опасно' : null),
		}),
		act('inspect', 'Осмотреть', '?', 'inspect'),
		leave,
	],
	grill: [
		act('cook', 'Готовить', '♨', 'cook'),
		act('inspect', 'Осмотреть', '?', 'inspect'),
		leave,
	],
	valve: [
		act('use', 'Повернуть', '⚷', 'use'),
		act('inspect', 'Осмотреть', '?', 'inspect'),
		leave,
	],
	board: [act('read', 'Прочитать', '≡', 'read'), leave],
	encounter: [act('inspect', 'Приглядеться', '?', 'inspect'), leave],
	npc: [
		act('talk', 'Заговорить', '“', 'talk'),
		act('trade', 'Торговать', '¤', 'trade'),
		leave,
	],
}

/** Запасной набор для неизвестного вида точки. */
const fallbackActions: InteractionAction[] = [
	act('inspect', 'Осмотреть', '?', 'inspect'),
	act('legacy', 'Взаимодействовать', '•', 'legacy-scene'),
	leave,
]

/** Глагол для подсказки рядом с объектом: [E] Открыть. */
export const promptVerbs: Record<string, string> = {
	chest: 'Открыть',
	door: 'Войти',
	exit: 'Перейти',
	herb: 'Собрать',
	wood: 'Нарубить',
	flower: 'Сорвать',
	dock: 'Рыбачить',
	well: 'Набрать воды',
	clue: 'Осмотреть',
	camp: 'Обыскать',
	workbench: 'Работать',
	bed: 'Отдохнуть',
	grill: 'Готовить',
	valve: 'Повернуть',
	board: 'Прочитать',
	npc: 'Заговорить',
	encounter: 'Приглядеться',
}

/** Радиусы по видам: дверь ловится ближе, чем вывеска. */
export const radiusByKind: Record<string, number> = {
	door: 52,
	exit: 72,
	npc: 60,
	board: 56,
	encounter: 80,
}

export const defaultRadius = 64

export function interactionRadius(kind: string): number {
	return radiusByKind[kind] ?? defaultRadius
}

export function isNpcKind(kind: string): boolean {
	return kind === 'npc'
}

/** Строит Interactable из обычной точки мира. */
export function toInteractable(
	place: PlaceLike,
	description = '',
): Interactable {
	const list = actionsByKind[place.kind] ?? fallbackActions
	return {
		id: place.id,
		name: place.name ?? place.label ?? 'Объект',
		description: description || place.description || '',
		kind: place.kind,
		interactionRadius: interactionRadius(place.kind),
		isNpc: isNpcKind(place.kind),
		actions: list.map((a) =>
			a.condition === undefined
				? a
				: { ...a, condition: rebind(a.condition, place.id) },
		),
	}
}

/** Заменяет плейсхолдер __place__ на реальный id точки. */
function rebind(
	condition: (ctx: InteractionContext) => boolean,
	placeId: string,
): (ctx: InteractionContext) => boolean {
	return (ctx) =>
		condition({
			...ctx,
			collected: ctx.collected.map((c) => (c === placeId ? '__place__' : c)),
		})
}

/** Список действий для меню: скрытые убраны, недоступные помечены. */
export type ResolvedAction = InteractionAction & {
	available: boolean
	reason: string | null
}

export function resolveActions(
	target: Interactable,
	ctx: InteractionContext,
): ResolvedAction[] {
	return target.actions
		.filter((a) => (a.condition ? a.condition(ctx) : true))
		.map((a) => {
			const reason = a.disabled ? a.disabled(ctx) : null
			return { ...a, available: !reason, reason }
		})
}

/** Подсказка у объекта: только клавиша и один глагол. */
export function promptFor(target: Interactable, key = 'E'): string {
	const verb = promptVerbs[target.kind] ?? 'Взаимодействовать'
	return `[${key}] ${verb}`
}

/**
 * Выбор цели для контекстного взаимодействия (§10).
 * Не просто ближайшая точка: то, на что смотрит герой, весит больше,
 * иначе в толпе объектов подсказка прыгает.
 */
export type CandidatePoint = {
	id: string
	kind: string
	x: number
	y: number
}

export function pickTarget<T extends CandidatePoint>(
	candidates: readonly T[],
	hero: { x: number; y: number; facing: number },
	scale = 1,
): T | null {
	let best: T | null = null
	let bestScore = Infinity
	for (const c of candidates) {
		const dx = c.x - hero.x
		const dy = c.y - hero.y
		const dist = Math.hypot(dx, dy)
		const radius = interactionRadius(c.kind) * scale
		if (dist > radius) continue
		const angle = Math.atan2(dy, dx)
		let diff = Math.abs(angle - hero.facing) % (Math.PI * 2)
		if (diff > Math.PI) diff = Math.PI * 2 - diff
		// штраф за направление мягкий: стоя вплотную можно взять объект
		// и без идеального поворота.
		const score = dist + diff * 26
		if (score < bestScore) {
			bestScore = score
			best = c
		}
	}
	return best
}
