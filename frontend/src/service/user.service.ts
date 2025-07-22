import { User } from '../model/user.model';
import { environment } from '../environments/environment';


export class UserService {
	private user: User = new User();

	private apiUrl = `${environment.apiUrl}`; 
	
	getUser(): User | null {
		const nickname = localStorage.getItem('nickname');
		if (localStorage.getItem('user') || nickname) {
			if (nickname) {
				this.takeUserFromApi(nickname)
				.then((userData) => {
					this.user.name = userData.name || '';
					this.user.surname = userData.surname;
						this.user.nickname = userData.nickname;
						this.user.email = userData.email;
						this.user.image_url = userData.image_url;
						this.user.stats = userData.stats;
						this.user.id = userData.id;
						return this.user;
					})
					.catch((error) => {
						console.error('Error fetching user data:', error);
					});
			}
		} else {
			console.warn('No user data found in localStorage');
			return null;
		}
		return this.user;
	}

	async takeUserFromApi(nick: string): Promise<any> {
		const apiEnv = import.meta.env.VITE_BACKEND_URL;
		const baseUrl = apiEnv || environment.apiUrl;
		const url = `${baseUrl}/get_user?nickname=${encodeURIComponent(nick)}`;

		console.log('🌐 Fetching URL:', url);
	
		let token: string | null = null;
	
		const directToken = localStorage.getItem('token');
		if (directToken) {
			token = directToken;
		} else {
			const userDataString = localStorage.getItem('user');
			if (userDataString) {
				try {
					const userData = JSON.parse(userDataString);
					token = userData.token || null;
				} catch (error) {
					console.error('Error parsing user data from localStorage:', error);
				}
			}
		}
	
		console.log('UserService initialized with token:', token);
	
		if (!token) {
			throw new Error('No valid token found');
		}
	
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		});
	
		console.log('Response status:', response.status);
		console.log('Response headers:', [...response.headers.entries()]);
	
		const responseText = await response.text();
		if (responseText.startsWith('<!doctype html>')) {
			console.error('❌ Ricevuto HTML invece di JSON. Probabilmente la route è sbagliata.');
			throw new Error('Expected JSON but received HTML');
		}
		console.log('Response body:', responseText);
	
		if (!response.ok) {
			throw new Error(`Network response was not ok: ${response.status} - ${responseText}`);
		}
	
		try {
			return JSON.parse(responseText);
		} catch (e) {
			console.error('Failed to parse JSON:', responseText);
			throw new Error('Invalid JSON response');
		}
	}

	async postUserToApi(user: User): Promise<any> {
		const url = `${this.apiUrl}/add_user`;
		console.log('url', url);
		const body = JSON.stringify({
			name: user.name,
			surname: user.surname,
			nickname: user.nickname,
			email: user.email,
			password: user.password,
			image_url: user.image_url,
		});
		console.log('Request body:', body);
		const response = await fetch(url, {
			method: 'POST',
			headers: {
			'Content-Type': 'application/json',
			},
			body: body,
		});
		if (!response.ok) {
			throw new Error('Network response was not ok');
		}
		return response.json();
	}

	async deleteUserFromApi(nickname : string): Promise<any> {
		const url = `${this.apiUrl}/delete_user`;
		const body = JSON.stringify({
			nickname: nickname,
		});
		const response = await fetch(url, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
			},
			body: body,
		});
		if (!response.ok) {
			throw new Error('Network response was not ok');
		}
		return response.json();
	}

	async UpdateImageUrl(file: File): Promise<any> {
		const url = `${this.apiUrl}/upload_image`;
		const formData = new FormData();
		formData.append('image', file);

		const response = await fetch(url, {
			method: 'POST',
			body: formData,
		});
		if (!response.ok) {
			throw new Error('Network response was not ok');
		}
		return response.json();
	}

}