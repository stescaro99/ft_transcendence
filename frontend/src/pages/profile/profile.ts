import profileHtml from './profile.html?raw';
import { Stats } from '../../model/stats.model';
import { User } from '../../model/user.model';
import { TranslationService } from '../../service/translation.service';
import './profile.css';
import { setLang } from '../..';
import { UserService } from '../../service/user.service';
import { AuthenticationService } from '../../service/authentication.service';
import { Game } from '../../model/game.model';

export class ProfilePage {
	private stats: Stats = new Stats();
	private userService: UserService = new UserService();
	private user: User = new User();
	private currentLang: string;
	private editMode : boolean = false;
	private tempImageFile: File | null = null;
	private authService: AuthenticationService = new AuthenticationService();
	private translationService: TranslationService;

	constructor(lang: string, nickname: string) {
		this.currentLang = lang;
		this.setTheme('blue');
		

		this.userService.takeUserFromApi(decodeURIComponent(nickname) || '') 
			.then((userData) => {
				this.user.name = userData.name || '';
				this.user.surname = userData.surname || '';
				this.user.nickname = userData.nickname;
				this.user.tfa_code = userData.tfa_code || null;
				this.user.email = userData.email;
				this.user.stats.games = userData.stats[0]?.games || [];
				this.user.image_url = userData.image_url;
				// prefer backend language, else keep page's incoming lang, else default to 'en'
				this.user.language = userData.language || this.user.language || this.currentLang || 'en';
				if (this.user.language && this.currentLang !== this.user.language) {
					this.currentLang = this.user.language;
					try { setLang(this.currentLang); } catch(e) { console.warn('setLang failed', e); }
				}
				this.user.stats = userData.stats[0];
				this.user.id = userData.id;
				this.stats = this.user.stats || new Stats();
				this.render();
			})
			.catch((error) => {
				console.error('Error fetching user data:', error);
				
				this.user.name = 'Test';
				this.user.surname = 'User';
				this.user.nickname = /*sessionStorage.getItem('nickname') || */'testuser';
				this.user.email = 'test@example.com';
				this.user.image_url = './src/utils/default.png';
				this.stats = new Stats();
				this.render();
			});
	}
	
	private render() {
		const appDiv = document.getElementById('app');

		if (appDiv) {
			this.translationService = new TranslationService(this.currentLang);
			const translatedHtml = this.translationService.translateTemplate(profileHtml);
			appDiv.innerHTML = translatedHtml;
			
			this.setNewLang()
			
			this.showValueProfile("name");
			this.showValueProfile("nickname");
			this.showValueProfile("surname");
			this.showValueProfile("email");
			
			this.showValueStats("number_of_games")
			this.showValueStats("number_of_wins")
			this.showValueStats("number_of_losses")
			this.showValueStats("number_of_draws")
			this.showValueStats("number_of_tournaments_won")
			this.showValueStats("number_of_points")
			this.showValueStats("average_score")
			this.showValueStats("percentage_wins")
			this.showValueStats("percentage_losses")
			this.showValueStats("percentage_draws")
			
			if (this.user.nickname !== sessionStorage.getItem('nickname')) {
				const changeProfileBtn = document.getElementById('change_profile');
				if (changeProfileBtn) {
					changeProfileBtn.classList.add('hidden');
				}
			}
			setTimeout(() => {
				const imgElement = document.getElementById('profile_image') as HTMLImageElement;
				imgElement.src = this.user.image_url;
			}, 0);
			this.setProfileImage();

			// Pie chart vittorie/sconfitte
			setTimeout(() => {
					const wins = this.stats.number_of_wins || 0;
					const losses = this.stats.number_of_losses || 0;
					const ctx = document.getElementById('winLossPieChart') as HTMLCanvasElement;
					// Traduzioni legenda
					const legendTitle = this.translationService.translateTemplate("{{profilepage.number_of_wins}}") + ' / ' + this.translationService.translateTemplate("{{profilepage.number_of_losses}}")
					const winLabel = this.translationService.translateTemplate("{{profilepage.number_of_wins}}")
					const lossLabel = this.translationService.translateTemplate("{{profilepage.number_of_losses}}")
					// Aggiorna legenda
					const legendTitleElem = document.querySelector('.legend-title');
					if (legendTitleElem) legendTitleElem.textContent = legendTitle;
					const legendListItems = document.querySelectorAll('.legend-list li');
					if (legendListItems.length > 0) legendListItems[0].innerHTML = '<span class="legend-color win"></span> ' + winLabel;
					if (legendListItems.length > 1) legendListItems[1].innerHTML = '<span class="legend-color loss"></span> ' + lossLabel;
					if (ctx) {
						import('chart.js/auto').then((Chart) => {
							new Chart.default(ctx, {
								type: 'pie',
								data: {
									labels: [winLabel, lossLabel],
									datasets: [{
										data: [wins, losses],
										backgroundColor: [
											'rgba(54, 162, 235, 0.7)',
											'rgba(255, 99, 132, 0.7)'
										],
										borderColor: [
											'rgba(54, 162, 235, 1)',
											'rgba(255, 99, 132, 1)'
										],
										borderWidth: 2
									}]
								},
								options: {
									responsive: false,
									maintainAspectRatio: false,
									plugins: {
										legend: {
											display: false
										}
									}
								}
							});
						});
					}
			}, 100);
		}
		this.addlisteners();
	}

