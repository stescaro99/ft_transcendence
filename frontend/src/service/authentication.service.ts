import { environment } from '../environments/environment';

export class AuthenticationService {

	private apiUrl = `${environment.apiUrl}`;

	async takeQrCodeFromApi(nickname: string, password: string): Promise<any> {
		console.log('nickname', nickname);
		const response = await fetch(`${this.apiUrl}/generate_2FA`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ nickname, password }),
		});
			if (!response.ok) {
				console.log('Error in takeQrCodeFromApi:', response);
				throw new Error('Network response was not ok');
			}
		return response.json();
	}

	async verifyQrCodeFromApi(nickname: string, token2FA : string): Promise<any> {
		const response = await fetch(`${this.apiUrl}/verify_2FA`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ nickname, token2FA }),
		});
		if (!response.ok) {
			throw new Error('Network response was not ok');
		}
		return response.json();
	}

	async loginUserToApi(nickname: string, password: string): Promise<any> {
		const response = await fetch(`${this.apiUrl}/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ nickname, password }),
		});
		if (!response.ok) {
			throw new Error('Network response was not ok');
		}
		const result = await response.json();
		if (result.token) {
			sessionStorage.setItem('token', result.token);
		}
		console.log('Response from loginUserToApi:', result);
		return result;
	}

	// Per login Google, la ricezione del token avviene dopo il redirect.
	// Va chiamata questa funzione dopo aver ricevuto il token dal backend.
	saveGoogleToken(token: string) {
		sessionStorage.setItem('token', token);
	}
	loginUserWithGoogleToApi(): Promise<any> {
		return new Promise((resolve, reject) => {
			const authUrl = 'https://transcendence.be:9443/api/google_login';
			console.log('Redirecting to Google auth URL:', authUrl);
			// Salva lo stato prima del redirect
			sessionStorage.setItem('googleAuthPending', 'true');
			sessionStorage.setItem('googleAuthResolve', 'pending');
			// Redirect diretto alla pagina di autenticazione Google
			window.location.href = authUrl;
		});
	}

	async aviabilityCheck(field: string, value: string): Promise<any> {
		const api = `${this.apiUrl}/available_field?field=${field}&value=${value}`;
		const response = await fetch(api, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},  
		});
		if (!response.ok) {
			throw new Error('Network response was not ok');
		}
		return response.json();
	}
}