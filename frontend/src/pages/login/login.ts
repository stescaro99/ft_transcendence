import { UserService } from '../../service/user.service';
import { AuthenticationService } from '../../service/authentication.service';
import { TranslationService } from '../../service/translation.service';
import { environment } from '../../environments/environment';
import '../../style.css';
import './login.css';
import loginHtml from './login.html?raw';

export class LogInPage{
	nickname: string = '';
	password: string = '';
	qrCode: string = '';
	userService: UserService = new UserService();
	authenticationService: AuthenticationService = new AuthenticationService();
	private currentLang: string;
	
	constructor(lang: string) {
		this.currentLang = lang;
		this.render();
		this.setTheme('green');
		this.saveGoogleTokenIfPresent();
		this.addEventListeners();
		this.checkHostConfiguration();
	}

	// Salva il token Google se presente nei parametri URL
	saveGoogleTokenIfPresent() {
		const urlParams = new URLSearchParams(window.location.search);
		const token = urlParams.get('token');
		if (token) {
			this.authenticationService.saveGoogleToken(token);
			// Puoi anche fare redirect o altre azioni qui
		}
	}
	private render() {
		const appDiv = document.getElementById('app');
		if (appDiv) {
			const translation = new TranslationService(this.currentLang);
			const translatedHtml = translation.translateTemplate(loginHtml);
			appDiv.innerHTML = translatedHtml;
		}
	}

	async handleSubmit(e?: Event) {
		e?.preventDefault();
		// Cattura i valori direttamente dal form al momento del submit
		const takeName = document.getElementById('username') as HTMLInputElement;
		const takePassword = document.getElementById('password') as HTMLInputElement;
		
		this.nickname = takeName?.value || '';
		this.password = takePassword?.value || '';
		
		
		if (!this.nickname || !this.password) {
			alert('Please enter both nickname and password');
			return;
		}
		
		  try {
			await this.authenticationService.loginUserToApi(this.nickname, this.password);
		} catch (error) {
			console.error('Login failed:', error);
			alert('Login failed. Please check your credentials and try again.');
			return;
		}

		// 2) Tenta di ottenere il QR (non far fallire l’intero flow se manca)
		let qrCode: string | undefined;
		try {
			const qrRes: any = await this.authenticationService.takeQrCodeFromApi(this.nickname, this.password);
			qrCode = qrRes?.qrCode ?? qrRes?.data?.qrCode;
			if (!qrCode) {
			console.warn('QR code not found in response:', qrRes);
			}
		} catch (err) {
			console.warn('Failed to fetch QR code:', err);
		}

	  // 3) Se ho il QR, renderizzo la UI 2FA; altrimenti non vado in errore
		if (qrCode) {
		this.qrCode = qrCode;
		const qrDiv = document.getElementById('qrCode');
		if (qrDiv) {
		qrDiv.innerHTML = `
			<div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
			<img src="${this.qrCode}" alt="QR Code" style="width: 200px; height: 200px;" />
			<div id="token2FA" style="display: flex; gap: 8px; justify-content: center;">
				<input maxlength="1" type="text" class="bg-gray-200 rounded text-center text-black" style="width: 32px; height: 40px; font-size: 2rem;" />
				<input maxlength="1" type="text" class="bg-gray-200 rounded text-center text-black" style="width: 32px; height: 40px; font-size: 2rem;" />
				<input maxlength="1" type="text" class="bg-gray-200 rounded text-center text-black" style="width: 32px; height: 40px; font-size: 2rem;" />
				-
				<input maxlength="1" type="text" class="bg-gray-200 rounded text-center text-black" style="width: 32px; height: 40px; font-size: 2rem;" />
				<input maxlength="1" type="text" class="bg-gray-200 rounded text-center text-black" style="width: 32px; height: 40px; font-size: 2rem;" />
				<input maxlength="1" type="text" class="bg-gray-200 rounded text-center text-black" style="width: 32px; height: 40px; font-size: 2rem;" />
			</div>
			<button id="verify2FA" type="button" class="button">Verify</button>
			</div>
		`;

		const inputs = document.querySelectorAll('#token2FA input');
		inputs.forEach((input, idx) => {
			input.addEventListener('input', () => {
			if ((input as HTMLInputElement).value.length === 1 && idx < inputs.length - 1) {
				(inputs[idx + 1] as HTMLInputElement).focus();
			}
			});
			input.addEventListener('keydown', (e) => {
			const keyboardEvent = e as KeyboardEvent;
			if (keyboardEvent.key === 'Backspace' && (input as HTMLInputElement).value === '' && idx > 0) {
				(inputs[idx - 1] as HTMLInputElement).focus();
			}
			});
		});

      const verifyBtn = document.getElementById('verify2FA');
      if (verifyBtn) {
        verifyBtn.addEventListener('click', async () => {
          let code = '';
          document.querySelectorAll('#token2FA input').forEach(i => { code += (i as HTMLInputElement).value; });
          try {
            const verifyResponse: any = await this.authenticationService.verifyQrCodeFromApi(this.nickname, code);
            const token = verifyResponse?.token ?? verifyResponse?.data?.token;
            const user  = verifyResponse?.user  ?? verifyResponse?.data?.user;
            sessionStorage.setItem('user', JSON.stringify(user));
            if (token) sessionStorage.setItem('token', token);
            sessionStorage.setItem('nickname', this.nickname);
            window.location.hash = '/';
          } catch (verifyError) {
            console.error('Error verifying 2FA:', verifyError);
            alert('Verification failed. Please try again.');
          }
        });
      }
		}
		} else {

			console.info('2FA not required or QR unavailable; login completed.');
		}
	}
		
	

