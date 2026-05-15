import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import * as m from '$lib/paraglide/messages';

const TOUR_KEY = 'alloca_tour_seen';

export function hasTourBeenSeen(): boolean {
	return localStorage.getItem(TOUR_KEY) === 'true';
}

export function markTourSeen(): void {
	localStorage.setItem(TOUR_KEY, 'true');
}

export function startTour(onSelectMonth: () => void, onTourEnd: () => void): void {
	const d = driver({
		animate: true,
		smoothScroll: true,
		overlayOpacity: 0.55,
		stagePadding: 6,
		stageRadius: 8,
		showProgress: true,
		progressText: '{{current}} / {{total}}',
		allowClose: true,
		popoverClass: 'alloca-tour-popover',
		nextBtnText: m.tour_next(),
		prevBtnText: m.tour_prev(),
		doneBtnText: m.tour_done(),
		onDestroyStarted: () => {
			localStorage.setItem(TOUR_KEY, 'true');
			onTourEnd();
			d.destroy();
		}
	});

	d.setSteps([
		{
			element: () => {
				const desktop = document.querySelector('[data-tour="summary-bar-desktop"]') as HTMLElement;
				return desktop && getComputedStyle(desktop).display !== 'none'
					? desktop
					: (document.querySelector('[data-tour="summary-bar-mobile"]') as HTMLElement);
			},
			popover: {
				title: m.tour_step_summary_title(),
				description: m.tour_step_summary_desc(),
				side: 'bottom'
			}
		},
		{
			element: '[data-tour="month-sidebar"]',
			popover: {
				title: m.tour_step_sidebar_title(),
				description: m.tour_step_sidebar_desc(),
				side: 'right'
			}
		},
		{
			element: '[data-tour="year-overview-btn"]',
			popover: {
				title: m.tour_step_year_overview_title(),
				description: m.tour_step_year_overview_desc(),
				side: 'right'
			}
		},
		{
			element: '[data-tour="first-month-card"]',
			popover: {
				title: m.tour_step_month_card_title(),
				description: m.tour_step_month_card_desc(),
				side: 'right',
				onNextClick: () => {
					onSelectMonth();
					setTimeout(() => d.moveNext(), 100);
				}
			}
		},
		{
			element: '[data-tour="month-detail-header"]',
			popover: {
				title: m.tour_step_month_header_title(),
				description: m.tour_step_month_header_desc(),
				side: 'bottom'
			}
		},
		{
			element: '[data-tour="entry-lists"]',
			popover: {
				title: m.tour_step_entries_title(),
				description: m.tour_step_entries_desc(),
				side: 'left'
			}
		},
		{
			element: '[data-tour="add-entry-btn"]',
			popover: {
				title: m.tour_step_add_entry_title(),
				description: m.tour_step_add_entry_desc(),
				side: 'top'
			}
		},
		{
			element: '[data-tour="first-entry-row"]',
			popover: {
				title: m.tour_step_entry_actions_title(),
				description: m.tour_step_entry_actions_desc(),
				side: 'bottom'
			}
		},
		{
			element: '[data-tour="settings-btn"]',
			popover: {
				title: m.tour_step_settings_title(),
				description: m.tour_step_settings_desc(),
				side: 'bottom',
				align: 'end'
			}
		}
	]);

	d.drive(0);
}
