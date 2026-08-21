/**
 * Inventário único de ícones do app (Lucide).
 *
 * Cada ícone é importado pelo seu subcaminho (`lucide-react-native/icons/<nome>`) em vez do
 * barrel da raiz: o barrel arrasta os ~1.600 componentes da biblioteca para o bundle, e o Metro
 * não faz tree-shaking por padrão. Importar aqui, um a um, mantém no bundle só o que a interface
 * realmente desenha — e deixa a lista de ícones do produto visível num arquivo só.
 *
 * Os subcaminhos exportam `default`; o rename para export nomeado acontece aqui, para que o resto
 * do código siga a regra de só usar exports nomeados (CLAUDE.md §3.5).
 */
export { default as ActivityIcon } from 'lucide-react-native/icons/activity';
export { default as BellIcon } from 'lucide-react-native/icons/bell';
export { default as CalendarDaysIcon } from 'lucide-react-native/icons/calendar-days';
export { default as CheckIcon } from 'lucide-react-native/icons/circle-check';
export { default as ChevronDownIcon } from 'lucide-react-native/icons/chevron-down';
export { default as ChevronRightIcon } from 'lucide-react-native/icons/chevron-right';
export { default as ClipboardListIcon } from 'lucide-react-native/icons/clipboard-list';
export { default as ClockIcon } from 'lucide-react-native/icons/clock';
export { default as DownloadIcon } from 'lucide-react-native/icons/download';
export { default as HeartPulseIcon } from 'lucide-react-native/icons/heart-pulse';
export { default as InfoIcon } from 'lucide-react-native/icons/info';
export { default as LogOutIcon } from 'lucide-react-native/icons/log-out';
export { default as MoonIcon } from 'lucide-react-native/icons/moon';
export { default as PlusIcon } from 'lucide-react-native/icons/plus';
export { default as SettingsIcon } from 'lucide-react-native/icons/settings';
export { default as ShieldCheckIcon } from 'lucide-react-native/icons/shield-check';
export { default as SmartphoneIcon } from 'lucide-react-native/icons/smartphone';
export { default as SunIcon } from 'lucide-react-native/icons/sun';
export { default as SunMoonIcon } from 'lucide-react-native/icons/sun-moon';
export { default as TrashIcon } from 'lucide-react-native/icons/trash-2';
export { default as TrendingUpIcon } from 'lucide-react-native/icons/trending-up';
export { default as TriangleAlertIcon } from 'lucide-react-native/icons/triangle-alert';
export { default as UserRoundIcon } from 'lucide-react-native/icons/user-round';

export type { LucideIcon } from 'lucide-react-native';
