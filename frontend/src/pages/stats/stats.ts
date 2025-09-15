import statsHtml from './stats.html?raw';
import { Stats } from '../../model/stats.model';
import './stats.css';
import { TranslationService } from '../../service/translation.service';

export class StatsPage {
	private stats: Stats;
	private currentLang: string;

	constructor(lang = 'en', stats?: Stats) {
		this.currentLang = lang;
		this.stats = stats || {
			stat_index: 0,
			nickname: '',
			number_of_games: 0,
			number_of_wins: 0,
			number_of_losses: 0,
			number_of_draws: 0,
			number_of_points: 0,
			average_score: 0,
			percentage_wins: 0,
			percentage_losses: 0,
			percentage_draws: 0
		};
		this.render();
	}

	private render() {
		const appDiv = document.getElementById('app');
		if (appDiv) {
			const translation = new TranslationService(this.currentLang);
			const translatedHtml = translation.translateTemplate(statsHtml);
			appDiv.innerHTML = translatedHtml;

			// set image and nickname
			const img = document.getElementById('stats_image') as HTMLImageElement | null;
			if (img) img.src = (this.stats as any).image_url || './src/utils/default.png';
			const nick = document.getElementById('stats_nickname');
			if (nick) nick.textContent = this.stats.nickname || '';

			// populate numeric stats
			this.showValueStats('number_of_games');
			this.showValueStats('number_of_wins');
			this.showValueStats('number_of_losses');
			this.showValueStats('number_of_draws');
			this.showValueStats('number_of_points');
			this.showValueStats('average_score');
			this.showValueStats('percentage_wins');
			this.showValueStats('percentage_losses');
			this.showValueStats('percentage_draws');
		}
	}

	private showValueStats(property: string) {
		const element = document.getElementById(property);
		if (element) {
			const val = (this.stats as any)[property] ?? 0;
			element.textContent = this.formatToTwoDecimals(String(val));
		}
	}

	private formatToTwoDecimals(value: string): string {
		const num = Number(value);
		if (isNaN(num)) return value;
		if (num % 1 !== 0) return num.toFixed(2);
		return num.toString();
	}
}