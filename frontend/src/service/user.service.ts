import { User } from '../model/user.model';
import { environment } from '../environments/environment';


export class UserService {
	private user: User = new User();

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
	}

	async takeUserFromApi(nick: string): Promise<any>{
		const url = `${this.apiUrl}/get_user?nickname=${nick}`;
		console.log('localStorage user:', localStorage.getItem('user'));
		console.log('localStorage nickname:', nick);
		
		// Recupera il token dall'oggetto user nel localStorage o dal token diretto
		let token: string | null = null;
		
		// Prima prova a recuperare dal localStorage.token
		const directToken = localStorage.getItem('token');
		if (directToken) {
			token = directToken;
		} else {
			// Altrimenti prova a recuperare dal localStorage.user.token
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
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		});
		
		// Log PRIMA di leggere il body
		console.log('Response status:', response.status);
		console.log('Response headers:', [...response.headers.entries()]);
		
		// Leggi il body UNA SOLA VOLTA
		const responseText = await response.text();
		console.log('Response body:', responseText);
		
		if(!response.ok){
			throw new Error(`Network response was not ok: ${response.status} - ${responseText}`);
		}
		
		// Ora parsa il JSON dal testo che hai già letto
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