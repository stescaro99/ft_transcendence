import { User } from '../model/user.model';
import { environment } from '../environments/environment';


export class UserService {
	async logout(): Promise<any> {
		const token = localStorage.getItem('token');
		if (!token) return;
		try {
			const response = await fetch(`${this.apiUrl}/logout`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			});
			if (!response.ok) {
				throw new Error('Logout failed');
			}
			return await response.json();
		} catch (error) {
			console.error('Logout error:', error);
		}
	}
	private user: User = new User();
	private token: string = localStorage.getItem('token') || '';

	private apiUrl = `${environment.apiUrl}`; 
	
	async getUser(): Promise<User | null >{
		const nickname = localStorage.getItem('nickname');
		console.log('getUser called with nickname:', nickname);
		
		if (nickname) {
			try {
				const userData = await this.takeUserFromApi(nickname);
				this.user.name = userData.name || '';
				this.user.surname = userData.surname;
				this.user.nickname = userData.nickname;
				this.user.email = userData.email;
				this.user.image_url = userData.image_url;
				this.user.stats = userData.stats;
				this.user.id = userData.id;
				return this.user;
			} catch (error) {
				console.error('Error fetching user data:', error);
				return null;
        }
    }
    
    return null;

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
					console.error('[UserService] Errore nel recupero dati utente:', error);
				});
			}
		} else {
			console.warn('[UserService] Nessun dato utente trovato in localStorage');
			return null;
		}
		return this.user;
	}


	async takeUserFromApi(nick: string): Promise<any> {
		const apiEnv = import.meta.env.VITE_BACKEND_URL;
		const baseUrl = apiEnv || environment.apiUrl;
		const url = `${baseUrl}/get_user?nickname=${encodeURIComponent(nick)}`;

		console.log('[UserService] 🌐 URL chiamato:', url);

		let token: string | null = null;

		// 1) prova chiave diretta
		const directToken = localStorage.getItem('token');
		console.log('[UserService] Token diretto da localStorage:', directToken);
		if (directToken) {
			token = directToken;
		} else {
			// 2) fallback: estrai da localStorage.user
			const userDataString = localStorage.getItem('user');
			console.log('[UserService] userDataString:', userDataString);
			if (userDataString) {
				try {
					const userData = JSON.parse(userDataString);
					token = userData.token || null;
					console.log('[UserService] Token trovato in userData:', token);
					// Salva anche la chiave diretta per altri servizi (es. MultiplayerService)
					if (token) {
						localStorage.setItem('token', token);
						console.log('[UserService] Token salvato come chiave diretta in localStorage.token');
					}
				} catch (error) {
					console.error('[UserService] Errore parsing userData:', error);
				}
			}
		}

		console.log('[UserService] Token finale usato per la chiamata:', token);
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

		console.log('[UserService] Response status:', response.status);
		const text = await response.text();
		console.log('[UserService] Response body:', text);
		if (!response.ok) {
			throw new Error(`Network response was not ok: ${response.status} - ${text}`);
		}
		return JSON.parse(text);
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


	async UpdateUserToApi(nick: string, field: string, new_value: string): Promise<any> {
		const url = `${this.apiUrl}/update_user`;
		const body = JSON.stringify({
			nickname: nick,
			field: field,
			new_value: new_value,
		});
		console.log('Request body:', body);
		
		const response = await fetch(url, {
			method: 'PUT',
			headers: {
				'authorization': `Bearer ${this.token}`,
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

	async addFriend(user1: string, user2: string): Promise<any> {
		const url =`${this.apiUrl}/add_friend`;
		
		
		const divToken = localStorage.getItem('token');

		if (!divToken) 
			console.log("No token found in localStorage");

		const body = JSON.stringify({
			user1: user1,
			user2: user2,
		});

    
    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                "Authorization": `Bearer ${divToken}`,
                'Content-Type': 'application/json',
            },
            body: body,
        });
        

        const responseText = await response.text();

        
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            
            // Prova a parsare la risposta per ottenere il messaggio di errore dettagliato
            try {
                const errorData = JSON.parse(responseText);
                if (errorData.error) {
                    errorMessage += ` - ${errorData.error}`;
                }
            } catch (parseError) {
                // Se non riesce a parsare, usa il testo grezzo
                errorMessage += ` - ${responseText}`;
            }
            
            console.error('❌ AddFriend failed:', errorMessage);
            throw new Error(errorMessage);
        }
        
        // Parsa la risposta di successo
        try {
            const result = JSON.parse(responseText);
            console.log('✅ AddFriend success:', result);
            return result;
        } catch (parseError) {
            console.error('❌ Failed to parse success response:', responseText);
            throw new Error('Invalid JSON response');
        }
        
    } catch (networkError) {
        console.error('💥 Network error in addFriend:', networkError);
        throw networkError;
    }
	}
}