	private translateDynamicContent(element: HTMLElement) {
		const html = element.innerHTML;
		const translatedHtml = this.translationService.translateTemplate(html);
		element.innerHTML = translatedHtml;

		const inputs = element.querySelectorAll('input[placeholder-template]') as NodeListOf<HTMLInputElement>;
		inputs.forEach((input) => {
			const placeholderTemplate = input.getAttribute('placeholder-template');
			if (placeholderTemplate) {
				const translatedPlaceholder = this.translationService.translateTemplate(placeholderTemplate);
				input.placeholder = translatedPlaceholder;
				input.removeAttribute('placeholder-template');
			}
		});
	}
	private addlisteners() {
		const changeProfileBtn = document.getElementById('change_profile');
		if (changeProfileBtn) {
			changeProfileBtn.addEventListener('click', () => {
				if (!this.editMode) {
					this.editMode = true;
                	changeProfileBtn.textContent = 'Save';

					const editImageBtn = document.getElementById('edit_image_btn');
					if (editImageBtn) {
						editImageBtn.classList.remove('hidden');
						editImageBtn.addEventListener('click',this.handleImageEdit.bind(this));
					}

					const namediv = document.getElementById('profile_name_div');
					if (namediv) {
						namediv.innerHTML= `<input type="text" class="bg-c-400 rounded-2xl text-center" id="profile_name_input" value="${this.user.name}">`;
					}
					const surnamediv = document.getElementById('profile_surname_div');
					if (surnamediv) {
						surnamediv.innerHTML= `<input type="text" class="bg-c-400 rounded-2xl text-center" id="profile_surname_input" value="${this.user.surname}">`;
					}
					if (this.user.tfa_code !== null) {
						const emaildiv = document.getElementById('profile_email_div');
						if (emaildiv) {
							emaildiv.innerHTML= `<input type="email" class="bg-c-400 rounded-2xl text-center" id="profile_email_input" value="${this.user.email}">`;
						}
						const passworddiv = document.getElementById('password_div');
						if (passworddiv) {
							passworddiv.innerHTML = `<input type="password" class="bg-c-400 rounded-2xl text-center" id="profile_password_input" placeholder-template="{{profilepage.new_password}}">`;
							this.translateDynamicContent(passworddiv);
						}
					}
				} else {
					this.editMode = false;
					const tempDiv = document.createElement('div');
					tempDiv.innerHTML = '{{profilepage.change_profile}}';
					this.translateDynamicContent(tempDiv);
					changeProfileBtn.textContent = tempDiv.textContent || 'Change Profile';

					const editImageBtn = document.getElementById('edit_image_btn');
					if (editImageBtn) {
						editImageBtn.classList.add('hidden');
					}
					this.saveProfile();
				}


			});
		}
		const historyBtn = document.getElementById('showHistory');
		const customModal = document.getElementById('customModal');
		const closeMOdalBtn = document.getElementById('closeModalBtn');
		const modalContent = document.getElementById('modalContent');
		if (historyBtn && customModal && closeMOdalBtn && modalContent) {
			historyBtn.addEventListener('click', () => {
				this.showgameHistory(this.user.stats.games || [], modalContent);
				customModal.classList.remove("hidden");
			});
		}
		if (historyBtn && customModal && closeMOdalBtn && modalContent){
			closeMOdalBtn.addEventListener("click", () => {
				customModal.classList.add("hidden");
			});
		}
		if (historyBtn && customModal && closeMOdalBtn && modalContent){
			customModal.addEventListener("click", (e) => {
				if (e.target === customModal) {
					customModal.classList.add("hidden");
				}
			});
		}
	}

