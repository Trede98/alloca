let stored: string | null = null;
if (typeof localStorage !== 'undefined') {
	stored = localStorage.getItem('alloca-theme');
}

let theme = $state<'dark' | 'light'>((stored === 'light' ? 'light' : 'dark') as 'dark' | 'light');

function apply(t: 'dark' | 'light') {
	if (typeof document !== 'undefined') {
		document.documentElement.setAttribute('data-theme', t);
	}
}

apply(theme);

export function getTheme() {
	return theme;
}

export function toggleTheme() {
	theme = theme === 'dark' ? 'light' : 'dark';
	apply(theme);
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem('alloca-theme', theme);
	}
}