	private addEventListeners() {
		const takeName = document.getElementById('username') as HTMLInputElement;
		if (takeName) {
			takeName.addEventListener('blur', () => {
				this.nickname = takeName.value;
			});
		}
		const takePassword = document.getElementById('password') as HTMLInputElement;
		if (takePassword) {
			takePassword.addEventListener('blur', () => {
				this.password = takePassword.value;
			});
		}
		const loginForm = document.getElementById('loginForm');
		if (loginForm) {
			loginForm.addEventListener('submit', (e) => this.handleSubmit(e));
		}
		const googleid = document.getElementById('googleid');
		if (googleid) {
			googleid.addEventListener('click', () => {
				console.log('Starting Google login...');
				this.authenticationService.loginUserWithGoogleToApi();
				// Non aspettiamo la promise perché ora fa un redirect
			});
		}
		const debugButton = document.getElementById('debugLogin');
		if (debugButton) {
			debugButton.addEventListener('click', async () => {
				// Chiama backend per forzare offline
				const nickname = sessionStorage.getItem('nickname');
				if (nickname) {
					try {
						await fetch(environment.apiUrl + '/force_offline', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ nickname })
						});
					} catch (e) { console.error('force_offline error:', e); }
				}
				sessionStorage.removeItem('user');
				sessionStorage.removeItem('token');
				sessionStorage.removeItem('nickname');
				sessionStorage.setItem('user', 'debug');
				sessionStorage.setItem('nickname', 'fgori');
				window.location.hash = '#/';
			});
		}
	}

	// Controlla se l'utente sta accedendo tramite IP e mostra l'avviso
	private async checkHostConfiguration() {
		try {
			// Rileva se stiamo accedendo tramite IP
			const currentHost = window.location.host;
			const isAccessViaIP = /\d+\.\d+\.\d+\.\d+/.test(currentHost) || 
								 currentHost.includes('localhost') || 
								 currentHost.includes('127.0.0.1');

			if (isAccessViaIP) {
				// Tenta di ottenere le informazioni di configurazione dal backend
				try {
					const response = await fetch('/api/host-config');
					const config = await response.json();
					
					if (config.accessViaIP) {
						this.showHostConfigWarning(config);
					}
				} catch (error) {
					// Se il backend non è disponibile, mostra comunque l'avviso base
					console.warn('Cannot fetch host config from backend:', error);
					this.showHostConfigWarning({
						hostId: currentHost.split(':')[0],
						setupCommand: {
							linux: `echo "${currentHost.split(':')[0]} transcendence.be transcendence.fe" | sudo tee -a /etc/hosts`
						}
					});
				}
			}
		} catch (error) {
			console.error('Error checking host configuration:', error);
		}
	}

	private showHostConfigWarning(config: any) {
		const warningElement = document.getElementById('hostConfigWarning');
		const commandElement = document.getElementById('hostConfigCommand');
		const dismissButton = document.getElementById('dismissHostWarning');

		if (warningElement && commandElement) {
			// Aggiorna il comando con le informazioni corrette
			if (config.setupCommand?.linux) {
				commandElement.textContent = config.setupCommand.linux;
			}

			// Populate the host link placeholder so the IP link is visible
			try {
				const placeholder = document.getElementById('host-link-placeholder');
				if (placeholder) {
					// If config provides hostId use it, otherwise use current hostname
					const host = config.hostId || window.location.hostname || '10.11.247.129';
					// Clear any existing content
					placeholder.innerHTML = '';
					const a = document.createElement('a');
					a.href = `https://${host}:9443`;
					a.target = '_blank';
					a.className = 'text-cyan-400 underline';
					a.textContent = `https://${host}:9443`;
					placeholder.appendChild(a);
				}
			} catch (e) {
				console.error('Failed to populate host link placeholder:', e);
			}

			// Mostra l'avviso
			warningElement.classList.remove('hidden');

			// Aggiungi listener per nascondere l'avviso
			if (dismissButton) {
				dismissButton.addEventListener('click', () => {
					warningElement.classList.add('hidden');
					// Salva la preferenza dell'utente
					sessionStorage.setItem('hostWarningDismissed', 'true');
				});
			}

			// Controlla se l'utente ha già nascosto l'avviso in questa sessione
			if (sessionStorage.getItem('hostWarningDismissed') === 'true') {
				warningElement.classList.add('hidden');
			}
		}
	}

	private setTheme(theme: string) {
		const element = document.querySelector('[data-theme]') as HTMLElement;

		element.dataset.theme = theme;
	} 
}