	private datConverted(dateStr: string): string {
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) {
			return dateStr; 
		}
		const options: Intl.DateTimeFormatOptions = {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		};
		return date.toLocaleDateString(this.currentLang, options).replace(',', '');
	}

	private async showgameHistory(games: Game[], modalContent: HTMLElement) {
 		if (games.length === 0 ) {
 			modalContent.innerHTML = `<p>{{profilepage.no_game_history}}</p>`;
 			this.translateDynamicContent(modalContent);
 			return;
 		}
		modalContent.innerHTML = "";
		const ul = document.createElement("ul");
		ul.className = "list-none list-inside text-left space-y-1";
		// Create a copy and sort by game_id descending (fallback 0 if undefined)
		const sortedGames = [...games].sort((a,b) => (b.game_id ?? 0) - (a.game_id ?? 0));
		for(const game of sortedGames) {
			if (!game.players) return;
			const playerPromises = game.players.map(async (p: string) => {
				try {
					const userData = await this.userService.takeUserFromApi(p);
					return { nickname: userData.nickname, image_url: userData.image_url };
				} catch {
					const tempDiv = document.createElement('div');
					tempDiv.innerHTML = '{{profilepage.guest}}';
					this.translateDynamicContent(tempDiv);
					if (p.split(' ')[0]==='player')
						if (game.winner_nickname?.split(' ')[0] === 'player'){
							game.winner_nickname = tempDiv.textContent + ' ' + p.split(' ')[1];
						return { nickname: tempDiv.textContent || 'guest', image_url: 'https://transcendence.fe:8443/user.jpg' };}
					
					return { nickname: p  || 'guest', image_url: 'https://transcendence.fe:8443/user.jpg' };
				}
			});
			const us = await Promise.all(playerPromises);
			console.log('game', game);
			const half = Math.ceil(us.length / 2);
			const team1:  Pick <User, 'nickname'|'image_url'>[] = us.slice(0, half);
			const team2:  Pick <User, 'nickname'|'image_url'>[] = us.slice(half);

			const li = document.createElement("li");
			let datestr = this.datConverted(game.date as unknown as string);
			li.className = "p-2 border-b"; 
			li.innerHTML = `
			<div class="flex items-center space-x-2 mb-1">${datestr}</div>
			<div class="flex items-center justify-between mb-1">
				<!-- Team 1 -->
				   <div class="flex flex-col items-center space-x-2 text-center">
					   ${team1.map(p => `
						   <a href="/profile?nickname=${encodeURIComponent(p.nickname)}" class="profile-link" data-nickname="${encodeURIComponent(p.nickname)}">
							   <img src="${p.image_url}" alt="${p.nickname}" class="w-8 h-8 rounded-full border mx-auto">
						   </a>
						   <span class="text-sm font-medium block w-full text-center">${p.nickname}</span>
					   `).join('')}
					   <strong class="text-lg mt-1 block w-full text-center">${game.scores ? game.scores[0] : '0'}</strong>
				   </div>

				<!-- VS -->
				<div class="mx-4 font-bold text-red-600">{{profilepage.vs}}</div>

				<!-- Team 2 -->
				   <div class="flex flex-col items-center space-x-2 text-center">
					   ${team2.map(p => `
						   <a href="/profile?nickname=${encodeURIComponent(p.nickname)}" class="profile-link" data-nickname="${encodeURIComponent(p.nickname)}">
							   <img src="${p.image_url}" alt="${p.nickname}" class="w-8 h-8 rounded-full border mx-auto">
						   </a>
						   <span class="text-sm font-medium block w-full text-center">${p.nickname}</span>
					   `).join('')}
					   <strong class="text-lg mt-1 block w-full text-center">${game.scores ? game.scores[1] : '0'}</strong>
					   </div>
		
				</div>
				<div class="text-xs text-gray-500 flex item-center mb-1">
					<strong>{{profilepage.winner_label}}</strong> ${game.winner_nickname || '{{profilepage.guest}}'}
				</div>
			
			`;
			ul.appendChild(li);
		};
		modalContent.appendChild(ul);
		this.translateDynamicContent(modalContent);
		
		const links = modalContent.querySelectorAll('.profile-link');
		links.forEach(link => {
			link.addEventListener('click', (e) => {
				e.preventDefault();
				const nickname = decodeURIComponent(link.getAttribute('data-nickname') || '');
				window.location.hash = `/profile?nickname=${encodeURIComponent(nickname)}`;
				const customModal = document.getElementById('customModal');
				if (customModal) customModal.classList.add('hidden');
			});
		});
	}

	private handleImageEdit() {
		const fileImput = document.createElement('input');
		fileImput.type = 'file';
		fileImput.accept = 'image/*';
		fileImput.style.display = 'none';

		fileImput.addEventListener('change', (event) => {
			const file = (event.target as HTMLInputElement).files?.[0];
			if (file) {
				console.log('uploadingImg', file);
				this.previewImage(file);
			}
		});
		document.body.appendChild(fileImput);
		fileImput.click();
		document.body.removeChild(fileImput);
	}

	private previewImage(file: File) {
		if (file.size > 2 * 1024 * 1024) { // 2MB
			alert('File size exceeds 2MB limit.');
			return;
		}
		if (!file.type.startsWith('image/')) {
			alert('Please select a valid image file.');
			return;
		}
		this.tempImageFile = file;
		const reader = new FileReader();

		reader.onload = (e) =>{
			const imgElement = document.getElementById('profile_image') as HTMLImageElement;
			if (imgElement && e.target?.result) {
				imgElement.src = e.target.result as string;
			}
		};
		reader.onerror = () => {
			alert('Error loading image. Please try again.');
		};
		reader.readAsDataURL(file);
	}

	private async saveProfile(){
    const nameInput = document.getElementById('profile_name_input') as HTMLInputElement;
    const surnameInput = document.getElementById('profile_surname_input') as HTMLInputElement;
    const emailInput = document.getElementById('profile_email_input') as HTMLInputElement;
    const passwordInput = document.getElementById('profile_password_input') as HTMLInputElement;

    const results: { success: boolean; field: string; error?: any; message?: string }[] = [];
    let hasChanges = false;

    if (this.tempImageFile) {
        try {
				console.log('🖼️ Updating image...');
				const response = await this.userService.UpdateImageUrl(this.tempImageFile);
				
				if (response.image_url || response.imageUrl) {
					this.user.image_url = response.image_url || response.imageUrl;
					
					// Aggiorna URL immagine nel backend
					await this.userService.UpdateUserToApi(this.user.nickname, 'image_url', this.user.image_url);
					
					// Aggiorna immagine nel DOM
					const imgElement = document.getElementById('profile_image') as HTMLImageElement;
					if (imgElement) {
						imgElement.src = this.user.image_url;
					}
					
					results.push({ success: true, field: 'image', message: 'Image updated successfully' });
					hasChanges = true;
				}
			} catch (error) {
				console.error('❌ Error updating image:', error);
				results.push({ success: false, field: 'image', error, message: 'Failed to update image' });
			}
		}

		if (nameInput && nameInput.value.trim() !== '' && nameInput.value.trim() !== this.user.name) {
			try {
				console.log('👤 Updating name...');
				await this.userService.UpdateUserToApi(this.user.nickname, 'name', nameInput.value.trim());
				this.user.name = nameInput.value.trim();
				results.push({ success: true, field: 'name', message: 'Name updated successfully' });
				hasChanges = true;
			} catch (error) {
				console.error('❌ Error updating name:', error);
				results.push({ success: false, field: 'name', error, message: 'Failed to update name' });
			}
		}

		if (surnameInput && surnameInput.value.trim() !== '' && surnameInput.value.trim() !== this.user.surname) {
			try {
				console.log('👤 Updating surname...');
				await this.userService.UpdateUserToApi(this.user.nickname, 'surname', surnameInput.value.trim());
				this.user.surname = surnameInput.value.trim();
				results.push({ success: true, field: 'surname', message: 'Surname updated successfully' });
				hasChanges = true;
			} catch (error) {
				console.error('❌ Error updating surname:', error);
				results.push({ success: false, field: 'surname', error, message: 'Failed to update surname' });
			}
		}

		if (emailInput && emailInput.value.trim() !== '' && emailInput.value.trim() !== this.user.email) {
			try {
				console.log('📧 Checking email availability...');
				await this.authService.aviabilityCheck('email', emailInput.value.trim());
				
				console.log('📧 Updating email...');
				await this.userService.UpdateUserToApi(this.user.nickname, 'email', emailInput.value.trim());
				this.user.email = emailInput.value.trim();
				results.push({ success: true, field: 'email', message: 'Email updated successfully' });
				hasChanges = true;
			} catch (error) {
				console.error('❌ Error updating email:', error);
				results.push({ success: false, field: 'email', error, message: 'Email already in use or update failed' });
				
				// Ripristina il valore precedente nell'input
				if (emailInput) {
					emailInput.value = this.user.email;
				}
			}
		}

		if (passwordInput && passwordInput.value.trim() !== '') {
			try {
				console.log('🔐 Updating password...');
				await this.userService.UpdateUserToApi(this.user.nickname, 'password', passwordInput.value.trim());
				results.push({ success: true, field: 'password', message: 'Password updated successfully' });
				hasChanges = true;
			} catch (error) {
				console.error('❌ Error updating password:', error);
				results.push({ success: false, field: 'password', error, message: 'Failed to update password' });
			}
		}

		if (hasChanges) {
			try {
				sessionStorage.setItem('user', JSON.stringify(this.user));
				console.log('✅ SessionStorage updated');
			} catch (error) {
				console.error('❌ Error updating sessionStorage:', error);
			}
		}

		this.showUpdateResults(results);

		this.updateDisplayAfterSave();
	}

	private showUpdateResults(results: { success: boolean; field: string; error?: any; message?: string }[]) {
		const successes = results.filter(r => r.success);
		const failures = results.filter(r => !r.success);

		// Log dettagliato per debug
		console.log('📊 Update Results:', {
			total: results.length,
			successes: successes.length,
			failures: failures.length,
			details: results
		});

		// Mostra notifiche all'utente
		if (successes.length > 0) {
			const successFields = successes.map(r => r.field).join(', ');
			this.showNotification(`✅ Updated successfully: ${successFields}`, 'success');
		}

		if (failures.length > 0) {
			const failureFields = failures.map(r => r.field).join(', ');
			this.showNotification(`❌ Failed to update: ${failureFields}`, 'error');
			
			// Log errori specifici
			failures.forEach(failure => {
				console.error(`❌ ${failure.field} update failed:`, failure.error);
			});
		}

		if (results.length === 0) {
			this.showNotification('No changes to save', 'info');
		}
	}

	private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
		const notification = document.createElement('div');
		const bgColor = {
			success: 'bg-green-500',
			error: 'bg-red-500', 
			info: 'bg-blue-500'
		}[type];
		
		notification.className = `fixed top-4 right-4 p-4 rounded shadow-lg z-50 ${bgColor} text-white max-w-sm`;
		notification.textContent = message;
		document.body.appendChild(notification);
		
		// Rimuovi automaticamente dopo 4 secondi
		setTimeout(() => {
			if (notification.parentNode) {
				notification.remove();
			}
		}, 4000);
		
		// Permetti chiusura al click
		notification.addEventListener('click', () => {
			notification.remove();
		});
	}

	private updateDisplayAfterSave() {
		const namediv = document.getElementById('profile_name_div');
		if (namediv) namediv.innerHTML = '';
		
		const surnamediv = document.getElementById('profile_surname_div');
		if (surnamediv) surnamediv.innerHTML = '';
		
		const emaildiv = document.getElementById('profile_email_div');
		if (emaildiv) emaildiv.innerHTML = '';

		const passworddiv = document.getElementById('password_div');
		if (passworddiv) passworddiv.innerHTML = '';

		const editImageBtn = document.getElementById('edit_image_btn');
		if (editImageBtn) {
			editImageBtn.classList.add('hidden');
		}
		
		console.log('user update,', this.user);
		this.showValueProfile("name");
		this.showValueProfile("surname");
		this.showValueProfile("email");
		

		const changeProfileBtn = document.getElementById('change_profile');
		if (changeProfileBtn) {
			const tempDiv = document.createElement('div');
			tempDiv.innerHTML = '{{profilepage.change_profile}}';
			this.translateDynamicContent(tempDiv);
			changeProfileBtn.textContent = tempDiv.textContent || 'Change Profile';

			changeProfileBtn.onclick = null;
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

						this.userService.UpdateUserToApi(this.user.nickname, 'language', lang)
							.then(() => {
								console.log('Language preference updated successfully');
									try {
										const userStr = sessionStorage.getItem('user');
										if (userStr) {
											const userObj = JSON.parse(userStr);
											userObj.language = lang;
											sessionStorage.setItem('user', JSON.stringify(userObj));
										}
									} catch (error) {
										console.error('❌ Errore aggiornamento sessionStorage:', error);
									}
									
									// ✅ Aggiorna anche this.user se ha la proprietà
									if ('language' in this.user) {
										(this.user as any).language = lang;
									}
								})
								.catch((error) => {
									console.error('Error updating language preference:', error);
								});
							
						this.render();
					})
				}
			})
	}

	private showValueStats(property: string) {
		const element = document.getElementById(property);
		if (element) {
			element.textContent = this.formatToTwoDecimals( this.stats[property as keyof Stats]?.toString() || '0');
		}
	}

	private formatToTwoDecimals(value: string): string {
		const num = Number(value);
		if (isNaN(num)) 
			return value;
		if (num % 1 !== 0) {
   			return num.toFixed(2);
		}
		return num.toString();
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
			// Se l'URL contiene transcendence.be, prova con host_id
			if (profileImage.src.includes('transcendence.be')) {
				const hostId = (typeof window !== 'undefined' && (window as any).__HOST_ID__) ? (window as any).__HOST_ID__ : 'localhost';
				profileImage.src = profileImage.src.replace('transcendence.be', hostId);
				// Dopo il primo errore, se fallisce di nuovo, mostra default
				profileImage.onerror = () => {
					profileImage.src = 'https://transcendence.fe:8443/user.jpg';
				};
			} else {
				profileImage.src = 'https://transcendence.fe:8443/user.jpg';
			}
		};
	}
	}

	// Setta il tema della pagina / colore della navbar
	private setTheme(theme: string) {
		const element = document.querySelector('[data-theme]') as HTMLElement;

		element.dataset.theme = theme;
	} 
}