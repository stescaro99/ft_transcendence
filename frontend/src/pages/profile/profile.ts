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

	constructor(lang: string, nickname: string) {
		this.currentLang = lang;
		this.setTheme('blue');
		
		console.log('🔍 ProfilePage Debug:');
		console.log('sessionStorage user:', sessionStorage.getItem('user'));
		console.log('sessionStorage token:', sessionStorage.getItem('token'));
		console.log('sessionStorage nickname:', sessionStorage.getItem('nickname'));

		this.userService.takeUserFromApi(decodeURIComponent(nickname) || '') 
			.then((userData) => {
				this.user.name = userData.name || '';
				this.user.surname = userData.surname || '';
				this.user.nickname = userData.nickname;
				this.user.tfa_code = userData.tfa_code || null;
				this.user.email = userData.email;
				this.user.stats.games = userData.stats[0]?.games || [];
				this.user.image_url = userData.image_url;
				this.user.language = userData.language || this.user.language || 'en';
				if (this.user.language && this.currentLang !== this.user.language) {
					this.currentLang = this.user.language;
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
			const translation = new TranslationService(this.currentLang);
			const translatedHtml = translation.translateTemplate(profileHtml);
			console.log("user", this.user);
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
		}
		this.addlisteners();
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
							passworddiv.innerHTML = `<input type="password" class="bg-c-400 rounded-2xl text-center" id="profile_password_input" placeholder="{{new_password}}">`;
						}
					}
				} else {
					this.editMode = false;
					changeProfileBtn.textContent = '{{change_profile}}';

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
				console.log('games', this.user.stats.games);
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
			return dateStr; // Ritorna la stringa originale se la data non è valida
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
			modalContent.innerHTML = '<p>No game history available.</p>';
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
					return { nickname: 'guest', image_url: 'https://transcendence.fe:8443/user.jpg' };
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
				<div class="flex flex-col items-center space-x-2">
					${team1.map(p => `
						<img src="${p.image_url}" alt="${p.nickname}" class="w-8 h-8 rounded-full border">
						<span class="text-sm font-medium">${p.nickname}</span>
					`).join('')}
					<strong class="text-lg mt-1">${game.scores ? game.scores[0] : '0'}</strong>
				</div>

				<!-- VS -->
				<div class="mx-4 font-bold text-red-600">VS</div>

				<!-- Team 2 -->
				<div class="flex flex-col items-center space-x-2">
					${team2.map(p => `
						<img src="${p.image_url}" alt="${p.nickname}" class="w-8 h-8 rounded-full border">
						<span class="text-sm font-medium">${p.nickname}</span>
					`).join('')}
					<strong class="text-lg mt-1">${game.scores ? game.scores[1] : '0'}</strong>
					</div>
	
				</div>
				<div class="text-xs text-gray-500 flex item-center mb-1">
					<strong>Winner:</strong> ${game.winner_nickname || 'N/A'}
				</div>
			
			`;
			ul.appendChild(li);
		};
		modalContent.appendChild(ul);
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
		let change : boolean = false;
		const nameInput = document.getElementById('profile_name_input') as HTMLInputElement;
		const surnameInput = document.getElementById('profile_surname_input') as HTMLInputElement;
		const emailInput = document.getElementById('profile_email_input') as HTMLInputElement;
		const passwordInput = document.getElementById('profile_password_input') as HTMLInputElement;

		const update: Promise<any>[] = [];

		if (this.tempImageFile) {
        update.push(
            this.userService.UpdateImageUrl(this.tempImageFile)
                .then((response) => {
                    console.log('✅ Image uploaded successfully:', response);
                    
                    // Aggiorna l'URL dell'immagine nel user
                    if (response.image_url || response.imageUrl) {
                        this.user.image_url = response.image_url || response.imageUrl;
                        
						this.userService.UpdateUserToApi(this.user.nickname, 'image_url', this.user.image_url)
							.then(() => {
								change = true;
								console.log('Image URL updated successfully');
							})
							.catch((error) => {
								console.error('Error updating image URL:', error);	
							});
                        
                        // Aggiorna anche l'immagine visualizzata
                        const imgElement = document.getElementById('profile_image') as HTMLImageElement;
                        if (imgElement) {
                            imgElement.src = this.user.image_url;
                        }
                    }
                })
                .catch((error) => {
                    console.error('❌ Error uploading image:', error);
                    alert('Errore nel caricamento dell\'immagine');
                })
        );
    }

		if (nameInput && nameInput.value.trim() !== '' && nameInput.value.trim() !== this.user.name) {
			update.push(
			this.userService.UpdateUserToApi(this.user.nickname, 'name', nameInput.value.trim())
				.then(() => {
					console.log('Name updated successfully');
					change = true;
				})
				.catch((error) => {
					console.error('Error updating name:', error);
				})
			);
		}
		if (surnameInput && surnameInput.value.trim() !== '' && surnameInput.value.trim() !== this.user.surname) {
			update.push(
			this.userService.UpdateUserToApi(this.user.nickname, 'surname', surnameInput.value.trim())
				.then(() => {
					console.log('Surname updated successfully');
					change = true;
				})
				.catch((error) => {
					console.error('Error updating surname:', error);
				})
			);
		}
		if (emailInput && emailInput.value.trim() !== '' && emailInput.value.trim() !== this.user.email) {
			update.push(
			this.authService.aviabilityCheck('email', emailInput.value.trim())
				.then((available) => {
					this.userService.UpdateUserToApi(this.user.nickname, 'email', emailInput.value.trim())
						.then(() => {
							console.log('Email updated successfully');
							change = true;
						})
						.catch((error) => {
							console.error('Error updating email:', error);
						})
					})
				.catch((error) => {
					console.error('Error checking email availability:', error);
					alert('Email already in use. Please choose another one.');
					emailInput.value = this.user.email;
				})
				);
		}
		if (passwordInput && passwordInput.value.trim() !== '') {
			update.push(
			this.userService.UpdateUserToApi(this.user.nickname, 'password', passwordInput.value.trim())
				.then(() => {
					console.log('Password updated successfully');
					change = true;
				})
				.catch((error) => {
					console.error('Error updating password:', error);
				})
			);
		}
		console.log('change3', change);
		try{
			await Promise.all(update);
			if (change) {
				console.log('dentro change');
				this.user.name = nameInput.value.trim();
				this.user.surname = surnameInput.value.trim();
				this.user.email = emailInput.value.trim();
				
				sessionStorage.setItem('user', JSON.stringify(this.user));
			}
		}
		catch (error) {
			console.error('Error saving profile:', error);
			alert('Error saving profile. Please try again later.');
		}
		this.updateDisplayAfterSave();
		
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
			changeProfileBtn.textContent = '{{change_profile}}';

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
											console.log('✅ Lingua salvata nel sessionStorage:', lang);
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