import profileHtml from './profile.html?raw';
import { Stats } from '../../model/stats.model';
import { User } from '../../model/user.model';
import { TranslationService } from '../../service/translation.service';
import './profile.css';
import { setLang } from '../..';
import { UserService } from '../../service/user.service';

export class ProfilePage {
	private stats: Stats = new Stats();
	private userService: UserService = new UserService();
	private user: User = new User();
	private currentLang: string;
	
	constructor(lang: string) {
		this.currentLang = lang;
		
		console.log('🔍 ProfilePage Debug:');
		console.log('localStorage user:', localStorage.getItem('user'));
		console.log('localStorage token:', localStorage.getItem('token'));
		console.log('localStorage nickname:', localStorage.getItem('nickname'));

		// const userString = localStorage.getItem('user');
		// if (userString) {
		// 	try {
		// 		const user = JSON.parse(userString);
		// 		console.log('🔍 User source:', user.provider || 'local');
		// 	} catch (e) {
		// 		console.error('🔍 Error parsing user:', e);
		// 	}
		// }

		// this.userService.takeUserFromApi(localStorage.getItem('nickname') || '') 
		// 	.then((userData) => {
		// 		console.log('🔍 API call successful:', userData);
		// 		// ... resto del codice
		// 	})
		// 	.catch((error) => {
		// 		console.error('🔍 API call failed:', error);
		// 		console.error('🔍 This might be a token/auth issue');
		// 	});

		// this.userService.takeUserFromApi(localStorage.getItem('nickname') || '') 
		// 	.then((userData) => {
		// 		this.user.name = userData.name || '';
		// 		this.user.surname = userData.surname || '';
		// 		this.user.nickname = userData.nickname;
		// 		this.user.email = userData.email;
		// 		this.user.image_url = userData.image_url;
		// 		this.user.stats = userData.stats[0];
		// 		this.user.id = userData.id;
		// 		this.stats = this.user.stats || new Stats();
		// 		this.render();
		// 	})
		// 	.catch((error) => {
		// 		console.error('Error fetching user data:', error);
		// 	});

		// Solo per lavorare sulla pagina user senza dati utente veri, per ucolla. NON CANCELLARE! 
		this.user.name = 'Test';
		this.user.surname = 'User';
		this.user.nickname = localStorage.getItem('nickname') || 'testuser';
		this.user.email = 'test@example.com';
		this.user.image_url = './src/utils/default.png';
		this.stats = new Stats();
		this.render();
	}

	private render() {
		const appDiv = document.getElementById('app');

		if (appDiv) {
			const translation = new TranslationService(this.currentLang);
			const translatedHtml = translation.translateTemplate(profileHtml);
			console.log("user", this.user);
			appDiv.innerHTML = translatedHtml;
			
			this.setNewLang()
			
			this.showValueProfile("name");
			this.showValueProfile("nickname");
			this.showValueProfile("surname");
			this.showValueProfile("email");
			
			// this.showValueStats("number_of_games")
			// this.showValueStats("number_of_wins")
			// this.showValueStats("number_of_losses")
			// this.showValueStats("number_of_draws")
			// this.showValueStats("number_of_points")
			// this.showValueStats("average_score")
			// this.showValueStats("percentage_wins")
			// this.showValueStats("percentage_losses")
			// this.showValueStats("percentage_draws")
			
			setTimeout(() => {
				const imgElement = document.getElementById('profile_image') as HTMLImageElement;
				imgElement.src = this.user.image_url;
			}, 0);
			this.setProfileImage();
		}
	}

	private setNewLang() {
		const langBtns = document.querySelectorAll('[data-lang]');
			langBtns.forEach((btn) => {
				const lang = btn.getAttribute('data-lang');
				if (lang) {
					btn.addEventListener('click', () => {
						setLang(lang);
						this.currentLang = lang;
						this.render();
					})
				}
			})
	}

	private showValueStats(property: string) {
		const element = document.getElementById(property);
		if (element) {
			element.textContent = this.stats[property as keyof Stats]?.toString() || '0';
		}
	}

	private showValueProfile(property: string) {
		const id = "profile_" + property;
		const element = document.getElementById(id);
		if (element) {
			element.textContent = this.user[property as keyof User]?.toString() || '-';
		}
	}

	private setProfileImage() {
    const profileImage = document.getElementById('profile_image') as HTMLImageElement;
    if (profileImage && this.user.image_url) {
			profileImage.src = this.user.image_url;
			profileImage.onerror = () => {
				// Fallback se l'immagine non carica
				profileImage.src = './src/utils/default.png';
			};
		}
	}
}